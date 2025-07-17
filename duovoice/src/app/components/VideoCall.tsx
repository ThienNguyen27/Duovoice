'use client';

import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

type SignalingMessage =
  | { type: 'offer' | 'answer'; data: RTCSessionDescriptionInit; sender: string }
  | { type: 'candidate'; data: RTCIceCandidateInit; sender: string }
  | { type: 'join'; sender: string };

interface VideoCallProps {
  roomId: string;
  userId: string;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId, userId }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    const ws = new WebSocket(`ws://localhost:8000/call/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', sender: userId }));
      console.log(`User ${userId} joined room ${roomId}`);
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'candidate', data: event.candidate, sender: userId }));
      }
    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        if (pc.signalingState !== "closed") {
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to access media devices:", err);
        alert("Failed to access camera/mic.");
      });

    ws.onmessage = async (event) => {
      const message: SignalingMessage = JSON.parse(event.data);
      if (message.sender === userId) return;

      if (!pc || pc.signalingState === "closed") return;

      switch (message.type) {
        case 'join':
          console.log(`Another user ${message.sender} joined`);
          break;

        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', data: answer, sender: userId }));
          break;

        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          break;

        case 'candidate':
          await pc.addIceCandidate(new RTCIceCandidate(message.data));
          break;
      }
    };

    return () => {
      cleanupConnection();
    };
  }, [roomId]);

  const cleanupConnection = () => {
    const pc = pcRef.current;
    const ws = wsRef.current;

    if (pc) {
      pc.close();
      pcRef.current = null;
    }

    if (ws) {
      ws.close();
      wsRef.current = null;
    }

    const localStream = localVideoRef.current?.srcObject as MediaStream | null;
    localStream?.getTracks().forEach((track) => track.stop());

    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null;
    remoteStream?.getTracks().forEach((track) => track.stop());

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setIsStarted(false);
  };

  const startCall = async () => {
    const pc = pcRef.current;
    const ws = wsRef.current;
    if (!pc || !ws) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', data: offer, sender: userId }));
    setIsStarted(true);
  };

  const handleSkip = () => {
    cleanupConnection();
    const newRoomId = Math.random().toString(36).substring(2, 10);
    router.push(`/call/${newRoomId}`);
  };

  const handleExit = () => {
    cleanupConnection();
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-xl font-bold">WebRTC Video Call</h2>
      <div className="flex gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-64 h-48 border"
          style={{ backgroundColor: 'black' }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-64 h-48 border"
          style={{ backgroundColor: 'black' }}
        />
      </div>
      <div className="flex gap-2">
        {!isStarted && (
          <button
            onClick={startCall}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start Call
          </button>
        )}
        <button
          onClick={handleSkip}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Skip
        </button>
        <button
          onClick={handleExit}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Exit
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
