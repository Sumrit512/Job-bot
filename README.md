# 🚀 Automatic Job Applier

A full-stack, automated job scraping and application platform powered by **Next.js**, **Convex**, and a local **Playwright / Node.js** automation agent.

---

## ⚡ Zero-Touch Setup & Run (One Command)

Just run:

```bash
npm run dev
```

*(or simply `npm start`, `node start.js`, or double-click `start.bat` on Windows)*

### 🤖 What it does automatically for you:
1. **📦 Auto-Installs Dependencies:** Detects if `node_modules` is missing and runs `npm install`.
2. **📝 Auto-Configures Environment:** Creates `.env.local` from `.env.example` if not found.
3. **🌐 Auto-Installs Playwright Browser:** Ensures Chromium is installed so scrapers won't fail.
4. **🔑 Auto-Generates Agent Key:** Generates your multi-tenant `AGENT_KEY` directly from Convex and writes it into `.env.local`.
5. **📋 Auto-Seeds Your Profile:** If your Convex profile is empty, it automatically parses your `resume.txt` and seeds your name, contact, role, and experience into the database.
6. **🚀 Runs All Services Concurrently:**
   - Convex Backend (`npx convex dev`)
   - Next.js Dashboard (`npx next dev`)
   - Automation Agent Listener (`node scripts/agent-listener.js`)
7. **✨ Opens Your Browser:** As soon as the dashboard is ready, it automatically opens `http://localhost:3000` in your default browser!

Press **`Ctrl + C`** in your terminal at any time to cleanly stop all three services at once.

---

## ⚙️ Environment Variables (Optional Customization)

The project ships with `.env.example`. A `.env.local` file is created automatically on first run:

```env
# Convex backend deployment
CONVEX_DEPLOYMENT=dev:groovy-firefly-266
NEXT_PUBLIC_CONVEX_URL=https://groovy-firefly-266.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://groovy-firefly-266.convex.site

# AI Resolver Key (Groq)
GROQ_API_KEY=your_groq_api_key

# Agent authorization key (auto-generated)
AGENT_KEY=ak_...
```

---

## 🛠️ Individual Commands (Optional)

If you ever want to run services separately:

| Command | Description |
|---|---|
| `npm run dev` | **Runs all services together (zero-touch runner)** |
| `npm run dev:web` | Starts only the Next.js frontend |
| `npm run dev:convex` | Starts only the Convex dev server |
| `npm run dev:agent` | Starts only the background agent listener |
