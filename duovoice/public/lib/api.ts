export type Friend = { uid: string; name: string; since: string };

/**
 * Fetch the list of friends for the given user from your FastAPI backend.
 */
export async function getFriends(username: string): Promise<Friend[]> {
  const res = await fetch(`http://localhost:8000/users/${username}/friends`, {
    credentials: "include",   // if you eventually use cookies
  });
  if (!res.ok) {
    throw new Error(`Failed to load friends (${res.status})`);
  }
  return res.json();
}