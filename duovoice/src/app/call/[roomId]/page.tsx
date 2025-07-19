'use client';

import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';

const VideoCall = dynamic(
  () => import('@/app/components/VideoCall'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        Loading call…
      </div>
    ),
  }
);

export default function CallPage() {
  const { roomId: rawRoom } = useParams();
  const roomId = Array.isArray(rawRoom) ? rawRoom[0] : rawRoom || '';
  const search = useSearchParams();
  const userId = search.get('userId') ?? '';
  const peerId = search.get('peerId') ?? '';

  if (!roomId || !userId || !peerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Missing parameters…
      </div>
    );
  }

  return <VideoCall roomId={roomId} userId={userId} peerId={peerId} />;
}
