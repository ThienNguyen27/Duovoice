'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatSidebar, { Friend } from '../components/ChatSidebar';
import { useChat } from '../hooks/useChat';

export default function ChatPage() {
  // 1) load logged‑in user
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  useEffect(() => {
    setCurrentUser(localStorage.getItem('username'));
  }, []);

  // 2) Pull roomId from the URL
  const params = useSearchParams();
  const roomId = params.get('roomId') ?? '';

  // 3) Always call this hook (it internally no‑ops if userId/roomId are blank)
  const { messages, send } = useChat(roomId, currentUser ?? '');

  // 4) Sidebar state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // 5) Message draft
  const [draft, setDraft] = useState('');

  // 6) Fetch friends once we have a real user
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
            data.map(f => ({
              uid:   f.id,
              name:  f.friend_id ?? f.id,
              since: null,
            }))
          );
        } else {
          console.error('Friends API did not return an array:', data);
          setFriends([]);
        }
      })
      .catch(err => {
        console.error('Failed to load friends:', err);
        setFriends([]);
      });
  }, [currentUser]);

  // 7) Early-render guard (Hooks are still in place above!)
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <ChatSidebar
        username={currentUser}
        friends={friends}
        selectedFriendId={selectedFriend?.uid}
        onSelect={setSelectedFriend}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#F9FAFB]">
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedFriend ? (
            <div className="text-center text-gray-500 mt-20">
              Select a friend to start chatting
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">No messages yet</div>
          ) : (
            messages.map(m => (
              <div
                key={m.id}
                className={`flex mb-2 ${
                  m.sender_id === currentUser
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div className={`p-3 rounded-lg max-w-xs shadow ${
                  m.sender_id === currentUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}>
                  {m.content}
                  <div className="text-xs text-gray-600 mt-1 text-right">
                    {new Date(m.time_stamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedFriend && (
          <div className="p-4 border-t bg-white flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Type a message…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <button
              onClick={() => {
                if (!draft.trim()) return;
                send(draft.trim(), selectedFriend.uid);
                setDraft('');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
