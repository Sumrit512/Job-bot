const { ConvexHttpClient } = require("convex/browser");
const { autoApply, checkAllLogins } = require("./apply-logic");
const { rateResumeMatch } = require("./ai-resolver");
require("dotenv").config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function applyToAllPending(agentKeyInput) {
  const agentKey = agentKeyInput || process.env.AGENT_KEY;
  if (!agentKey) {
    console.error("❌ No agentKey provided for auto-apply.");
    return;
  }

  console.log("🤖 Starting Auto-Apply process...");

  // 1. Fetch pending jobs from Convex
  const jobs = await client.query("jobs:listJobs", { agentKey });
  const pendingJobs = jobs.filter(j => j.status === "pending");

  if (pendingJobs.length === 0) {
    console.log("✅ No pending jobs to apply for.");
    return;
  }

  console.log(`📝 Found ${pendingJobs.length} pending jobs. Starting applications...`);

  // 2. Fetch Preferences and Resume
  const prefs = await client.query("preferences:getPreferences", { agentKey });
  if (!prefs) {
    console.error("❌ No preferences found in Convex. Please save your profile in the web app first.");
    return;
  }

  const resumePath = "./resume.txt";

  const { chromium } = require("playwright");
  const path = require("path");
  const userDataDir = path.join(__dirname, "../.user_data");

  let context, page;

  async function startBrowser() {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: ["--disable-blink-features=AutomationControlled"]
    });
    page = await context.newPage();
  }

  await startBrowser();

  // 3. Global Login Check
  try {
    await checkAllLogins(page);
  } catch (e) {
    console.error("⚠️ Global login check failed. Proceeding with caution...");
  }

  try {
    for (const job of pendingJobs) {
      console.log(`\n============================================================`);
      console.log(`🔍 Evaluating: "${job.title}" at "${job.company}"`);
      console.log(`   URL: ${job.url}`);
      console.log(`============================================================`);

      // Ensure browser is still open
      try {
        if (!context || !page || page.isClosed()) {
          console.log("🔄 Browser was closed. Re-opening...");
          await startBrowser();
        }
      } catch (e) {
        console.log("🔄 Browser error. Re-starting session...");
        await startBrowser();
      }

      try {
        // Pre-fetch job page to extract detailed job description for AI evaluation
        let jobDescription = "";
        try {
          await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 25000 });
          await page.waitForTimeout(2000);
          jobDescription = await page.evaluate(() => {
            const el = document.querySelector('.job-desc, .description, #job-details, .styles_job-desc-container__txpYf, .job-details, article, main');
            return el ? el.innerText.substring(0, 3500) : document.body.innerText.substring(0, 2500);
          });
        } catch (navErr) {
          console.log(`⚠️ Note: Could not pre-fetch full page text (${navErr.message}). Using job title & company.`);
        }

        // 4. ASK CHATGPT / AI TO RATE RESUME MATCH
        console.log(`🤖 Passing job role to ChatGPT to rate resume fit...`);
        const rating = await rateResumeMatch(job.title, job.company, jobDescription, prefs);
        console.log(`📊 ChatGPT Match Rating: ${rating.score}/100`);
        console.log(`💬 Explanation: "${rating.reason}"`);

        // 5. THRESHOLD CHECK (> 90%)
        if (rating.score < 90) {
          console.log(`⏭️  Score ${rating.score}/100 is below the 90% threshold. Skipping application.`);
          await client.mutation("jobs:updateJobStatus", {
            agentKey,
            id: job._id,
            status: "skipped",
            error: `Match Score: ${rating.score}/100 (< 90 threshold). ${rating.reason}`
          });
          continue; // Move to next job
        }

        console.log(`🎯 Score ${rating.score}/100 exceeds 90% threshold! Proceeding to auto-apply...`);

        // Mark as "applying"
        await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "applying" });

        const success = await autoApply(page, job.url, resumePath, prefs);

        if (success) {
          await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "applied" });
          console.log(`✅ Successfully applied to ${job.title} at ${job.company}!`);
        } else {
          await client.mutation("jobs:updateJobStatus", {
            agentKey,
            id: job._id,
            status: "skipped",
            error: "Application process skipped or could not complete Easy Apply."
          });
          console.log(`ℹ️  Skipped ${job.title}`);
        }
      } catch (e) {
        console.error(`❌ Failed to apply to ${job.title}:`, e.message);
        await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "failed", error: e.message });

        if (e.message.includes('browser has been closed') || e.message.includes('Target closed') || e.message.includes('context or browser has been closed')) {
          console.log("⚠️ Browser session lost. Resetting context...");
          context = null;
          page = null;
        }
      }
    }
  } finally {
    if (context) await context.close();
  }

  console.log("\n✨ All pending applications processed!");
}

module.exports = { applyToAllPending };

if (require.main === module) {
  applyToAllPending().catch(console.error);
}
