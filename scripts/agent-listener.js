const { ConvexHttpClient } = require("convex/browser");
require("dotenv").config({ path: ".env.local" });
const { runAutomation } = require("./run-automation");
const { applyToAllPending } = require("./auto-apply-all");

const agentKey = process.env.AGENT_KEY;

if (!agentKey) {
  console.error("❌ AGENT_KEY not found in .env.local");
  console.error("Please copy your Agent Key from the web dashboard and add it to .env.local:");
  console.error("AGENT_KEY=your_key_here");
  process.exit(1);
}

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

let isBusy = false;

async function pollForCommands() {
  if (isBusy) return;

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
    console.error("Polling error:", e.message);
  }
}

console.log(`👂 Agent listening for commands (Key: ${agentKey.substring(0, 6)}...)`);
console.log("Press Ctrl+C to stop.");

// Poll every 5 seconds
setInterval(pollForCommands, 5000);

