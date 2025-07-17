import { db, doc, setDoc , collection, getDocs} from "./firebase";

export async function addFriend(
  currentUid: string,
  friendUid: string,
  friendName: string
) {

  // Path: users/{currentUid}/friends/{friendUid}
  const friendRef = doc(db, "users", currentUid, "friends", friendUid);
  await setDoc(friendRef, {
    name: friendName,
    since: new Date().toISOString(),
  });
}

export type Friend = { uid: string; name: string; since: string };

export async function fetchFriends(currentUid: string): Promise<Friend[]> {
  const friendsCol = collection(db, "users", currentUid, "friends");
  const snap = await getDocs(friendsCol);
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<Friend, "uid">) }));
}