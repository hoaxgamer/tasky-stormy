# Tasky & Stormy

AI-powered personal productivity assistant. Capture tasks conversationally (Tasky), brainstorm ideas (Stormy), manage everything in Tasker/Stormer.

## Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Google account with Firebase project

## Step 1 — Create Firebase Project
1. https://console.firebase.google.com → Add project → name it `tasky-stormy`
2. Enable **Firestore** (production mode)
3. Enable **Authentication** → Google provider
4. Enable **Cloud Messaging** (FCM)

## Step 2 — Get Firebase Client Config
Firebase Console → Project Settings → Your Apps → Add Web App → copy the `firebaseConfig` object

## Step 3 — Configure Environment
```bash
cp .env.example .env
# Fill in all VITE_FIREBASE_* values from Step 2
```

## Step 4 — Set Gemini API Key (server-side ONLY, never in .env)
```bash
firebase login
firebase use --add   # select your project
firebase functions:config:set gemini.api_key="YOUR_GEMINI_KEY_HERE"
```
Get a free Gemini API key: https://aistudio.google.com/

## Step 5 — Update Project Files
1. **`.firebaserc`** — replace `"tasky-stormy"` with your actual Firebase project ID
2. **`public/firebase-messaging-sw.js`** — replace all `REPLACE_WITH_*` placeholders with your Firebase config

## Step 6 — Install Dependencies
```bash
npm install
cd functions && npm install && cd ..
```

## Step 7 — Deploy
```bash
# Full deploy (hosting + functions + firestore rules)
npm run deploy

# Or deploy only frontend to Firebase Hosting
npm run deploy:hosting

# Or deploy to Vercel (frontend only)
npm run build
# Then import the GitHub repo in Vercel dashboard
# Add all VITE_FIREBASE_* env vars in Vercel project settings
```

## Usage Guide
1. **Sign in** with Google
2. **Tasky** (`/`) — type tasks naturally: "remind me to call John tmr at 3pm high priority"
3. **Tasker** (`/tasker`) — view, filter, edit, complete tasks
4. **Stormy** (`/stormy`) — dump raw ideas: "app idea — gamified todo list with streaks"
5. **Stormer** (`/stormer`) — expand or polish your brainstorm ideas with AI
6. **Search** (`/search`) — find anything across tasks, storms, and chats
7. **Settings** (`/settings`) — add personal context, manage your Gemini API key, export data

## Data Export Format
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "user": { "uid": "...", "email": "user@example.com" },
  "tasks": [...],
  "taskyChats": [...],
  "stormSessions": [...],
  "stormyChats": [...],
  "memory": [...],
  "settings": { "notifications": { "inApp": true, "push": false, "email": false }, "theme": "dark" }
}
```

## Security Notes
- The Gemini API key is stored **only** in Firebase Functions config — never in the frontend
- All Cloud Functions verify Firebase Auth tokens before processing
- Firestore rules enforce per-user data isolation
- Users can optionally provide their own Gemini key in Settings (stored encrypted in Firestore)
