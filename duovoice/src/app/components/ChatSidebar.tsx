"use client";

import { useEffect, useState } from "react";
import { fetchFriends, Friend } from "../../../public/lib/friends";

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
      fetchFriends(username).then(setFriends);
    }
  }, [username]);

  return (
    <aside className="w-1/4 border-r bg-white">
      <h2 className="p-4 text-xl font-semibold">Friends</h2>
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
