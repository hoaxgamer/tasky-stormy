import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { Send, Loader2, CloudLightning } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Stormy() {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "stormyChats"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingMsgs(false);
    }, () => setLoadingMsgs(false));
    return unsub;
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    // Step 1: Save user chat + create storm session immediately
    await addDoc(collection(db, "users", user.uid, "stormyChats"), {
      message: text, role: "user", userId: user.uid, createdAt: serverTimestamp(),
    });

    const sessionRef = await addDoc(collection(db, "users", user.uid, "stormSessions"), {
      rawInput: text, title: "Untitled Storm", expandedContent: null,
      sensibleContent: null, userId: user.uid,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });

    // Step 2: Call Cloud Function
    try {
      const fn = httpsCallable(functions, "processStormyInput");
      await fn({ rawInput: text, sessionId: sessionRef.id });
    } catch (err) {
      console.error("processStormyInput failed:", err);
      addToast("AI processing failed — your idea was saved to Stormer.", "warning");
      await addDoc(collection(db, "users", user.uid, "stormyChats"), {
        message: "Saved to Stormer as: Untitled Storm",
        role: "assistant", linkedSessionId: sessionRef.id, userId: user.uid,
        createdAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  }, [input, sending, user, addToast]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-4 border-b border-slate-700/50 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <CloudLightning size={15} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-200">Stormy</h1>
          <p className="text-xs text-slate-500">Capture ideas, thoughts, and brainstorms — zero friction</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
        {loadingMsgs ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (
            <div key={i} className={`flex ${i%2===0?'justify-end':'justify-start'}`}>
              <div className="h-10 w-48 rounded-2xl bg-slate-700/40 animate-pulse" />
            </div>
          ))}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <CloudLightning size={24} className="text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Start a brainstorm</h3>
            <p className="text-xs text-slate-500 max-w-xs">Dump any idea, however rough. Stormy saves it instantly and gives it a title. Browse and expand in Stormer.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in-up`}>
              <div className={`max-w-[80%] md:max-w-[65%] ${msg.role === 'user' ? 'bg-indigo-500/15 border-indigo-500/20 text-slate-200' : 'bg-slate-800 border-slate-700/60 text-slate-300'} border rounded-2xl px-3.5 py-2.5`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <CloudLightning size={10} className="text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-400">Stormy</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                <p className="text-xs text-slate-600 mt-1">{msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'just now'}</p>
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={13} className="text-indigo-400 animate-spin" />
              <span className="text-xs text-slate-400">Stormy is saving…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 md:px-6 py-3 border-t border-slate-700/50 bg-slate-900/50">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Dump your idea here…"
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none max-h-32 transition-all"
            style={{ minHeight: '42px' }}
            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'; }}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending} className="p-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all" aria-label="Send">
            {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
