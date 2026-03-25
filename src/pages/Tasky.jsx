import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { Send, Mic, MicOff, Loader2, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Tasky() {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "taskyChats"), orderBy("createdAt", "asc"));
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

    // Step 1: Immediately save user chat message
    const chatMsgRef = await addDoc(collection(db, "users", user.uid, "taskyChats"), {
      message: text, role: "user", userId: user.uid,
      createdAt: serverTimestamp(),
    });

    // Step 1b: Immediately create task with raw input
    const taskRef = await addDoc(collection(db, "users", user.uid, "tasks"), {
      rawInput: text, title: text.substring(0, 120), description: null,
      status: "active", priority: null, tags: [], dueDate: null,
      recurringSchedule: null, subtasks: [], reminder: null,
      source: "tasky", aiProcessed: false, userId: user.uid,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), completedAt: null,
    });

    // Step 2: Call Cloud Function to process with Gemini
    try {
      const fn = httpsCallable(functions, "processTaskyInput");
      await fn({ rawInput: text, taskId: taskRef.id });
    } catch (err) {
      console.error("processTaskyInput failed:", err);
      addToast("AI processing failed — your input was saved. Edit it in Tasker.", "warning");
      // Update task title at minimum
      await updateDoc(doc(db, "users", user.uid, "tasks", taskRef.id), {
        aiProcessed: true, title: text.substring(0, 120),
      });
      // Save fallback assistant message
      await addDoc(collection(db, "users", user.uid, "taskyChats"), {
        message: "Saved to Tasker as raw input — you can edit it directly.",
        role: "assistant", linkedTaskId: taskRef.id, userId: user.uid,
        aiProcessed: false, createdAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  }, [input, sending, user, addToast]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      addToast("Voice input not supported in this browser.", "warning"); return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => { setInput((prev) => prev + " " + e.results[0][0].transcript); };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-700/50 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Zap size={15} className="text-amber-400 fill-amber-400/30" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-200">Tasky</h1>
          <p className="text-xs text-slate-500">Chat to capture tasks — AI extracts details automatically</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
        {loadingMsgs ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => (
            <div key={i} className={`flex ${i%2===0?'justify-end':'justify-start'}`}>
              <div className="h-10 w-48 rounded-2xl bg-slate-700/40 animate-pulse" />
            </div>
          ))}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <Zap size={24} className="text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Start capturing tasks</h3>
            <p className="text-xs text-slate-500 max-w-xs">Type anything — "remind me to call John tmr at 3pm" or "buy groceries, high priority". Tasky figures out the rest.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in-up`}>
              <div className={`max-w-[80%] md:max-w-[65%] ${msg.role === 'user' ? 'bg-amber-500/15 border-amber-500/20 text-slate-200' : 'bg-slate-800 border-slate-700/60 text-slate-300'} border rounded-2xl px-3.5 py-2.5`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={10} className="text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">Tasky</span>
                    {msg.aiProcessed === true && <span className="text-xs text-green-400 flex items-center gap-0.5"><CheckCircle2 size={10}/>Added to Tasker ✓</span>}
                    {msg.aiProcessed === false && <span className="text-xs text-amber-600 flex items-center gap-0.5"><AlertCircle size={10}/>Saved as raw</span>}
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
              <Loader2 size={13} className="text-amber-400 animate-spin" />
              <span className="text-xs text-slate-400">Tasky is thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-6 py-3 border-t border-slate-700/50 bg-slate-900/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a task… e.g. 'msg John on TG tmr about the meeting'"
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none max-h-32 transition-all"
            style={{ minHeight: '42px' }}
            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'; }}
          />
          <button onClick={toggleVoice} className={`p-2.5 rounded-xl border transition-colors ${listening ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-slate-800 border-slate-700/60 text-slate-500 hover:text-slate-300'}`} aria-label="Voice input">
            {listening ? <MicOff size={16}/> : <Mic size={16}/>}
          </button>
          <button onClick={handleSend} disabled={!input.trim() || sending} className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 rounded-xl transition-all" aria-label="Send">
            {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 ml-0.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
