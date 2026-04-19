const { ConvexHttpClient } = require("convex/browser");
require("dotenv").config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
  const allPrefs = await client.query("preferences:getPreferences");
  if (allPrefs.length === 0) {
    console.log("No preferences found.");
    return;
  }
  const prefs = allPrefs[0];
  const { _id, _creationTime, resumeUrl, resumeStorageId, ...rest } = prefs;
  
  await client.mutation("preferences:savePreferences", {
    ...rest,
    experience: "mid",
    yearsOfExperience: 3
  });
  console.log("✅ Preferences updated to 3 years of experience!");
}

main().catch(console.error);
