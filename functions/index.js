const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ─── Get Gemini API key: user key → fallback to server key ───────────────────
async function getGeminiApiKey(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const userKey = userDoc.data()?.settings?.geminiApiKey;
    if (userKey) return userKey;
  } catch (e) {}
  return functions.config().gemini?.api_key || '';
}

// ─── Call Gemini REST API ────────────────────────────────────────────────────
async function callGemini(apiKey, systemPrompt, userPrompt, temperature = 0.7) {
  const { default: fetch } = await import('node-fetch');
  const model = 'gemini-2.5-flash-preview-05-20';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

// ─── Get user memory context ─────────────────────────────────────────────────
async function getMemoryContext(uid) {
  const snap = await db
    .collection('users').doc(uid).collection('memory')
    .orderBy('createdAt', 'asc').get();
  const entries = snap.docs.map((d) => d.data().content).filter(Boolean);
  return entries.length ? entries.join('\n') : '(No personal context set)';
}

// ─── Log error to Firestore ──────────────────────────────────────────────────
async function logError(uid, fn, err) {
  try {
    await db.collection('users').doc(uid).collection('errorLogs').add({
      function: fn,
      message: err.message || String(err),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (_) {}
}

// ─── processTaskyInput ───────────────────────────────────────────────────────
exports.processTaskyInput = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = context.auth.uid;
  const { rawInput, taskId } = data;
  if (!rawInput || !taskId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing rawInput or taskId.');
  }

  const apiKey = await getGeminiApiKey(uid);
  const memoryContext = await getMemoryContext(uid);

  const systemPrompt = `You are Tasky, a task extraction assistant. The user sends rough, casual messages about things they need to do. Extract tasks and return structured JSON.

Rules:
- Parse abbreviations intelligently. Check user context for personal abbreviations.
- Extract due dates, priorities, tags, recurring schedules, subtasks, reminders if mentioned.
- HIGH confidence: populate all fields. LOW confidence: set verbatim:true, copy rawInput to title.
- Never ask for clarification. Always return JSON.
- Current date/time: ${new Date().toISOString()}

Return ONLY valid JSON (no markdown fences):
{
  "verbatim": false,
  "title": "string",
  "description": "string or null",
  "priority": "low|medium|high|null",
  "tags": ["string"],
  "dueDate": "ISO 8601 or null",
  "recurringSchedule": "string or null",
  "subtasks": [{"title": "string"}],
  "reminder": "ISO 8601 or null",
  "taskyReply": "brief friendly confirmation message"
}`;

  let parsed = null;
  let taskyReply = 'Saved to Tasker as raw input — you can edit it directly.';

  try {
    const text = await callGemini(
      apiKey, systemPrompt,
      `User's personal context:\n${memoryContext}\n\nUser message: ${rawInput}`
    );
    const clean = text.trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    parsed = JSON.parse(clean);
    taskyReply = parsed.taskyReply || `Added to Tasker: ${parsed.title}`;
  } catch (err) {
    console.error('Gemini/parse failed:', err.message);
    await logError(uid, 'processTaskyInput', err);
  }

  const update = {
    aiProcessed: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (parsed) {
    update.title = parsed.title || rawInput;
    update.description = parsed.description || null;
    update.priority = parsed.priority || null;
    update.tags = parsed.tags || [];
    update.recurringSchedule = parsed.recurringSchedule || null;
    update.subtasks = (parsed.subtasks || []).map((s, i) => ({
      id: String(i), title: s.title, completed: false,
    }));
    try {
      update.dueDate = parsed.dueDate
        ? admin.firestore.Timestamp.fromDate(new Date(parsed.dueDate)) : null;
    } catch (_) { update.dueDate = null; }
    try {
      update.reminder = parsed.reminder
        ? admin.firestore.Timestamp.fromDate(new Date(parsed.reminder)) : null;
    } catch (_) { update.reminder = null; }
  } else {
    update.title = rawInput.substring(0, 120);
  }

  try {
    await db.collection('users').doc(uid).collection('tasks').doc(taskId).update(update);
  } catch (e) { console.error('Task update failed:', e.message); }

  await db.collection('users').doc(uid).collection('taskyChats').add({
    message: taskyReply,
    role: 'assistant',
    linkedTaskId: taskId,
    userId: uid,
    aiProcessed: !!parsed,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { title: update.title, taskyReply, aiProcessed: !!parsed };
});

// ─── processStormyInput ──────────────────────────────────────────────────────
exports.processStormyInput = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = context.auth.uid;
  const { rawInput, sessionId } = data;
  if (!rawInput || !sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing params.');
  }

  const apiKey = await getGeminiApiKey(uid);
  let title = 'Untitled Storm';

  try {
    const raw = await callGemini(
      apiKey,
      'Generate a very short (2-6 words), evocative title for this brainstorm. Return ONLY the title — no quotes, no punctuation at the end.',
      rawInput, 0.8
    );
    title = raw.trim().replace(/^["']|["']$/g, '').substring(0, 80);
  } catch (err) {
    console.error('Stormy title generation failed:', err.message);
    await logError(uid, 'processStormyInput', err);
  }

  try {
    await db.collection('users').doc(uid).collection('stormSessions').doc(sessionId).update({
      title,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) { console.error('Session update failed:', e.message); }

  const stormyReply = `Saved to Stormer as: ${title}`;

  await db.collection('users').doc(uid).collection('stormyChats').add({
    message: stormyReply,
    role: 'assistant',
    linkedSessionId: sessionId,
    userId: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { title, stormyReply };
});

// ─── expandStorm ─────────────────────────────────────────────────────────────
exports.expandStorm = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = context.auth.uid;
  const { sessionId, rawInput } = data;

  const apiKey = await getGeminiApiKey(uid);
  const memoryContext = await getMemoryContext(uid);

  const systemPrompt = `You are a creative thinking partner. Expand the user's rough idea into:
- Core concept and vision
- Actionable next steps (numbered)
- Related ideas and connections  
- Potential challenges and considerations
- Recommended resources or tools

If the idea is unclear, ask 1-2 clarifying questions first.
Use ## headers and bullet points. Be substantive, not generic.`;

  let expandedContent;
  try {
    expandedContent = await callGemini(
      apiKey, systemPrompt,
      `User context: ${memoryContext}\n\nIdea to expand: ${rawInput}`, 0.8
    );
  } catch (err) {
    await logError(uid, 'expandStorm', err);
    throw new functions.https.HttpsError('internal', 'Expansion failed: ' + err.message);
  }

  await db.collection('users').doc(uid).collection('stormSessions').doc(sessionId).update({
    expandedContent,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { expandedContent };
});

// ─── makeSenseStorm ──────────────────────────────────────────────────────────
exports.makeSenseStorm = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = context.auth.uid;
  const { sessionId, rawInput } = data;

  const apiKey = await getGeminiApiKey(uid);

  const systemPrompt = `Rewrite the user's rough idea as clear, concise, polished prose.
Rules: Preserve ALL original meaning. Do NOT add new ideas. Fix grammar and structure only. Return only the rewritten text — no intro, no commentary.`;

  let sensibleContent;
  try {
    sensibleContent = await callGemini(apiKey, systemPrompt, rawInput, 0.4);
  } catch (err) {
    await logError(uid, 'makeSenseStorm', err);
    throw new functions.https.HttpsError('internal', 'Rewrite failed: ' + err.message);
  }

  await db.collection('users').doc(uid).collection('stormSessions').doc(sessionId).update({
    sensibleContent,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { sensibleContent };
});

// ─── saveGeminiApiKey ────────────────────────────────────────────────────────
exports.saveGeminiApiKey = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = context.auth.uid;
  const { apiKey } = data;
  // Store in Firestore — key is never logged, never returned
  await db.collection('users').doc(uid).set(
    { settings: { geminiApiKey: apiKey || null } },
    { merge: true }
  );
  return { success: true };
});

// ─── deleteAllUserData ───────────────────────────────────────────────────────
exports.deleteAllUserData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = context.auth.uid;

  const subcollections = ['tasks', 'taskyChats', 'stormSessions', 'stormyChats', 'memory', 'fcmTokens', 'errorLogs'];

  for (const col of subcollections) {
    let snap = await db.collection('users').doc(uid).collection(col).limit(500).get();
    while (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      snap = await db.collection('users').doc(uid).collection(col).limit(500).get();
    }
  }

  await db.collection('users').doc(uid).delete();
  return { success: true };
});

// ─── checkReminders — Scheduled every 15 minutes ────────────────────────────
exports.checkReminders = functions.pubsub.schedule('every 15 minutes').onRun(async () => {
  const now = admin.firestore.Timestamp.now();
  const ago15 = admin.firestore.Timestamp.fromMillis(now.toMillis() - 15 * 60 * 1000);

  const snap = await db
    .collectionGroup('tasks')
    .where('status', '==', 'active')
    .where('reminder', '>=', ago15)
    .where('reminder', '<=', now)
    .get();

  for (const taskDoc of snap.docs) {
    const task = taskDoc.data();
    const uid = task.userId;
    if (!uid) continue;

    const tokens = await db
      .collection('users').doc(uid).collection('fcmTokens')
      .limit(5).get();

    for (const td of tokens.docs) {
      const token = td.data().token;
      if (!token) continue;
      try {
        await admin.messaging().send({
          token,
          notification: { title: '\u23f0 Tasky Reminder', body: task.title },
          webpush: { fcmOptions: { link: '/tasker' } },
        });
      } catch (err) {
        if (
          err.code?.includes('invalid-registration-token') ||
          err.code?.includes('registration-token-not-registered')
        ) {
          await td.ref.delete();
        }
      }
    }
  }

  return null;
});
