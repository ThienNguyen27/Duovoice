"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // 1) Sign up
      const signupRes = await fetch("http://localhost:8000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, is_muted: isMuted }),
      });
      const signupBody = await signupRes.json();
      if (!signupRes.ok) {
        throw new Error(signupBody.detail || signupBody || "Signup failed");
      }

      // 2) Auto-login
      const loginRes = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, password }),
      });
      if (!loginRes.ok) {
        const loginErr = await loginRes.json();
        throw new Error(loginErr.detail || "Auto-login failed");
      }

      // 3) Persist session & redirect
      localStorage.setItem("username", name);
      router.push("/homepage");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Sign Up</h1>
        {error && (
          <div className="mb-4 text-red-700 bg-red-100 p-2 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            />
          </div>
          <div className="flex items-center">
            <input
              id="isMuted"
              type="checkbox"
              checked={isMuted}
              onChange={(e) => setIsMuted(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isMuted" className="ml-2 text-sm">
              I am mute (for call pairing)
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing you up…" : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}