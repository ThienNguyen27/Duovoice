'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs-backend-webgl';

type SignalingMessage =
  | { type: 'join'; sender: string }
  | { type: 'offer' | 'answer'; data: RTCSessionDescriptionInit; sender: string }
  | { type: 'candidate'; data: RTCIceCandidateInit; sender: string }
  | { type: 'friend-request' | 'friend-accept' | 'friend-decline'; sender: string }
  | { type: 'assist_request' | 'assist_input'; text?: string; sender: string }
  | { type: 'assist_end'; sender: string };

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
  const router = useRouter();

  // ─── UI state ────────────────────────────────────────────────────────────────
  const [isFriend, setIsFriend]             = useState(false);
  const [requestSent, setRequestSent]       = useState(false);
  const [incomingReq, setIncomingReq]       = useState(false);
  const [dictionaryMode, setDictionaryMode] = useState(false);
  const [assistMode, setAssistMode]         = useState(false);   // show final sentence
  const [isAssistActive, setIsAssistActive] = useState(false);   // muted‑user typing
  const [assistPrompt, setAssistPrompt]     = useState('');      // "Can you repeat…?"
  const [assistInput, setAssistInput]       = useState('');      // building text
  const [isMuted, setIsMuted]               = useState<boolean|null>(null);
  const [remoteJoined, setRemoteJoined]     = useState(false);
  const [localStreamReady, setLocalStreamReady] = useState(false);

  // ─── Hand‑pose model ──────────────────────────────────────────────────────────
  const [handModel, setHandModel] = useState<handpose.HandPose|null>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────────
  const localRef  = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef     = useRef<RTCPeerConnection|null>(null);
  const wsRef     = useRef<WebSocket|null>(null);

  // ICE candidate buffer until remoteDesc is set
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  // ─── Word suggestions ──────────────────────────────────────────────────────────
  const COMMON_WORDS = [
    'the','to','and','a','in','that','is','was','he','for','it','with','as','his','on',
    'be','at','by','I','this','had','not','are','but','from','or','have','an','they',
    'which','one','you','were','her','all','she','there','would','their','we','him','been',
    'has','when','who','will','more','no','if','out','so','said','what','up','its','about',
    'into','than','them','can','only','other','new','some','could','time','these','two','may',
    'then','do','first','any','my','now','such','like','our','over','man','me','even','most',
    'made','after','also','did','many','before','must','through','back','years','where',
    'much','your','way','well','down','should','because'
  ];
  
  const suggestions = useMemo(() => {
    const parts = assistInput.split(' ');
    const last = parts[parts.length - 1].toLowerCase();
    return last
      ? COMMON_WORDS.filter(w => w.startsWith(last) && w !== last).slice(0, 5)
      : [];
  }, [assistInput]);

  // ─── Buffered WebSocket send ─────────────────────────────────────────────────
  const sendSignal = (msg: any) => {
    const ws = wsRef.current;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      ws.addEventListener('open', () => ws.send(JSON.stringify(msg)), { once: true });
    }
  };

  // ─── Load handpose model once ─────────────────────────────────────────────────
  useEffect(() => {
    handpose.load().then(m => setHandModel(m));
  }, []);

  // ─── Fetch muted status from backend ──────────────────────────────────────────
  useEffect(() => {
    fetch('http://localhost:8000/users')
      .then(r => r.json())
      .then((users: any[]) => {
        const me = users.find(u => u.id === userId);
        setIsMuted(me?.is_muted ?? null);
      })
      .catch(console.error);
  }, [userId]);

  // ─── Kick off our offer as soon as we know they've joined ──────────────────────
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || !remoteJoined || !localStreamReady || pc.signalingState !== 'stable') return;
    
    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: 'offer', data: offer, sender: userId });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    })();
  }, [remoteJoined, localStreamReady, userId]);

  // ─── WebRTC + signaling + ICE buffering ────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ] 
    });
    pcRef.current = pc;

    // 1️⃣ Local video
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        facingMode: 'user'
      }, 
      audio: false
    })
      .then(stream => {
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Set local video
        if (localRef.current) {
          localRef.current.srcObject = stream;
          localRef.current.onloadedmetadata = () => {
            setLocalStreamReady(true);
          };
        }
        
        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      })
      .catch(error => {
        console.error('Error accessing media devices:', error);
        alert('Please allow camera access');
      });

    // 2️⃣ Signaling socket
    const ws = new WebSocket(`ws://localhost:8000/call/${roomId}`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      sendSignal({ type: 'join', sender: userId });
    };

    ws.onmessage = async ev => {
      const msg = JSON.parse(ev.data) as SignalingMessage;
      
      if (msg.sender === userId || pc.signalingState === 'closed') return;

      try {
        switch (msg.type) {
          case 'join':
            if (msg.sender !== userId) {
              setRemoteJoined(true);
            }
            break;

          case 'offer':
            if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
              
              // Process pending candidates
              pendingCandidates.current.forEach(c => {
                pc.addIceCandidate(new RTCIceCandidate(c));
              });
              pendingCandidates.current = [];
              
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignal({ type: 'answer', data: answer, sender: userId });
            }
            break;

          case 'answer':
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
              
              // Process pending candidates
              pendingCandidates.current.forEach(c => {
                pc.addIceCandidate(new RTCIceCandidate(c));
              });
              pendingCandidates.current = [];
            }
            break;

          case 'candidate':
            const cand = msg.data as RTCIceCandidateInit;
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } else {
              pendingCandidates.current.push(cand);
            }
            break;

          // ─── Friend / Assist handlers ───────────────────────────────────────────
          case 'friend-request':
            setIncomingReq(true);
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
            setIsAssistActive(true);
            if (msg.text) setAssistPrompt(msg.text);
            break;
          case 'assist_input':
            if (msg.text !== undefined) setAssistInput(msg.text);
            break;
          case 'assist_end':
            setIsAssistActive(false);
            setAssistPrompt('');
            break;
        }
      } catch (error) {
        console.error('Error handling signaling message:', error);
      }
    };

    // 3️⃣ ICE & track handlers
    pc.onicecandidate = e => {
      if (e.candidate) {
        sendSignal({ type: 'candidate', data: e.candidate.toJSON(), sender: userId });
      }
    };

    pc.ontrack = e => {
      if (remoteRef.current) {
        remoteRef.current.srcObject = e.streams[0];
      }
    };

    return () => {
      mounted = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      pc.close();
    };
  }, [roomId, userId, peerId]);

  // ─── Friend handlers ─────────────────────────────────────────────────────────
  const sendFriend    = () => { sendSignal({ type: 'friend-request', sender: userId }); setRequestSent(true); };
  const acceptFriend  = async () => {
    await fetch(`http://localhost:8000/users/${peerId}/friends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        requester_id: peerId,
        receiver_id: userId,
        status: 'Accept',
        time_stamp: new Date().toISOString(),
      }),
    });
    sendSignal({ type: 'friend-accept', sender: userId });
    setIsFriend(true);
    setIncomingReq(false);
  };
  const declineFriend = () => { sendSignal({ type: 'friend-decline', sender: userId }); setIncomingReq(false); };

  // ─── Assist handlers ─────────────────────────────────────────────────────────
  const startAssist  = () => {
    setAssistMode(true);
    sendSignal({ type: 'assist_request', sender: userId, text: `Can you repeat the sentence for ${userId}?` });
  };
  const stopAssist   = () => {
    setIsAssistActive(false);
    setAssistPrompt('');
    sendSignal({ type: 'assist_end', sender: userId });
  };
  const updateAssist = (t: string) => {
    setAssistInput(t);
    sendSignal({ type: 'assist_input', sender: userId, text: t });
  };
  const toggleDict   = () => setDictionaryMode(x => !x);

  // ─── Keyboard for muted user ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (!isAssistActive) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (handModel && localRef.current) {
          const preds = await handModel.estimateHands(localRef.current);
          if (preds[0]?.landmarks) {
            const landmarks = preds[0].landmarks.map(p => [p[0], p[1], p[2]]);
            const res = await fetch('http://localhost:8000/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ landmarks }),
            });
            const { letter } = await res.json();
            updateAssist(assistInput + letter);
          }
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        updateAssist(assistInput + ' ');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAssistActive, assistInput, handModel]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col items-center space-y-4 p-4">
      {/* Friend invite modal */}
      {incomingReq && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <p className="mb-4 text-center">{peerId} wants to be your friend.</p>
            <div className="flex justify-center space-x-4">
              <button onClick={acceptFriend}  className="px-4 py-2 bg-green-600 text-white rounded">Accept</button>
              <button onClick={declineFriend} className="px-4 py-2 bg-red-600 text-white rounded">Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <h2 className="text-xl font-bold">In call with <span className="underline">{peerId}</span></h2>

      {/* Videos */}
      <div className="flex gap-4">
        <video ref={localRef}  autoPlay muted playsInline className="w-64 h-48 bg-black rounded" />
        <video ref={remoteRef} autoPlay playsInline className="w-64 h-48 bg-black rounded" />
      </div>

      {/* Controls */}
      <div className="flex space-x-4">
        {!isFriend && (
          <button onClick={sendFriend} disabled={requestSent}
                  className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
            {requestSent ? '…Sent' : 'Add Friend'}
          </button>
        )}
        <button onClick={() => router.push('/homepage')} className="px-4 py-2 bg-red-600 text-white rounded">
          Exit
        </button>
        {isMuted === false && (
          <>
            <button onClick={toggleDict} className="px-4 py-2 bg-blue-600 text-white rounded">Lookup Dictionary</button>
            <button onClick={startAssist} className="px-4 py-2 bg-yellow-500 text-white rounded">Repeat</button>
          </>
        )}
      </div>

      {/* Normal‑user preview of final sentence */}
      {assistMode && (
        <div className="w-full max-w-md p-3 bg-blue-50 rounded-lg border text-lg">
          <strong>{peerId}'s response:</strong> {assistInput}
        </div>
      )}

      {/* Dictionary overlay */}
      {dictionaryMode && (
        <div className="absolute top-4 right-4 w-80 bg-white p-2 rounded-lg shadow-lg z-40">
          <button onClick={toggleDict} className="absolute top-1 right-1 text-gray-600 hover:text-black">×</button>
          <Image src="/alphabet.png" width={640} height={480} alt="ASL Chart" className="mx-auto" />
        </div>
      )}

      {/* Muted‑user input UI */}
      {isAssistActive && (
        <div className="w-full max-w-md p-4 bg-gray-50 rounded-lg border space-y-3">
          <h3 className="text-lg font-medium">{assistPrompt}</h3>
          <p className="text-sm text-gray-600">Press <kbd>Enter</kbd> to recognize, <kbd>Space</kbd> for a space.</p>
          <textarea
            readOnly
            value={assistInput}
            placeholder="…"
            className="w-full h-32 p-2 bg-white rounded border resize-none overflow-y-auto whitespace-pre-wrap break-words text-gray-800"
          />
          {!!suggestions.length && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Suggestions:</p>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => updateAssist([...assistInput.split(' ').slice(0,-1), w].join(' ') + ' ')}
                    className="p-2 border rounded hover:bg-gray-100"
                  >
                    {i+1}. {w}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={stopAssist} className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}