'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Signaling =
  | { type: 'offer' | 'answer'; data: RTCSessionDescriptionInit; sender: string }
  | { type: 'candidate'; data: RTCIceCandidateInit; sender: string };

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
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsRef.current?.send(
          JSON.stringify({ type: 'offer', data: pc.localDescription, sender: userId })
        );
      } catch (err) {
        console.error('negotiationneeded failed:', err);
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'candidate', data: candidate, sender: userId })
        );
      }
    };

    pc.ontrack = (evt) => {
      if (remoteRef.current) {
        remoteRef.current.srcObject = evt.streams[0];
      }
    };

    const ws = new WebSocket(`ws://localhost:8000/call/${roomId}`);
    wsRef.current = ws;

    ws.onmessage = async ({ data }) => {
      const msg: Signaling = JSON.parse(data);
      if (msg.sender === userId) return;
      const cur = pcRef.current!;
      switch (msg.type) {
        case 'offer':
          await cur.setRemoteDescription(new RTCSessionDescription(msg.data));
          const answer = await cur.createAnswer();
          await cur.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', data: answer, sender: userId }));
          break;
        case 'answer':
          await cur.setRemoteDescription(new RTCSessionDescription(msg.data));
          break;
        case 'candidate':
          await cur.addIceCandidate(new RTCIceCandidate(msg.data));
          break;
      }
    };

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!isMounted) return;
        if (localRef.current) localRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => {
          // only add if connection still open
          if (pc.signalingState !== 'closed') {
            pc.addTrack(track, stream);
          }
        });
      })
      .catch((err) => {
        console.error('Could not get local media:', err);
        alert('Please allow camera & microphone.');
      });

    return () => {
      isMounted = false;
      ws.close();
      pc.close();
      pcRef.current = null;
      wsRef.current = null;
    };
  }, [roomId, userId]);

  return (
    <div className="flex flex-col items-center space-y-4">
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
      <button
        onClick={() => router.push('/homepage')}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Exit
      </button>
    </div>
  );
}
