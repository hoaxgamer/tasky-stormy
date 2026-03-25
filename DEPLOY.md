# Vercel Deployment Guide

This project is set up for automatic Vercel deployment via GitHub Actions.

## One-Time Setup

### Step 1 — Create Vercel Project

```bash
npm install -g vercel
vercel login
vercel link   # links this directory to a Vercel project, creates .vercel/project.json
```

This creates the Vercel project and generates a `.vercel/project.json` with your `projectId` and `orgId`.

### Step 2 — Get Your Vercel Token

1. Go to https://vercel.com/account/tokens
2. Create a new token named `tasky-stormy-deploy`
3. Copy the token value

### Step 3 — Add GitHub Secrets

Go to https://github.com/hoaxgamer/tasky-stormy/settings/secrets/actions and add:

| Secret | Value | Where to find |
|---|---|---|
| `VERCEL_TOKEN` | Your Vercel API token | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` | After `vercel link` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` | After `vercel link` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | Firebase Console → Project Settings |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Firebase Console |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID | Firebase Console |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | Firebase Console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID number | Firebase Console |
| `VITE_FIREBASE_APP_ID` | App ID | Firebase Console |
| `VITE_FIREBASE_VAPID_KEY` | VAPID key for FCM push | Firebase Console → Cloud Messaging |

### Step 4 — Add Vercel Env Vars

In the Vercel dashboard for this project, add the same `VITE_FIREBASE_*` variables under Settings → Environment Variables.

### Step 5 — Push to Deploy

Every push to `main` automatically:
1. Installs dependencies
2. Builds with Vite (`npm run build`)
3. Deploys to Vercel production

Pull requests get preview deployments.

## Manual Instant Deploy

If you want to deploy right now without waiting for the CI pipeline:

```bash
npm install
vercel --prod
```
