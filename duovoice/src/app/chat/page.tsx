"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatSidebar from "../components/ChatSidebar";
import { Friend } from "../../../public/lib/friends"


interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  // 🚧 track username in state
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // 🚧 on mount, read localStorage
  useEffect(() => {
    const user = localStorage.getItem("username");
    setCurrentUser(user);
  }, []);

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const handleSelectFriend = (friend: Friend) => {
    if (!currentUser) return;
    setSelectedFriend(friend);

    // TODO: replace with real fetch
    setMessages([
      { sender: friend.uid, content: "Hi there!", timestamp: "10:00 AM" },
      { sender: currentUser, content: "Hello!", timestamp: "10:01 AM" },
    ]);
  };

  const handleSendMessage = () => {
    if (!currentUser || !selectedFriend || !newMessage.trim()) return;
    const msg: Message = {
      sender: currentUser,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
    // TODO: send via WebSocket/REST
  };

  // don’t render chat UI until we know the user
  if (currentUser === null) {
    return <div className="flex-1 flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ChatSidebar
        username={currentUser}
        selectedFriendId={selectedFriend?.uid}
        onSelect={handleSelectFriend}
      />

      <main className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            <div className="p-4 border-b bg-white">
              <h2 className="text-xl font-semibold">{selectedFriend.name}</h2>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`mb-4 flex flex-col ${
                    m.sender === currentUser ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-lg text-sm max-w-xs break-words ${
                      m.sender === currentUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{m.timestamp}</span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-white flex">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
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