# 🚀 Automatic Job Applier

A full-stack, automated job scraping and application platform powered by **Next.js**, **Convex**, and a local **Playwright / Node.js** automation agent.

---

## ⚡ Zero-Touch Setup & Run (One Command)

Just run:

```bash
npm run dev
```

*(or simply `npm start`, `node start.js`, or double-click `start.bat` on Windows)*

---

## 🧠 ChatGPT Web Automation (No APIs)

This system communicates directly with ChatGPT via browser automation on **[https://chatgpt.com](https://chatgpt.com)** using your persistent browser session:

1. **🎯 Strict Resume Match Rating (> 90 Score Required):**
   - For every scanned job, the agent visits the job posting, extracts the requirements, and asks ChatGPT to rate your resume on a scale of **0 to 100**.
   - If the score is **above 90**, the agent proceeds to apply.
   - If the score is **90 or below**, the agent skips the job and records the rating reason in the dashboard.

2. **💬 Direct & Straightforward Form Q&A:**
   - **Basic Personal Information** (Name, Phone, Email, Address, Links, Current Role) is filled directly from your profile.
   - **Non-Basic & Screening Questions** (Years of experience in specific frameworks, behavioral questions, custom dropdowns, radio choices) are sent to ChatGPT on the website.
   - ChatGPT is instructed to provide a direct, straightforward answer with zero conversational filler.
   - The agent automatically pastes or selects that answer into the form.

3. **💾 Automatic User Data Persistence:**
   - All profile changes in the dashboard are auto-saved to Convex as you type.
   - All answers selected or generated during job applications are saved into Convex database (`saved_answers`), keeping your profile context continually up-to-date.

---

## 🛠️ Individual Commands (Optional)

If you ever want to run services separately:

| Command | Description |
|---|---|
| `npm run dev` | **Runs all services together (zero-touch runner)** |
| `npm run dev:web` | Starts only the Next.js frontend |
| `npm run dev:convex` | Starts only the Convex dev server |
| `npm run dev:agent` | Starts only the background agent listener |
