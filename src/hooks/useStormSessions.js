import { useState, useEffect, useCallback } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export function useStormSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setSessions([]); setLoading(false); return; }
    const q = query(
      collection(db, "users", user.uid, "stormSessions"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snap) => { setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.error("StormSessions listener:", err); setLoading(false); }
    );
  }, [user]);

  const createSession = useCallback(async (rawInput) => {
    if (!user) throw new Error("Not authenticated");
    const ref = await addDoc(collection(db, "users", user.uid, "stormSessions"), {
      rawInput,
      title: "Untitled Storm",
      expandedContent: null,
      sensibleContent: null,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }, [user]);

  const updateSession = useCallback(async (id, updates) => {
    if (!user) throw new Error("Not authenticated");
    await updateDoc(doc(db, "users", user.uid, "stormSessions", id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const deleteSession = useCallback(async (id) => {
    if (!user) throw new Error("Not authenticated");
    await deleteDoc(doc(db, "users", user.uid, "stormSessions", id));
  }, [user]);

  return { sessions, loading, createSession, updateSession, deleteSession };
}
