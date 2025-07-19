'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Hand, Ear, Users, BookOpen, MessageCircle, Info } from 'lucide-react';
import MatchButton from '../components/MatchButton';
export default function Homepage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('username');
    if (!u) {
      router.replace('/login');
    } else {
      setUsername(u);
    }
  }, [router]);

  if (!username) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-300 via-white to-blue-300 overflow-hidden">
      {/* Background Deaf community decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-6 text-blue-100 opacity-20 text-9xl">🤟</div>
        <div className="absolute top-20 right-8 text-blue-100 opacity-15 text-8xl">🦻</div>
        <div className="absolute bottom-24 left-16 text-blue-100 opacity-15 text-8xl">👐</div>
        <div className="absolute bottom-12 right-20 text-blue-100 opacity-20 text-9xl">👋</div>
      </div>

      <div className="relative bg-white rounded-xl shadow-md p-8 w-full max-w-2xl text-center z-10">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold text-blue-800 mb-4">
          <Hand className="w-6 h-6" />
          Welcome, {username}!
          <Ear className="w-6 h-6" />
        </h1>
        <hr className="border-t-2 border-blue-200 my-4" />
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <MatchButton userId={username} />
          <Link href="/practice" className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
            <BookOpen className="w-5 h-5" />
            Practice
          </Link>
          <Link href="/chat" className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
            <MessageCircle className="w-5 h-5" />
            Chat
          </Link>
          <Link href="/logged_in_about" className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
            <Info className="w-5 h-5" />
            About
          </Link>
        </div>
      </div>
    </div>
  );
}
