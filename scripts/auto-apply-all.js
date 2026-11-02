const { ConvexHttpClient } = require("convex/browser");
const { autoApply, checkAllLogins } = require("./apply-logic");
const { ChatGPTController } = require("./chatgpt-browser");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { chromium } = require("playwright");
require("dotenv").config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function applyToAllPending(agentKeyInput) {
  const agentKey = agentKeyInput || process.env.AGENT_KEY;
  if (!agentKey) {
    console.error("❌ No agentKey provided for auto-apply.");
    return;
  }

  console.log("🤖 Starting Auto-Apply process...");

  // 1. Fetch Preferences first to know user's selected portals
  const prefs = await client.query("preferences:getPreferences", { agentKey });
  if (!prefs) {
    console.error("❌ No preferences found in Convex. Please save your profile in the web app first.");
    return;
  }

  // 2. Fetch pending jobs from Convex
  const jobs = await client.query("jobs:listJobs", { agentKey });
  const pendingJobs = jobs.filter(j => j.status === "pending");

  if (pendingJobs.length === 0) {
    console.log("✅ No pending jobs in database.");
    return;
  }

  // 3. Strictly filter jobs by user's selected portals
  const targetPortals = (prefs.targetPortals && prefs.targetPortals.length > 0)
    ? prefs.targetPortals.map(p => p.toLowerCase().trim())
    : ["linkedin", "internshala", "naukri"];

  console.log(`🎯 User-Selected Target Portals: [${targetPortals.join(", ")}]`);

  function isJobMatchingSelectedPortals(job) {
    const src = (job.source || "").toLowerCase().trim();
    const url = (job.url || "").toLowerCase().trim();
    return targetPortals.some(p => src.includes(p) || url.includes(p));
  }

  const jobsToApply = pendingJobs.filter(isJobMatchingSelectedPortals);
  console.log(`📝 Found ${jobsToApply.length} pending jobs matching your selected portals (out of ${pendingJobs.length} total pending). Starting applications...`);

  if (jobsToApply.length === 0) {
    console.log(`✅ No pending jobs match your selected portal(s) [${targetPortals.join(", ")}].`);
    return;
  }

  const resumeUrl = await client.query("files:getResumeUrl", { agentKey });
  const resumePath = "./resume.txt";

  if (resumeUrl) {
    console.log("📂 Downloading your resume from the cloud...");
    const file = fs.createWriteStream(resumePath);
    await new Promise((resolve, reject) => {
      https.get(resumeUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => { fs.unlink(resumePath); reject(err); });
    });
  }

  const userDataDir = path.join(__dirname, "../.user_data");
  let context = null;
  let page = null;
  let chatgpt = null;

  async function closeBrowser() {
    if (context) {
      try {
        await context.close();
      } catch (e) {}
      context = null;
      page = null;
      chatgpt = null;
    }
    // Give Windows OS time to release file locks on .user_data
    await new Promise(r => setTimeout(r, 1200));
  }

  async function startBrowser() {
    await closeBrowser();

    // Clean up stale lock files from previous crashes if any
    try {
      const lockFile = path.join(userDataDir, "SingletonLock");
      const socketFile = path.join(userDataDir, "SingletonSocket");
      const cookieFile = path.join(userDataDir, "SingletonCookie");
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
      if (fs.existsSync(socketFile)) fs.unlinkSync(socketFile);
      if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
    } catch (e) {}

    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage"
      ],
      ignoreDefaultArgs: ["--enable-automation"]
    });

    // Reuse default page instead of opening extra blank tabs
    const pages = context.pages();
    page = pages.length > 0 ? pages[0] : await context.newPage();

    // Anti-automation detection evasion
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    chatgpt = new ChatGPTController(context);
    await chatgpt.init().catch(err => {
      console.warn("ℹ️ ChatGPT initialization notice:", err.message);
    });
  }

  await startBrowser();

  // 3. Login Check strictly for user's selected portals
  try {
    await checkAllLogins(page, targetPortals);
  } catch (e) {
    console.error("⚠️ Login check notice:", e.message);
  }

  try {
    for (const job of jobsToApply) {
      console.log(`\n============================================================`);
      console.log(`💼 Processing: ${job.title} at ${job.company}`);
      console.log(`============================================================`);
      
      // Ensure browser is still alive
      const isAlive = context && page && !page.isClosed();
      if (!isAlive) {
        console.log("🔄 Browser was closed or lost. Safely re-opening...");
        try {
          await startBrowser();
        } catch (e) {
          console.error("⚠️ Retrying browser launch in 2s:", e.message);
          await new Promise(r => setTimeout(r, 2000));
          await startBrowser();
        }
      }

      try {
        // Step 1: Open the job page to extract details and verify validity
        await page.bringToFront();
        await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(2500);

        const jobDescription = await page.evaluate(() => {
          const descEl = document.querySelector('.jobs-description__content, .jobs-box__html-content, #job-details, .job-desc-section, .styles_job-desc-container__pv_8h, section.job-desc, .internship_details, .job_description, article');
          return descEl ? descEl.innerText.substring(0, 3000) : "";
        });

        // Step 2: Ask ChatGPT Web to rate resume & user profile against this job role
        console.log(`⚖️  Rating resume and profile match with ChatGPT...`);
        const rating = await chatgpt.rateResume({
          title: job.title,
          company: job.company,
          location: job.location,
          description: jobDescription
        }, prefs);

        console.log(`📊 Rating Result: Score = ${rating.score}/100`);
        console.log(`📝 Reason: ${rating.explanation}`);

        // Step 3: Check score threshold (> 90 required to apply)
        if (rating.score <= 90) {
          console.log(`⏭️  Resume match score (${rating.score}/100) is <= 90. SKIPPING application.`);
          await client.mutation("jobs:updateJobStatus", {
            agentKey,
            id: job._id,
            status: "skipped",
            error: `ChatGPT Match Score: ${rating.score}/100 (Threshold > 90 required). ${rating.explanation}`
          });
          continue;
        }

        console.log(`🎯 Match score (${rating.score}/100) is ABOVE 90! Proceeding to auto-apply...`);
        await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "applying" });

        // Step 4: Run auto-apply with ChatGPT answering non-basic questions
        await page.bringToFront();
        const success = await autoApply(page, job.url, resumePath, prefs, chatgpt, job, client, agentKey);

        if (success) {
          await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "applied" });
          console.log(`✅ Successfully applied to ${job.title}!`);
        } else {
          await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "skipped" });
          console.log(`ℹ️  Skipped ${job.title}`);
        }
      } catch (e) {
        console.error(`❌ Failed processing ${job.title}:`, e.message);
        await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "failed", error: e.message });
        
        if (e.message.includes('browser has been closed') || e.message.includes('Target closed') || e.message.includes('context or browser has been closed')) {
           console.log("⚠️ Browser session closed. Resetting context reference...");
           await closeBrowser();
        }
      }
    }
  } finally {
    await closeBrowser();
  }

  console.log("\n✨ All pending applications processed!");
}

module.exports = { applyToAllPending };

if (require.main === module) {
  applyToAllPending().catch(console.error);
}
