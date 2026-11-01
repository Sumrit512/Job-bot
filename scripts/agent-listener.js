const { ConvexHttpClient } = require("convex/browser");
require("dotenv").config({ path: ".env.local" });
const { runAutomation } = require("./run-automation");
const { applyToAllPending } = require("./auto-apply-all");

let agentKey = process.env.AGENT_KEY;
let client = null;
let isBusy = false;

function initClient() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  }
}

function refreshEnv() {
  try {
    require("dotenv").config({ path: ".env.local", override: true });
    agentKey = process.env.AGENT_KEY;
    if (!client && process.env.NEXT_PUBLIC_CONVEX_URL) {
      initClient();
    }
  } catch (e) {}
}

async function pollForCommands() {
  if (isBusy) return;

  if (!agentKey) {
    refreshEnv();
    if (!agentKey) {
      return; // Still waiting for key to be populated
    }
    console.log(`✅ AGENT_KEY detected (${agentKey.substring(0, 6)}...). Connecting agent listener...`);
  }

  if (!client) {
    initClient();
    if (!client) return;
  }

  try {
    const status = await client.query("agent:getStatus", { agentKey });
    
    if (status && status.command !== "idle") {
      const cmd = status.command;
      isBusy = true;
      console.log(`\n🔔 UI Triggered: ${cmd.toUpperCase()}`);
      
      // Clear the command first so we don't repeat it
      await client.mutation("agent:clearCommand", { agentKey });

      if (cmd === "scrape") {
        await runAutomation(agentKey);
      } else if (cmd === "apply") {
        await applyToAllPending(agentKey);
      }
      
      console.log("💤 Task completed. Back to idle.");
      isBusy = false;
    }
  } catch (e) {
    console.error("Agent polling error:", e.message);
  }
}

// Initial status message
if (agentKey) {
  initClient();
  console.log(`👂 Agent listening for commands (Key: ${agentKey.substring(0, 6)}...)`);
} else {
  console.log("⏳ AGENT_KEY not found in .env.local yet.");
  console.log("👉 Open http://localhost:3000 to configure your profile and obtain your Agent Key.");
  console.log("   The agent will automatically start as soon as AGENT_KEY is added to .env.local.");
}
console.log("Press Ctrl+C to stop.");

// Poll every 5 seconds
setInterval(pollForCommands, 5000);
