'use client';

import React, { useEffect, useRef, useState } from 'react';

type SignalingMessage =
  | { type: 'offer'; data: RTCSessionDescriptionInit }
  | { type: 'answer'; data: RTCSessionDescriptionInit }
  | { type: 'candidate'; data: RTCIceCandidateInit };

interface VideoCallProps {
  roomId: string;
}

const VideoCall: React.FC<VideoCallProps> = ({ roomId }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/call/${roomId}`);
    wsRef.current = ws;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    // Handle remote track
    pc.ontrack = (event) => {
      console.log("Remote track received:", event.streams);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Send ICE candidates to signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        console.log("Sending ICE candidate:", event.candidate);
        wsRef.current.send(JSON.stringify({ type: 'candidate', data: event.candidate }));
      }
    };

    // Handle signaling messages
    ws.onmessage = async (event) => {
      const message: SignalingMessage = JSON.parse(event.data);
      const pc = pcRef.current;
      if (!pc) return;

      switch (message.type) {
        case 'offer':
          console.log("Received offer");
          await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', data: answer }));
          break;
        case 'answer':
          console.log("Received answer");
          await pc.setRemoteDescription(new RTCSessionDescription(message.data));
          break;
        case 'candidate':
          console.log("Received candidate");
          await pc.addIceCandidate(new RTCIceCandidate(message.data));
          break;
      }
    };

    return () => {
      pc.close();
      ws.close();
    };
  }, [roomId]);

  const startCall = async () => {
    try {
      console.log("Requesting camera and microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("Got local stream:", stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = pcRef.current;
      const ws = wsRef.current;
      if (!pc || !ws) return;

      stream.getTracks().forEach((track) => {
        console.log("Adding track:", track);
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Sending offer:", offer);
      ws.send(JSON.stringify({ type: 'offer', data: offer }));

      setIsStarted(true);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Failed to access camera/microphone. Please allow permissions.");
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-xl font-bold">WebRTC Video Call</h2>
      <div className="flex gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          className="w-64 h-48 border"
          style={{ backgroundColor: 'black' }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          className="w-64 h-48 border"
          style={{ backgroundColor: 'black' }}
        />
      </div>
      {!isStarted && (
        <button
          onClick={startCall}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Start Call
        </button>
      )}
    </div>
  );
};

export default VideoCall;
