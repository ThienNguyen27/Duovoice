'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = { userId: string };

export default function MatchButton({ userId }: Props) {
  const [waiting, setWaiting] = useState(false);
  const router = useRouter();

  const startMatch = async () => {
    setWaiting(true);
    try {
      // 1) kick off the match
      const res = await fetch('http://localhost:8000/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userId),
      });
      const m = await res.json();

      if (m.status === 'matched') {
        // if *you* are the second user, you get peer_id immediately
        router.push(
          `/call/${m.room_id}` +
            `?userId=${userId}` +
            `&peerId=${m.peer_id}` +
            `&initiator=true`
        );
        return;
      }
      // otherwise you go into waiting‑poll loop
    } catch (err) {
      console.error(err);
      setWaiting(false);
      alert('Error connecting to server');
      return;
    }

    // 2) poll /match/status until matched
    const iv = setInterval(async () => {
      const res2 = await fetch(`http://localhost:8000/match/status/${userId}`);
      const st = await res2.json();
      if (st.status === 'matched') {
        clearInterval(iv);
        // first user now gets peerId from status
        router.push(
          `/call/${st.room_id}` +
            `?userId=${userId}` +
            `&peerId=${st.peer_id}` +
            `&initiator=false`
        );
      }
    }, 2000);
  };

  return (
    <button
      onClick={startMatch}
      className={`w-full py-4 rounded text-white ${
        waiting ? 'bg-gray-800 animate-pulse' : 'bg-green-600 hover:bg-green-700'
      }`}
    >
      {waiting ? 'Matching…' : 'Match now'}
    </button>
  );
}
