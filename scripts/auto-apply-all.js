const { ConvexHttpClient } = require("convex/browser");
const { autoApply, checkAllLogins } = require("./apply-logic");
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

  // 2. Fetch Preferences and Resume URL
  const prefs = await client.query("preferences:getPreferences", { agentKey });
  if (!prefs) {
    console.error("❌ No preferences found in Convex. Please save your profile in the web app first.");
    return;
  }

  const resumeUrl = await client.query("files:getResumeUrl", { agentKey });
  if (!resumeUrl) {
    console.error("❌ No resume found in Convex. Please upload your resume on the dashboard first.");
    return;
  }


  const resumePath = "./resume.txt";
  console.log("📂 Downloading your resume from the cloud...");
  
  const fs = require('fs');
  const https = require('https');
  const file = fs.createWriteStream(resumePath);
  await new Promise((resolve, reject) => {
    https.get(resumeUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(resumePath); reject(err); });
  });

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
      console.log(`\n--- Processing: ${job.title} at ${job.company} ---`);
      
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
        // Mark as "applying"
        await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "applying" });

        const success = await autoApply(page, job.url, resumePath, prefs);


        if (success) {
          await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "applied" });
          console.log(`✅ Successfully applied to ${job.title}`);
        } else {
          await client.mutation("jobs:updateJobStatus", { agentKey, id: job._id, status: "skipped" });
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



