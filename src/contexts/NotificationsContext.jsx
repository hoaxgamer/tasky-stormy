import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import ToastContainer from "../components/Toast";
import { addHours } from "date-fns";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const q = query(
      collection(db, "users", user.uid, "tasks"),
      where("status", "==", "active"),
      where("reminder", ">=", Timestamp.fromDate(now)),
      where("reminder", "<=", Timestamp.fromDate(addHours(now, 24)))
    );
    const unsub = onSnapshot(
      q,
      (snap) => setUpcomingReminders(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn("Reminders query:", err.message)
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, message, type }]);
  }, []);

  const dismissToast = useCallback(
    (id) => setToasts((p) => p.filter((t) => t.id !== id)),
    []
  );

  return (
    <NotificationsContext.Provider value={{ addToast, upcomingReminders }}>
      {offline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center">
          <p className="text-xs text-amber-300 font-medium">
            📡 Offline — changes will sync when reconnected
          </p>
        </div>
      )}
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
