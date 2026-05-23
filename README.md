# TradeHub Pro

Professional real-time Forex, Crypto, Gold, and Silver trading platform built with Next.js App Router, TypeScript, Tailwind CSS, Firebase, Zustand, React Query, Framer Motion, React Hook Form, Zod, and TradingView Lightweight Charts.

## Core Stack

- Next.js App Router
- TypeScript + Tailwind CSS
- Firebase Auth + Firestore + Storage
- Zustand + React Query
- React Hook Form + Zod
- Framer Motion
- Lightweight Charts

## Architecture (No Traditional Backend)

- **Shared polling model:** One admin poller acquires a Firestore lock at `system/marketPoller`.
- **Polling frequency:** Every 5 seconds (`POLL_INTERVAL_MS`).
- **Write once:** Poller writes merged quotes to `marketPrices/latest`.
- **Fan-out realtime:** All users subscribe via Firestore `onSnapshot`.
- **Result:** Minimal third-party API calls for up to 100 concurrent users.

### Data Sources (Free APIs only)

- Crypto: CoinGecko API
- Forex: exchangerate.host (with free fallback source)
- Metals: metals.live (with mock fallback)
- All values are converted and displayed in INR ₹.

## Features

- Email/password + Google auth
- Persistent auth session
- Protected app routes and admin-only `/admin`
- Live market cards and candlestick chart
- Buy/sell trades with close and history
- Wallet with balance, locked margin, transaction history
- Deposit requests with screenshot upload
- Withdrawal requests with admin approvals
- Admin panel for users, wallets, prices, approvals, and trade actions

## Pages

- `/` Home
- `/login` Login
- `/signup` Signup
- `/dashboard` Dashboard
- `/markets` Markets
- `/trading` Trading
- `/trades` Trades
- `/wallet` Wallet
- `/deposit` Deposit
- `/withdraw` Withdraw
- `/profile` Profile
- `/settings` Settings
- `/admin` Admin panel

## Folder Structure

- `src/app` – Pages and routes
- `src/components` – UI, layout, guards
- `src/services` – Firebase market/trading/wallet/admin services
- `src/hooks` – Realtime and mutation hooks
- `src/store` – Zustand state
- `src/utils` – Helpers/constants
- `src/types` – Shared TypeScript models
- `src/firebase` – Firebase client config and storage helper
- `src/charts` – Lightweight charts integration

## Setup

1. Install deps:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Fill Firebase and API keys in `.env.local`.

4. Enable Firebase Auth providers:
	- Email/Password
	- Google

5. Set admin role after signup:
	- In Firestore `users/{uid}`, set `role` to `"admin"`.
	- Admin user runs shared market polling for all users.

6. Run dev server:

```bash
npm run dev
```

7. Open `http://localhost:3000`.

## Firebase Configuration

- Firestore rules: `firestore.rules`
- Storage rules: `storage.rules`
- Firebase config mapping: `firebase.json`

Collections used:

- `users`
- `wallets`
- `trades`
- `deposits`
- `withdrawals`
- `transactions`
- `marketPrices`
- `notifications`

Deploy rules with Firebase CLI:

```bash
firebase deploy --only firestore:rules,storage
```

## Production Notes

- Mark admin users by setting `users/{uid}.role = "admin"` in Firestore.
- Keep at least one admin session active for client-side shared poller operation.
- Deploy to Vercel with all `NEXT_PUBLIC_*` env vars configured.

## Build

```bash
npm run build
```
