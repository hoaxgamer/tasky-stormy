import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, db, initMessaging, VAPID_KEY } from "../firebase";
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { useAuth } from "../contexts/AuthContext";
import { useMemory } from "../hooks/useMemory";
import { useNotifications } from "../contexts/NotificationsContext";
import MemoryCard from "../components/MemoryCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { Eye, EyeOff, Plus, Save, Trash2, Download, Upload, Key, Bell, Database, User, Brain, X, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function Settings() {
  const { user, logout } = useAuth();
  const { entries, loading: memLoading, addEntry, updateEntry, deleteEntry } = useMemory();
  const { addToast } = useNotifications();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const [notifSettings, setNotifSettings] = useState({ inApp: true, push: false, email: false });
  const [emailAddr, setEmailAddr] = useState("");
  const [savingNotif, setSavingNotif] = useState(false);

  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [newMemory, setNewMemory] = useState("");
  const [addingMemory, setAddingMemory] = useState(false);

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Load user settings on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data();
        if (data?.settings) {
          setNotifSettings(data.settings.notifications || { inApp: true, push: false, email: false });
        }
      } catch (e) {}
    })();
  }, [user]);

  const handleSaveApiKey = async () => {
    setSavingKey(true);
    try {
      const fn = httpsCallable(functions, "saveGeminiApiKey");
      await fn({ apiKey: apiKey.trim() || null });
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
      addToast("API key saved securely.", "success");
    } catch (err) {
      addToast("Failed to save API key.", "error");
    } finally {
      setSavingKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setSavingKey(true);
    try {
      const fn = httpsCallable(functions, "saveGeminiApiKey");
      await fn({ apiKey: null });
      setApiKey("");
      addToast("API key removed.", "info");
    } catch (err) {
      addToast("Failed to remove key.", "error");
    } finally {
      setSavingKey(false);
    }
  };

  const handlePushToggle = async (enabled) => {
    if (enabled) {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { addToast("Notification permission denied.", "warning"); return; }
        const messaging = await initMessaging();
        if (messaging && VAPID_KEY) {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            await updateDoc(doc(db, "users", user.uid, "fcmTokens", token.slice(-20)), { token, createdAt: serverTimestamp() });
          }
        }
        setNotifSettings((p) => ({ ...p, push: true }));
        addToast("Push notifications enabled!", "success");
      } catch (err) {
        addToast("Push setup failed: " + err.message, "error");
      }
    } else {
      setNotifSettings((p) => ({ ...p, push: false }));
    }
    await saveNotifSettings({ ...notifSettings, push: enabled });
  };

  const saveNotifSettings = async (settings) => {
    setSavingNotif(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { "settings.notifications": settings });
    } catch (e) {} finally { setSavingNotif(false); }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;
    setAddingMemory(true);
    try {
      await addEntry(newMemory.trim());
      setNewMemory("");
      setShowMemoryModal(false);
      addToast("Memory entry added.", "success");
    } finally { setAddingMemory(false); }
  };

  const handleExport = async () => {
    addToast("Preparing export…", "info");
    try {
      const fetchCol = async (col) => {
        const snap = await getDocs(collection(db, "users", user.uid, col));
        return snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null, updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || null, completedAt: d.data().completedAt?.toDate?.()?.toISOString() || null, dueDate: d.data().dueDate?.toDate?.()?.toISOString() || null, reminder: d.data().reminder?.toDate?.()?.toISOString() || null }));
      };
      const [taskSnap, taskyChats, stormSessions, stormyChats, memory] = await Promise.all([
        fetchCol("tasks"), fetchCol("taskyChats"), fetchCol("stormSessions"), fetchCol("stormyChats"), fetchCol("memory")
      ]);
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userSnap.data();
      const exportData = {
        exportVersion: "1.0",
        exportedAt: new Date().toISOString(),
        user: { uid: user.uid, email: user.email },
        tasks: taskSnap,
        taskyChats,
        stormSessions,
        stormyChats,
        memory,
        settings: { notifications: userData?.settings?.notifications, theme: userData?.settings?.theme }
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasky-stormy-export-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("Data exported successfully!", "success");
    } catch (err) {
      addToast("Export failed: " + err.message, "error");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportProgress(0);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.exportVersion || !data.tasks) throw new Error("Invalid export file format.");
      const { writeBatch, doc: fbDoc, collection: fbCol, Timestamp } = await import("firebase/firestore");
      const toWrite = [
        ...data.tasks.map((t) => ({ col: "tasks", id: t.id, data: t })),
        ...data.taskyChats.map((c) => ({ col: "taskyChats", id: c.id, data: c })),
        ...(data.stormSessions || []).map((s) => ({ col: "stormSessions", id: s.id, data: s })),
        ...(data.stormyChats || []).map((c) => ({ col: "stormyChats", id: c.id, data: c })),
        ...(data.memory || []).map((m) => ({ col: "memory", id: m.id, data: m })),
      ];
      const CHUNK = 400;
      for (let i = 0; i < toWrite.length; i += CHUNK) {
        const batch = writeBatch(db);
        toWrite.slice(i, i + CHUNK).forEach(({ col, id, data: d }) => {
          const ref = fbDoc(db, "users", user.uid, col, id);
          batch.set(ref, { ...d, createdAt: d.createdAt ? Timestamp.fromDate(new Date(d.createdAt)) : null, updatedAt: d.updatedAt ? Timestamp.fromDate(new Date(d.updatedAt)) : null }, { merge: true });
        });
        await batch.commit();
        setImportProgress(Math.round(((i + CHUNK) / toWrite.length) * 100));
      }
      addToast(`Import complete — ${toWrite.length} documents restored.`, "success");
    } catch (err) {
      addToast("Import failed: " + err.message, "error");
    } finally {
      setImporting(false);
      setImportProgress(0);
      e.target.value = "";
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const fn = httpsCallable(functions, "deleteAllUserData");
      await fn({});
      addToast("All data deleted.", "info");
      setTimeout(() => logout(), 1500);
    } catch (err) {
      addToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingAll(false);
      setConfirmDeleteAll(false);
    }
  };

  const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-700/50">
        <Icon size={16} className="text-amber-400" />
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const Toggle = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${ checked ? "bg-amber-500" : "bg-slate-600" }`}
        style={{ height: "22px" }}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ checked ? "translate-x-5" : "translate-x-0.5" }`} />
      </button>
    </div>
  );

  const ic = "w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Settings</h1>

      {/* Account */}
      <Section title="Account" icon={User}>
        <div className="flex items-center gap-4">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full ring-2 ring-slate-600" />
            : <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center text-xl font-bold text-amber-400">{(user?.displayName||"U")[0].toUpperCase()}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-slate-100">{user?.displayName || "Unknown User"}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <p className="text-xs text-slate-600 mt-0.5">UID: {user?.uid}</p>
          </div>
          <button onClick={logout} className="px-4 py-2 border border-red-500/30 text-red-400 rounded-xl text-sm hover:bg-red-500/10 transition-colors">Sign out</button>
        </div>
      </Section>

      {/* API Key */}
      <Section title="API Configuration" icon={Key}>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">Enter your personal Gemini API key. If blank, the app uses the default shared key. Your key is stored encrypted and never returned to the browser.</p>
        <div className="relative mb-3">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy... (optional)"
            className={ic + " pr-10"}
          />
          <button onClick={() => setShowKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {showKey ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSaveApiKey} disabled={savingKey}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {savingKey ? <Loader2 size={13} className="animate-spin"/> : keySaved ? <CheckCircle2 size={13}/> : <Save size={13}/>}
            {keySaved ? "Saved!" : "Save Key"}
          </button>
          {apiKey && (
            <button onClick={handleRemoveApiKey} disabled={savingKey}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-600 text-slate-400 rounded-lg text-sm hover:bg-slate-700 transition-colors disabled:opacity-50">
              <X size={13}/>Remove
            </button>
          )}
        </div>
      </Section>

      {/* Memory */}
      <Section title="Memory (AI Context)" icon={Brain}>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">These entries are passed to the AI on every request, helping it understand your personal context, abbreviations, and preferences.</p>
        {memLoading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%] animate-shimmer" />)}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Brain size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No memory entries yet.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">{entries.map((e) => <MemoryCard key={e.id} entry={e} onUpdate={updateEntry} onDelete={deleteEntry} />)}</div>
        )}
        <button onClick={() => setShowMemoryModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-600 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 rounded-xl text-sm transition-colors">
          <Plus size={14}/>Add Memory Entry
        </button>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <div className="divide-y divide-slate-700/50">
          <Toggle checked={notifSettings.inApp} onChange={(v) => { setNotifSettings((p) => ({...p,inApp:v})); saveNotifSettings({...notifSettings,inApp:v}); }} label="In-App Notifications" description="Toast alerts inside the app" />
          <Toggle checked={notifSettings.push} onChange={handlePushToggle} label="Push Notifications" description="Browser push for task reminders" />
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div><p className="text-sm font-medium text-slate-200">Email Notifications</p><p className="text-xs text-slate-500 mt-0.5">Reminder emails (coming soon)</p></div>
              <input type="checkbox" checked={notifSettings.email} onChange={(e) => { setNotifSettings((p) => ({...p,email:e.target.checked})); }} className="w-4 h-4 rounded accent-amber-500" />
            </div>
            {notifSettings.email && <input type="email" value={emailAddr} onChange={(e) => setEmailAddr(e.target.value)} placeholder="your@email.com" className={ic} />}
          </div>
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management" icon={Database}>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
            <div>
              <p className="text-sm font-medium text-slate-200">Export All Data</p>
              <p className="text-xs text-slate-500">Download all tasks, storms, chats, and memory as JSON</p>
            </div>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors">
              <Download size={14}/>Export
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
            <div>
              <p className="text-sm font-medium text-slate-200">Import / Restore Data</p>
              <p className="text-xs text-slate-500">Restore from a .json export file</p>
              {importing && (
                <div className="mt-1.5 w-32 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${importProgress}%` }} />
                </div>
              )}
            </div>
            <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${ importing ? "bg-slate-700 text-slate-500 pointer-events-none" : "bg-slate-700 hover:bg-slate-600 text-slate-300" }`}>
              {importing ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
              Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-400">Delete All Data</p>
              <p className="text-xs text-slate-500">Permanently delete all your data. Cannot be undone.</p>
            </div>
            <button onClick={() => setConfirmDeleteAll(true)} disabled={deletingAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-sm transition-colors disabled:opacity-50">
              {deletingAll ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
              Delete All
            </button>
          </div>
        </div>
      </Section>

      {/* Memory modal */}
      {showMemoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMemoryModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-modal w-full max-w-md animate-bounce-in p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100">Add Memory Entry</h3>
              <button onClick={() => setShowMemoryModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18}/></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Write free-form context the AI should always remember about you. E.g. "TG means Telegram for me.", "I prefer concise task titles."</p>
            <textarea value={newMemory} onChange={(e) => setNewMemory(e.target.value)} rows={4}
              placeholder="I am a software engineer. TG refers to Telegram for me."
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowMemoryModal(false)} className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors">Cancel</button>
              <button onClick={handleAddMemory} disabled={!newMemory.trim() || addingMemory}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-lg text-sm font-semibold transition-colors">
                {addingMemory ? "Saving…" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteAll}
        title="Delete All Data"
        message="This will permanently delete all your tasks, storms, memory, chats, and settings. This cannot be undone."
        confirmLabel={deletingAll ? "Deleting…" : "Delete Everything"}
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
      />
    </div>
  );
}
