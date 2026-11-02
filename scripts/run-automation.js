const { ConvexHttpClient } = require("convex/browser");
const { 
  scrapeLinkedIn, 
  scrapeNaukri, 
  scrapeIndeed, 
  scrapeInternshala 
} = require("./scraper");
require("dotenv").config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function runAutomation(agentKeyInput) {
  const agentKey = agentKeyInput || process.env.AGENT_KEY;
  if (!agentKey) {
    console.error("❌ No agentKey provided for automation.");
    return;
  }

  console.log("🚀 Starting Multi-Platform Automation...");

  // 1. Fetch Preferences from Convex
  const prefs = await client.query("preferences:getPreferences", { agentKey });

  if (!prefs) {
    console.error("❌ No preferences found in Convex. Please save your profile in the web app first.");
    return;
  }

  const role = prefs.role || "Frontend Developer";
  const location = prefs.location || "Remote";
  
  console.log(`✅ Loaded preferences for: ${role} in ${location}`);

  // 2. Determine target portals from user preferences
  const selectedPortals = (prefs.targetPortals && prefs.targetPortals.length > 0)
    ? prefs.targetPortals.map(p => p.toLowerCase())
    : ["linkedin", "internshala", "naukri"];

  console.log(`🎯 Active Target Portals: ${selectedPortals.join(", ")}`);

  const allAvailablePlatforms = [
    { name: "LinkedIn", key: "linkedin", scraper: scrapeLinkedIn },
    { name: "Internshala", key: "internshala", scraper: scrapeInternshala },
    { name: "Naukri", key: "naukri", scraper: scrapeNaukri },
    { name: "Indeed", key: "indeed", scraper: scrapeIndeed }
  ];

  const platforms = allAvailablePlatforms.filter(p => selectedPortals.includes(p.key));

  if (platforms.length === 0) {
    console.warn("⚠️ No valid target platforms selected. Defaulting to LinkedIn and Internshala.");
    platforms.push(
      { name: "LinkedIn", key: "linkedin", scraper: scrapeLinkedIn },
      { name: "Internshala", key: "internshala", scraper: scrapeInternshala }
    );
  }

  let allJobs = [];

  for (const platform of platforms) {
    try {
      console.log(`\n--- Scraping ${platform.name} ---`);
      const platformJobs = await platform.scraper(role, location);
      allJobs.push(...platformJobs);
      // Give Windows OS time to release file lock on .user_data before next platform
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`❌ Failed to scrape ${platform.name}:`, e.message);
    }
  }

  if (allJobs.length === 0) {
    console.log("⚠️ No new jobs found on any platform.");
    return;
  }

  // 3. Save Jobs to Convex
  console.log(`\n📥 Saving ${allJobs.length} total scanned jobs to Convex...`);
  let newCount = 0;
  let existingCount = 0;
  
  for (const job of allJobs) {
    try {
      const result = await client.mutation("jobs:addJob", {
        agentKey,
        title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        url: job.url
      });
      
      if (result.isNew) {
        newCount++;
      } else {
        existingCount++;
      }
    } catch (e) {
      console.error(`❌ Error saving job from ${job.source}: ${e.message}`);
    }
  }

  console.log(`\n✨ Automation run complete!`);
  console.log(`📊 Results:`);
  console.log(`   - Total Scanned: ${allJobs.length}`);
  console.log(`   - New Jobs Added: ${newCount}`);
  console.log(`   - Already in Database: ${existingCount}`);
}

module.exports = { runAutomation };

if (require.main === module) {
  runAutomation().catch(console.error);
}



