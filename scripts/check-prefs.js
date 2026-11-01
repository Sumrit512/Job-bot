const { ConvexHttpClient } = require("convex/browser");
require("dotenv").config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function checkPrefs() {
  const agentKey = process.env.AGENT_KEY;
  const res = await client.query("preferences:getPreferences", { agentKey });
  const prefs = Array.isArray(res) ? res[0] : res || {};
  console.log("📊 Current Preferences:");
  console.log("- Role:", prefs.role || "Not set");
  console.log("- Years of Exp:", prefs.yearsOfExperience || "Not set");
  console.log("- Resume Text Present:", !!prefs.resumeText);
  if (prefs.resumeText) {
      console.log("- Resume Snippet:", prefs.resumeText.substring(0, 100) + "...");
  }
}

checkPrefs();
