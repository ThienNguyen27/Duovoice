import { useState, useEffect, useRef } from 'react';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  time_stamp: string;
}

export function useChat(roomId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    // 1) Load history
    fetch(`http://localhost:8000/chat/history/${roomId}`)
      .then(r => r.json())
      .then((history) => {
        console.log('history:', history);
        setMessages(Array.isArray(history) ? history : []);
      })
      .catch(() => setMessages([]));

    // 2) Open WS
    const ws = new WebSocket(`ws://localhost:8000/ws/chat/${roomId}`);
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data) as Message;
        setMessages(m => [...m, msg]);
      } catch (_) {}
    };
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [roomId, userId]);

  function send(content: string, to: string) {
    // const payload = { room_id: roomId, sender_id: userId, receiver_id: to, content };
    // // 1) Persist via HTTP
    // fetch('http://localhost:8000/messages', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // })
    //   .then(r => r.json())
    //   .then((msg: Message) => {
    //     // 2) Local echo
    //     setMessages(m => [...m, msg]);
    //     // 3) Notify peer
    //     // wsRef.current?.send(JSON.stringify(msg));
    //     wsRef.current?.send(JSON.stringify(payload));
    //   })
    //   .catch(console.error);

    // build the DirectMessageCreate payload
  const payload = { room_id: roomId, sender_id: userId, receiver_id: to , content };
  // send _only_ over WebSocket
  wsRef.current?.send(JSON.stringify(payload));
  }

  return { messages, send };
}
