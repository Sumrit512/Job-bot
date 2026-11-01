# 🚀 Automatic Job Applier

A full-stack, automated job scraping and application platform powered by **Next.js**, **Convex**, and a local **Playwright / Node.js** automation agent.

---

## ⚡ Quick Start (One Command Run)

To run the entire system — **Convex Backend**, **Next.js Frontend**, and the **Automation Agent** — all from a single terminal:

```bash
npm run dev
```

*(or simply `npm start` or double-click `start.bat` on Windows)*

This unified runner will launch:
1. 📦 **Convex Backend** (`npx convex dev`) — Watches & syncs backend functions and database schema.
2. 🌐 **Next.js Frontend** (`npx next dev`) — Runs the dashboard at [http://localhost:3000](http://localhost:3000).
3. 🤖 **Automation Agent** (`node scripts/agent-listener.js`) — Listens for scrape/apply commands triggered from the dashboard.

Press **`Ctrl + C`** in your terminal at any time to cleanly stop all three services at once.

---

## ⚙️ Environment Configuration

Make sure you have a `.env.local` file in your root folder:

```env
# Convex backend deployment
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment-name.convex.site

# AI Resolver Key (Groq)
GROQ_API_KEY=your_groq_api_key

# Agent authorization key (generated from the dashboard)
AGENT_KEY=your_agent_key_here
```

> **Tip:** If you haven't generated an `AGENT_KEY` yet, start the app with `npm run dev`, visit `http://localhost:3000`, fill out your profile details and click **Save Profile**. Your Agent Key will be displayed on screen. Add it to `.env.local`, and the agent listener will automatically detect it!

---

## 🛠️ Individual Commands (Optional)

If you ever need to run components separately in different terminal windows:

| Command | Description |
|---|---|
| `npm run dev` | **Runs all services together (unified runner)** |
| `npm run dev:web` | Starts only the Next.js frontend |
| `npm run dev:convex` | Starts only the Convex dev server |
| `npm run dev:agent` | Starts only the background agent listener |
