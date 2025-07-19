'use client';

import { useState, useEffect } from 'react';
import ChatSidebar, { Friend } from '../components/ChatSidebar';

interface ApiFriend {
  id: string;
  user_id: string;
  friend_id: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // 1) Load current user
  useEffect(() => {
    const u = localStorage.getItem('username');
    setCurrentUser(u);
  }, []);

  // 2) Fetch and map friends once we know the user
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/users/${currentUser}/friends`
        );
        if (!res.ok) throw new Error('Failed to load friends');
        const apiFriends = (await res.json()) as ApiFriend[];

        // Map to ChatSidebar.Friend shape
        const uiFriends: Friend[] = apiFriends.map((f) => ({
          uid: f.id,
          name: f.friend_id,   // use the friend_id as display name
          since: null,         // or pull a timestamp if you store one
        }));

        setFriends(uiFriends);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [currentUser]);

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    setMessages([
      { sender: friend.uid, content: 'Hi there!', timestamp: '10:00 AM' },
      { sender: currentUser!, content: 'Hello!', timestamp: '10:01 AM' },
    ]);
  };

  const handleSendMessage = () => {
    if (!currentUser || !selectedFriend || !newMessage.trim()) return;
    const msg: Message = {
      sender: currentUser,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage('');
  };

  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center">Loading…</div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      <ChatSidebar
        username={currentUser}
        friends={friends}
        selectedFriendId={selectedFriend?.uid}
        onSelect={handleSelectFriend}
      />

      <main className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            <div className="p-4 border-b bg-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-300 flex items-center justify-center text-white font-bold uppercase">
                {selectedFriend.name.charAt(0)}
              </div>
              <h2 className="text-lg font-medium">{selectedFriend.name}</h2>
              <span className="ml-2 text-green-500 text-xs">● Online</span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#F4F6FA]">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    m.sender === currentUser ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm max-w-xs break-words shadow ${
                      m.sender === currentUser
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-xs text-gray-400 mt-1">
                    {m.timestamp}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-white flex items-center gap-3">
              <input
                type="text"
                placeholder="Type a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-400">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-lg font-medium">
              Select a friend to start chatting
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
