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
6. **💾 Real-Time Auto-Save:** Automatically persists your form data to Convex as you type, and immediately before triggering job search or applications.
7. **🎯 AI Resume Match Rating (> 90% Threshold):**
   - Every job role & description is passed to ChatGPT / AI to evaluate your resume match score (0-100).
   - If the score is **above 90**, the agent proceeds with applying.
   - If the score is **below 90**, the agent skips the job with a clear reason in the logs and dashboard.
8. **🧠 AI Form Question Answering:**
   - **Basic Personal Info** (Name, Phone, Email, Location, LinkedIn/GitHub/Portfolio) is filled directly from your profile.
   - **Every other question** (technical, situational, behavioral, dropdown options, radio buttons, checkboxes, recruiter questionnaires) is routed to ChatGPT / AI to select or generate the best tailored response.
9. **🚀 Runs All Services Concurrently:**
   - Convex Backend (`npx convex dev`)
   - Next.js Dashboard (`npx next dev`)
   - Automation Agent Listener (`node scripts/agent-listener.js`)
10. **✨ Auto-Opens Your Browser:** As soon as the dashboard is ready, it automatically opens [http://localhost:3000](http://localhost:3000) in your default browser!

Press **`Ctrl + C`** in your terminal at any time to cleanly stop all three services at once.

---

## ⚙️ Environment Variables

The project supports both OpenAI ChatGPT and Groq:

```env
# Convex backend deployment
CONVEX_DEPLOYMENT=dev:groovy-firefly-266
NEXT_PUBLIC_CONVEX_URL=https://groovy-firefly-266.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://groovy-firefly-266.convex.site

# OpenAI ChatGPT API Key (Optional - if provided, ChatGPT is used for scoring & answers)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Groq API Key (Pre-configured high-speed fallback / default)
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
