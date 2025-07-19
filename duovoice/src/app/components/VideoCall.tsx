'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type SignalingMessage =
  | { type: 'join' | 'offer' | 'answer'; data: any; sender: string }
  | { type: 'candidate'; data: RTCIceCandidateInit; sender: string }
  | { type: 'friend-request'; sender: string }
  | { type: 'friend-accept'; sender: string }
  | { type: 'friend-decline'; sender: string };

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
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    // **Use the exact WS URL your backend listens on**
    const ws = new WebSocket(`ws://localhost:8000/call/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WS open – joining room', roomId);
      ws.send(JSON.stringify({ type: 'join', sender: userId }));
    };

    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data) as SignalingMessage;
      if (msg.sender === userId || pc.signalingState === 'closed') return;

      console.log('⟵ WS message', msg);
      switch (msg.type) {
        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
          {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(
              JSON.stringify({
                type: 'answer',
                data: answer,
                sender: userId,
              })
            );
          }
          break;

        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
          break;

        case 'candidate':
          await pc.addIceCandidate(new RTCIceCandidate(msg.data));
          break;

        case 'friend-request':
          console.log('🔔 incoming friend request from', msg.sender);
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
      }
    };

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        ws.send(
          JSON.stringify({
            type: 'candidate',
            data: candidate,
            sender: userId,
          })
        );
      }
    };

    // Remote tracks
    pc.ontrack = (evt) => {
      if (remoteRef.current) {
        remoteRef.current.srcObject = evt.streams[0];
      }
    };

    // Negotiation
    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(
        JSON.stringify({
          type: 'offer',
          data: offer,
          sender: userId,
        })
      );
    };

    // Grab local media
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

  const handleAddFriend = () => {
    wsRef.current?.send(
      JSON.stringify({ type: 'friend-request', sender: userId })
    );
    setRequestSent(true);
  };

  const handleAccept = async () => {
    try {
      const inv = {
      id: crypto.randomUUID(),
      requester_id: peerId,
      receiver_id: userId,
      status: "Accept",                 
      time_stamp: new Date().toISOString()
    };
      const res = await fetch(
        `http://localhost:8000/users/${peerId}/friends`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inv),
        }
      );
      if (!res.ok) throw new Error('Failed to add friend');
      wsRef.current?.send(
        JSON.stringify({ type: 'friend-accept', sender: userId })
      );
      setIsFriend(true);
    } catch (e: any) {
      console.error('handleAccept error:', e);
      alert(e.message);
    } finally {
      setIncomingRequest(false);
    }
  };

  const handleDecline = () => {
    wsRef.current?.send(
      JSON.stringify({ type: 'friend-decline', sender: userId })
    );
    setIncomingRequest(false);
  };

  return (
    <div className="relative flex flex-col items-center space-y-4">
      {incomingRequest && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <p className="mb-4 text-center">
              {peerId} wants to be your friend.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={handleAccept}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Accept
              </button>
              <button
                type="button"
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
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          className="w-64 h-48 bg-black"
        />
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="w-64 h-48 bg-black"
        />
      </div>

      <div className="flex space-x-4">
        {!isFriend && (
          <button
            type="button"
            onClick={handleAddFriend}
            disabled={requestSent}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {requestSent ? 'Request Sent…' : 'Add Friend'}
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push('/homepage')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
