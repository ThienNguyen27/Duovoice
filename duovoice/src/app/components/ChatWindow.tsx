"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat, Message as ChatMessage } from "@/app/hooks/useChat";

interface ChatWindowProps {
  roomId: string;
  currentUser: string;
}

export default function ChatWindow({ roomId, currentUser }: ChatWindowProps) {
  const { messages, send } = useChat(roomId, currentUser);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    // determine peer ID from roomId
    const [a, b] = roomId.split("_");
    const peer = a === currentUser ? b : a;
    send(input.trim(), peer);
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m: ChatMessage) => (
          <div
            key={m.id}
            className={`flex ${
              m.sender_id === currentUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg text-sm break-words ${
                m.sender_id === currentUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {m.content}
              <div className="text-xs text-gray-400 mt-1 text-right">
                {new Date(m.time_stamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {/* Dummy element for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white flex">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 border rounded-full px-4 py-2 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="ml-2 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
