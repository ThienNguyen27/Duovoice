"use client";

import { useEffect, useState } from "react";
import { getFriends, Friend } from "../../../public/lib/api";

import React from "react";
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
    <aside className="w-1/4 border-r relative min-h-screen bg-[#E6F0FA] overflow-hidden">
<h2 className="p-4 text-xl font-semibold flex items-center">
  <span>Friends</span>

  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
    className="ml-auto"
  >
    <Link href="/" className="flex items-center">
      <div className="w-20 h-20 relative"> {/* fixed logo box */}
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
</h2>

         
      
      <ul>
        {friends.map((f) => (
          <li key={f.uid}>
            <button
              onClick={() => onSelect(f)}
              className={`w-full text-left p-4 hover:bg-gray-100 ${
                f.uid === selectedFriendId ? "bg-gray-200" : ""
              }`}
            >
              {f.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
