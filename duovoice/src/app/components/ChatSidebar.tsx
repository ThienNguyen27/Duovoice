"use client";

import { useEffect, useState } from "react";
import { getFriends, Friend } from "../../../public/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

interface ChatSidebarProps {
  username: string;
  onSelect: (friend: Friend) => void;
  selectedFriendId?: string;
}

export default function ChatSidebar({
  username,
  onSelect,
  selectedFriendId,
}: ChatSidebarProps) {
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (username) {
      getFriends(username).then(setFriends).catch(console.error);
    }
  }, [username]);

  return (
    <aside className="w-72 border-r relative min-h-screen bg-[#F4F6FA] flex flex-col">
      <div className="p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold">Friends</h2>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="flex items-center">
            <div className="w-20 h-20 relative">
              <Image
                src="/DuoVoice_Logo_DeafBlue_Transparent.png"
                alt="DuoVoice Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </motion.div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {friends.map((f) => (
          <li key={f.uid}>
            <button
              onClick={() => onSelect(f)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition ${
                f.uid === selectedFriendId ? "bg-blue-100" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-300 flex items-center justify-center text-white font-bold uppercase">
                {f.name[0]}
              </div>
              <span className="text-gray-700">{f.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
