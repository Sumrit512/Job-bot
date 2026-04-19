const { ConvexHttpClient } = require("convex/browser");
require("dotenv").config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function checkPrefs() {
  const allPrefs = await client.query("preferences:getPreferences");
  const prefs = allPrefs[0] || {};
  console.log("📊 Current Preferences:");
  console.log("- Role:", prefs.role);
  console.log("- Years of Exp:", prefs.yearsOfExperience);
  console.log("- Resume Text Present:", !!prefs.resumeText);
  if (prefs.resumeText) {
      console.log("- Resume Snippet:", prefs.resumeText.substring(0, 100) + "...");
  }
}

checkPrefs();
