'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VideoCall from '@/app/components/VideoCall';

export default function CallPage() {
  const { roomId: rawRoom } = useParams();
  const roomId = Array.isArray(rawRoom) ? rawRoom[0] : rawRoom || '';
  const search = useSearchParams();
  const userId = search.get('userId') ?? '';
  const peerId = search.get('peerId') ?? '';
  // const initiator = search.get('initiator') === 'true';

  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || !roomId || !userId || !peerId) return null;

  return (
    <VideoCall
      roomId={roomId}
      userId={userId}
      peerId={peerId}
    />
  );
}
