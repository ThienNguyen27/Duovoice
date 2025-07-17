'use client';

import React, { useEffect, useState } from 'react';
import VideoCall from '@/app/components/VideoCall';
import { useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function CallPage() {
  const [mounted, setMounted] = useState(false);
  const { roomId } = useParams();
  const [userId] = useState(() => uuidv4()); // generated once per mount

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof roomId !== 'string') return null;

  return <VideoCall roomId={roomId} userId={userId} />;
}
