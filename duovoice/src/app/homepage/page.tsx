'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MatchButton from '@/app/components/MatchButton';
import Link from 'next/link';

export default function Homepage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const u = sessionStorage.getItem('username');
    if (!u) {
      router.replace('/login');
    } else {
      setUsername(u);
    }
  }, [router]);

  if (!username) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Welcome, {username}!</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
        {/* Only here */}
        <MatchButton userId={username} />

        <Link href="/practice">
          <button className="w-full py-4 rounded shadow hover:shadow-lg transition">
            Practice
          </button>
        </Link>
        <Link href="/chat">
          <button className="w-full py-4 rounded shadow hover:shadow-lg transition">
            Chat
          </button>
        </Link>
      </div>
    </div>
  );
}
