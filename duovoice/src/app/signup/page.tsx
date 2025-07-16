

'use client';

import Header from "@/app/components/header";
import React, { useEffect, useRef, useState } from 'react';

export default function SignUp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({
    text: '',
    type: '',
  });

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Failed to access camera:', err);
      }
    };
    initCamera();
  }, []);

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasRef.current.style.display = 'block';
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage({ text: 'Name is required.', type: 'error' });
      return;
    }
    setMessage({ text: `Signed up successfully as ${username}`, type: 'success' });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="p-3 border border-gray-300 rounded-md"
          />
          <video ref={videoRef} autoPlay playsInline className="rounded-md border" width={320} height={240} />
          <button
            type="button"
            onClick={handleSnap}
            className="bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600 transition"
          >
            📸 Take Photo
          </button>
          <canvas ref={canvasRef} width={320} height={240} className="rounded-md border hidden"></canvas>
          <button type="submit" className="bg-green-500 text-white rounded-md p-2 hover:bg-green-600 transition">
            Sign Up
          </button>
        </form>
        {message.text && (
          <p className={`mt-4 text-center font-semibold ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}


