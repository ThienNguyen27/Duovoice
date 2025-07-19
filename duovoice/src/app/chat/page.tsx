"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar, { Friend } from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import { useChat } from '../hooks/useChat';

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // Initialize user and redirect if not logged in
  useEffect(() => {
    const user = localStorage.getItem('username');
    console.log('🔑 currentUser from localStorage:', user);
    if (!user) {
      router.replace('/login');
    } else {
      setCurrentUser(user);
    }
  }, [router]);

  // Fetch friend list
  useEffect(() => {
  if (!currentUser) return;
  fetch(`http://localhost:8000/users/${currentUser}/friends`)
     .then(res => {
       if (!res.ok) throw new Error(res.statusText);
       return res.json();
     })
     .then(data => {
       if (Array.isArray(data)) {
         setFriends(
           data.map((f: any) => ({
             uid:   f.uid,        // exactly what the API returns
             name:  f.name,       // guaranteed string
             since: f.since,      // may be null or ISO string
           }))
         );
       } else {
         setFriends([]);
       }
     })
     .catch(err => {
       console.error("Failed to load friends:", err);
       setFriends([]);
     });
}, [currentUser]);

    // Compute roomId
  const roomId = selectedFriend && currentUser
    ? [currentUser, selectedFriend.uid].sort().join('_')
    : '';

  // Hook into chat (always call hook)
  const { messages, send } = useChat(roomId, currentUser || '');

  // Show loading until user is set
  if (currentUser === null) {
    return <div className="flex-1 flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="flex h-screen">
      <ChatSidebar
        username={currentUser}
        friends={friends}
        selectedFriendId={selectedFriend?.uid}
        onSelect={setSelectedFriend}
      />
      <div className="flex-1 flex flex-col bg-[#F9FAFB]">
        {!selectedFriend ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a friend to start chatting
          </div>
        ) : (
          <ChatWindow roomId={roomId} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
