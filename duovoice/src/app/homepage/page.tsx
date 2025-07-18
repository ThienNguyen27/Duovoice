"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Homepage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("username");
    if (!user) {
      router.replace("/login");
    } else {
      setUsername(user);
    }
  }, [router]);

  if (!username) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-6">Welcome, {username}!</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
        <Link href="/call">
          <button className="w-full py-4 rounded-lg shadow-md hover:shadow-lg transition">
            📞 Call
          </button>
        </Link>
        <Link href="/practice">
          <button className="w-full py-4 rounded-lg shadow-md hover:shadow-lg transition">
            📝 Practice
          </button>
        </Link>
        <Link href="/chat">
          <button className="w-full py-4 rounded-lg shadow-md hover:shadow-lg transition">
            💬 Chat
          </button>
        </Link>
      </div>
    </div>
  );
}