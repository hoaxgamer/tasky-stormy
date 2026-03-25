import { useState, useEffect, useCallback } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setTasks([]); setLoading(false); return; }
    const q = query(
      collection(db, "users", user.uid, "tasks"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snap) => { setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.error("Tasks listener:", err); setLoading(false); }
    );
  }, [user]);

  const activeTasks = tasks.filter((t) => t.status === "active");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const createTask = useCallback(async (data) => {
    if (!user) throw new Error("Not authenticated");
    const ref = await addDoc(collection(db, "users", user.uid, "tasks"), {
      ...data,
      status: "active",
      userId: user.uid,
      aiProcessed: false,
      tags: data.tags || [],
      subtasks: data.subtasks || [],
      dueDate: null,
      reminder: null,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }, [user]);

  const updateTask = useCallback(async (taskId, updates) => {
    if (!user) throw new Error("Not authenticated");
    const processed = { ...updates, updatedAt: serverTimestamp() };
    if (updates.dueDate instanceof Date) processed.dueDate = Timestamp.fromDate(updates.dueDate);
    if (updates.reminder instanceof Date) processed.reminder = Timestamp.fromDate(updates.reminder);
    if (updates.dueDate === null) processed.dueDate = null;
    if (updates.reminder === null) processed.reminder = null;
    await updateDoc(doc(db, "users", user.uid, "tasks", taskId), processed);
  }, [user]);

  const completeTask = useCallback(async (taskId) => {
    if (!user) throw new Error("Not authenticated");
    await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
      status: "completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const restoreTask = useCallback(async (taskId) => {
    if (!user) throw new Error("Not authenticated");
    await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
      status: "active",
      completedAt: null,
      updatedAt: serverTimestamp(),
    });
  }, [user]);

  const deleteTask = useCallback(async (taskId) => {
    if (!user) throw new Error("Not authenticated");
    await deleteDoc(doc(db, "users", user.uid, "tasks", taskId));
  }, [user]);

  return { tasks, activeTasks, completedTasks, loading, createTask, updateTask, completeTask, restoreTask, deleteTask };
}
