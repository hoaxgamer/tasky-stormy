import { useState, useEffect, useCallback } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export function useMemory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setEntries([]); setLoading(false); return; }
    const q = query(
      collection(db, "users", user.uid, "memory"),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user]);

  const addEntry = useCallback(async (content) => {
    if (!user) throw new Error("Not authenticated");
    return addDoc(collection(db, "users", user.uid, "memory"), {
      content,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const updateEntry = useCallback(async (id, content) => {
    if (!user) throw new Error("Not authenticated");
    await updateDoc(doc(db, "users", user.uid, "memory", id), {
      content,
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const deleteEntry = useCallback(async (id) => {
    if (!user) throw new Error("Not authenticated");
    await deleteDoc(doc(db, "users", user.uid, "memory", id));
  }, [user]);

  return { entries, loading, addEntry, updateEntry, deleteEntry };
}
