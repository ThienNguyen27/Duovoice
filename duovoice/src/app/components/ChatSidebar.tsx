// components/ChatSidebar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface Friend {
  uid: string;         // document ID
  name: string;        // friend's username
  since: string | null;// optional ISO timestamp
}

interface ChatSidebarProps {
  username: string;
  friends: Friend[];
  selectedFriendId?: string;
  onSelect: (friend: Friend) => void;
}

export default function ChatSidebar({
  username,
  friends,
  selectedFriendId,
  onSelect,
}: ChatSidebarProps) {
  return (
    <aside className="w-72 border-r bg-[#F4F6FA] flex flex-col min-h-screen">
      <div className="p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold">Friends</h2>
        <Link href="/homepage" className="w-10 h-10 relative">
          <Image
            src="/DuoVoice_Logo_DeafBlue_Transparent.png"
            alt="DuoVoice Logo"
            fill
            className="object-contain"
            priority
          />
        </Link>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {friends.map((f) => (
          <li key={f.uid}>
            <button
              onClick={() => onSelect(f)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition ${
                f.uid === selectedFriendId ? 'bg-blue-100' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-300 flex items-center justify-center text-white font-bold uppercase">
                {f.name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <div className="text-gray-800">{f.name}</div>
                {f.since && (
                  <div className="text-xs text-gray-500">
                    since {new Date(f.since).toLocaleDateString()}
                  </div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
