"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatSidebar from "../components/ChatSidebar";
import { Friend } from "../../../public/lib/friends"

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

const templateFriends: Friend[] = [
  { uid: "alice", name: "Alice", since: new Date().toISOString() },
  { uid: "bob", name: "Bob", since: new Date().toISOString() },
  { uid: "charlie", name: "Charlie", since: new Date().toISOString() },
];

export default function ChatPage() {
  const [friends] = useState<Friend[]>(templateFriends);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const currentUser = localStorage.getItem("username") || "currentUser";

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    // TODO: Fetch real message history here
    setMessages([
      { sender: friend.uid, content: "Hi there!", timestamp: "10:00 AM" },
      { sender: currentUser, content: "Hello!", timestamp: "10:01 AM" },
    ]);
  };

  const handleSendMessage = () => {
    if (!selectedFriend || newMessage.trim() === "") return;
    const msg: Message = {
      sender: currentUser,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage("");
    // TODO: Send message over WebSocket or REST and persist
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar: Friend List */}
      <ChatSidebar
        username={currentUser}
        selectedFriendId={selectedFriend?.uid}
        onSelect={handleSelectFriend}
      />

      {/* Main: Chat Window */}
      <main className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-white">
              <h2 className="text-xl font-semibold">{selectedFriend.name}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`mb-4 flex flex-col ${
                    m.sender === currentUser ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-lg text-sm max-w-xs break-words ${
                      m.sender === currentUser
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {m.timestamp}
                  </span>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white flex">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="ml-2 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a friend to start chatting
          </div>
        )}
      </main>
    </div>
  );
}
