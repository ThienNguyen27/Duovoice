'use client';

import React, { useEffect, useState } from 'react';
import VideoCall from '@/app/components/VideoCall';
import { useParams } from 'next/navigation';

export default function CallPage() {
  const [mounted, setMounted] = useState(false);
  const { roomId } = useParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof roomId !== 'string') return null;

  return <VideoCall roomId={roomId} />;
}
