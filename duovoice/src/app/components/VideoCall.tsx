'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type SignalingMessage =
  | { type: 'join' | 'offer' | 'answer'; data: any; sender: string }
  | { type: 'candidate'; data: RTCIceCandidateInit; sender: string }
  | { type: 'friend-request'; sender: string }
  | { type: 'friend-accept'; sender: string }
  | { type: 'friend-decline'; sender: string }
  | { type: 'assist_request' | 'assist_input'; text?: string; sender: string }
  | { type: 'assist_end'; text?: string; sender: string };

interface VideoCallProps {
  roomId: string;
  userId: string;
  peerId: string;
}

export default function VideoCall({
  roomId,
  userId,
  peerId,
}: VideoCallProps) {
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(false);
  const [assistMode, setAssistMode] = useState(false); // for enabled user
  const [isAssistActive, setIsAssistActive] = useState(false); // for disabled user
  const [assistInput, setAssistInput] = useState('');

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  // Suggestions for assist input
  const COMMON_WORDS = [
    'the','to','and','a','in','that','is','was','he','for','it','with','as','his','on','be','at','by','I','this',
    'had','not','are','but','from','or','have','an','they','which','one','you','were','her','all','she','there',
    'would','their','we','him','been','has','when','who','will','more','no','if','out','so','said','what','up',
    'its','about','into','than','them','can','only','other','new','some','could','time','these','two','may','then',
    'do','first','any','my','now','such','like','our','over','man','me','even','most','made','after','also','did',
    'many','before','must','through','back','years','where','much','your','way','well','down','should','because'
  ];
  const suggestions = useMemo(() => {
    const parts = assistInput.split(' ');
    const prefix = parts[parts.length - 1].toLowerCase();
    if (!prefix) return [];
    return COMMON_WORDS.filter(
      w => w.startsWith(prefix) && w.toLowerCase() !== prefix
    ).slice(0, 5);
  }, [assistInput]);

  // Helper to send signaling or assist messages
  const sendSignal = (msg: any) => {
    const ws = wsRef.current;
    if (!ws) return;
    const json = JSON.stringify(msg);
    if (ws.readyState === WebSocket.OPEN) ws.send(json);
    else ws.addEventListener('open', () => ws.send(json), { once: true });
  };


  useEffect(() => {
    let mounted = true;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    const ws = new WebSocket(`ws://localhost:8000/call/${roomId}`);
    wsRef.current = ws;
    let wsOpen = false;

    // helper: only send once socket is open
    const sendSignal = (msg: any) => {
      const json = JSON.stringify(msg);
      if (wsOpen) {
        ws.send(json);
      } else {
        ws.addEventListener(
          'open',
          () => {
            ws.send(json);
          },
          { once: true }
        );
      }
    };

    ws.onopen = () => {
      wsOpen = true;
      console.log('WS open – joining room', roomId);
      sendSignal({ type: 'join', sender: userId });
    };

    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data) as SignalingMessage;
      if (msg.sender === userId || pc.signalingState === 'closed') return;

      console.log('⟵ WS message', msg);
      switch (msg.type) {
        case 'offer': {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: 'answer', data: answer, sender: userId });
          break;
        }
        case 'answer': {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
          break;
        }
        case 'candidate': {
          await pc.addIceCandidate(new RTCIceCandidate(msg.data));
          break;
        }
        case 'friend-request':
          setIncomingRequest(true);
          break;
        case 'friend-accept':
          setIsFriend(true);
          alert(`${peerId} accepted your friend request!`);
          break;
        case 'friend-decline':
          setRequestSent(false);
          alert(`${peerId} declined your friend request.`);
          break;
          case 'assist_request':
          if (msg.sender !== userId) {
            setIsAssistActive(true);
          }
          break;
        case 'assist_input':
          if (msg.sender !== userId && msg.text !== undefined) {
            setAssistInput(msg.text);
          }
          break;
        case 'assist_end':
          setAssistMode(false);     // enabled side
          setIsAssistActive(false); // disabled side
          setAssistInput('');       // clear any stale text
    break;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        sendSignal({ type: 'candidate', data: candidate, sender: userId });
      }
    };

    pc.ontrack = (evt) => {
      if (remoteRef.current) {
        remoteRef.current.srcObject = evt.streams[0];
      }
    };

    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ type: 'offer', data: offer, sender: userId });
    };

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!mounted) return;
        if (localRef.current) localRef.current.srcObject = stream;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      })
      .catch((e) => {
        console.error('getUserMedia error', e);
        alert('Please allow camera & microphone');
      });

    return () => {
      mounted = false;
      ws.close();
      pc.getSenders().forEach((s) => s.track?.stop());
      pc.close();
    };
  }, [roomId, userId, peerId]);

  // Assist mode handlers
  const handleAssistRequest = () => {
    setAssistMode(true);
    sendSignal({ type: 'assist_request', sender: userId });
  };
  const updateAssist = (newText: string) => {
    setAssistInput(newText);
    sendSignal({ type: 'assist_input', text: newText, sender: userId });
  };
  const appendAssist = () => updateAssist(assistInput + '');
  const assistWrite = () => appendAssist();
  const assistSpace = () => updateAssist(assistInput + ' ');
  const assistDel   = () => updateAssist(assistInput.slice(0, -1));
  const applySuggestion = (word: string) => updateAssist(
    assistInput.split(' ').slice(0,-1).concat(word).join(' ') + ' '
  );

  const handleAddFriend = () => {
    wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: 'friend-request', sender: userId }));
    setRequestSent(true);
  };

  const handleAccept = async () => {
    try {
      const inv = {
        id: crypto.randomUUID(),
        requester_id: peerId,
        receiver_id: userId,
        status: 'Accept',
        time_stamp: new Date().toISOString(),
      };
      const res = await fetch(`http://localhost:8000/users/${peerId}/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inv),
      });
      if (!res.ok) throw new Error('Failed to add friend');
      wsRef.current?.send(JSON.stringify({ type: 'friend-accept', sender: userId }));
      setIsFriend(true);
    } catch (e: any) {
      console.error('handleAccept error:', e);
      alert(e.message);
    } finally {
      setIncomingRequest(false);
    }
  };

  const handleDecline = () => {
    wsRef.current?.send(JSON.stringify({ type: 'friend-decline', sender: userId }));
    setIncomingRequest(false);
  };

  return (
    <div className="relative flex flex-col items-center space-y-4">
      {incomingRequest && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <p className="mb-4 text-center">{peerId} wants to be your friend.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleAccept}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Accept
              </button>
              <button
                onClick={handleDecline}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold">
        In call with <span className="underline">{peerId}</span>
      </h2>

      <div className="flex gap-4">
        <video ref={localRef} autoPlay muted playsInline className="w-64 h-48 bg-black" />
        <video ref={remoteRef} autoPlay playsInline className="w-64 h-48 bg-black" />
      </div>

      <div className="flex space-x-4">
        {!isFriend && (
          <button
            onClick={handleAddFriend}
            disabled={requestSent}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {requestSent ? 'Request Sent…' : 'Add Friend'}
          </button>
        )}
        <button
          onClick={() => router.push('/homepage')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Exit
        </button>

         <button
      onClick={handleAssistRequest}
      className="bg-yellow-500 px-4 py-2 text-white rounded"
    >
      Assist Mode
    </button>
      <h2 className="text-xl font-bold">In call with {peerId}</h2>
    <div className="flex gap-4">
      <video ref={localRef} autoPlay muted playsInline className="w-64 h-48 bg-black" />
      <video ref={remoteRef} autoPlay playsInline className="w-64 h-48 bg-black" />
    </div>

    {assistMode && (
  <button
    onClick={() => sendSignal({ type: 'assist_end', sender: userId })}
    className="bg-red-500 px-4 py-2 text-white rounded"
  >
    Stop Assist
  </button>
)}

    {/* Enabled side: display assist input live */}
    {assistMode && (
      <div className="w-full max-w-lg p-3 border rounded bg-gray-100">
        <h3 className="font-semibold">Assist Input:</h3>
        <p className="whitespace-pre-wrap">{assistInput}</p>
      </div>
    )}

    {/* Disabled side: spelling UI when assist is active */}
    {isAssistActive && (
      <div className="w-full max-w-lg p-4 border rounded bg-gray-50 space-y-3">
        <div className="text-xl font-medium">Spell your answer:</div>
        <div className="flex items-center space-x-2">
          <button onClick={assistWrite} className="px-3 py-1 bg-blue-600 text-white rounded">
            Write Letter
          </button>
          <button onClick={assistSpace} className="px-3 py-1 bg-indigo-600 text-white rounded">
            Space
          </button>
          <button onClick={assistDel} className="px-3 py-1 bg-red-600 text-white rounded">
            Delete
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div className="text-sm text-gray-500 mb-1">Suggestions:</div>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => applySuggestion(s)}
                  className="p-2 border rounded hover:bg-gray-100"
                >
                  <span className="font-bold mr-1">{i + 1}.</span> {s}
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
    )}

      </div>
    </div>
  );
}
