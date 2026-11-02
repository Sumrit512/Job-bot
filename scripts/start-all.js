/**
 * Unified Runner for Automatic Job Applier
 * Handles automatic environment setup, dependency verification, browser installation,
 * profile seeding, and runs all 3 services concurrently with auto-opening browser.
 */

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const readline = require("readline");

// ANSI color codes
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  convex: "\x1b[35m", // Magenta
  next: "\x1b[36m",   // Cyan
  agent: "\x1b[32m",  // Green
  runner: "\x1b[33m", // Yellow
  error: "\x1b[31m",  // Red
  dim: "\x1b[2m",
};

const rootDir = path.join(__dirname, "..");
const envLocalPath = path.join(rootDir, ".env.local");
const envExamplePath = path.join(rootDir, ".env.example");

console.log(`
${COLORS.bold}${COLORS.runner}============================================================
       🚀 AUTOMATIC JOB APPLIER - ZERO-TOUCH RUNNER
============================================================${COLORS.reset}
`);

async function autoSetup() {
  // Step 1: Ensure .env.local exists
  if (!fs.existsSync(envLocalPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.log(`${COLORS.runner}[SETUP] 📝 Creating .env.local from .env.example...${COLORS.reset}`);
      fs.copyFileSync(envExamplePath, envLocalPath);
    } else {
      console.log(`${COLORS.runner}[SETUP] ⚠️  Warning: Neither .env.local nor .env.example found.${COLORS.reset}`);
    }
  }

  // Load environment variables
  require("dotenv").config({ path: envLocalPath });

  // Step 2: Ensure Playwright browser is installed
  try {
    const { chromium } = require("playwright");
    const execPath = chromium.executablePath();
    if (!fs.existsSync(execPath)) {
      console.log(`${COLORS.runner}[SETUP] 🌐 Installing Playwright Chromium browser...${COLORS.reset}`);
      execSync("npx playwright install chromium", { stdio: "inherit", cwd: rootDir });
      console.log(`${COLORS.agent}[SETUP] ✅ Chromium browser ready!${COLORS.reset}`);
    }
  } catch (err) {
    // If playwright isn't available or fails check, ignore non-fatal
  }

  // Step 3: Check & Auto-provision AGENT_KEY from Convex if missing
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl && !process.env.AGENT_KEY) {
    try {
      console.log(`${COLORS.runner}[SETUP] 🔑 Auto-provisioning Agent Key from Convex...${COLORS.reset}`);
      const { ConvexHttpClient } = require("convex/browser");
      const client = new ConvexHttpClient(convexUrl);
      const generatedKey = await client.mutation("preferences:getOrGenerateAgentKey");
      if (generatedKey) {
        process.env.AGENT_KEY = generatedKey;
        fs.appendFileSync(envLocalPath, `\nAGENT_KEY=${generatedKey}\n`);
        console.log(`${COLORS.agent}[SETUP] ✅ Agent Key auto-configured: ${generatedKey}${COLORS.reset}`);
      }
    } catch (e) {
      console.log(`${COLORS.runner}[SETUP] ℹ️  Could not auto-fetch agent key: ${e.message}${COLORS.reset}`);
    }
  }

  // Step 4: Check & Auto-seed profile into Convex if none exists
  if (convexUrl && process.env.AGENT_KEY) {
    try {
      const { ConvexHttpClient } = require("convex/browser");
      const client = new ConvexHttpClient(convexUrl);
      const existing = await client.query("preferences:getPreferences", { agentKey: process.env.AGENT_KEY });
      if (!existing) {
        console.log(`${COLORS.runner}[SETUP] 📋 Initializing default profile from resume.txt...${COLORS.reset}`);
        let resumeText = "";
        const resumePath = path.join(rootDir, "resume.txt");
        if (fs.existsSync(resumePath)) {
          resumeText = fs.readFileSync(resumePath, "utf8");
        }
        await client.mutation("preferences:savePreferences", {
          agentKey: process.env.AGENT_KEY,
          fullName: "Sumrit Arora",
          phone: "+91 8920595495",
          role: "Full Stack Developer",
          experience: "3",
          yearsOfExperience: 3,
          location: "Ghaziabad, Uttar Pradesh",
          salaryRange: "10-15 LPA",
          currentCompany: "MNB Soft Solutions Pvt. Ltd",
          currentTitle: "Full Stack Developer",
          degree: "Bachelor of Technology",
          university: "HRIT (GZB, UP) AKTU",
          gradYear: 2023,
          noticePeriod: "Immediate",
          workAuthorization: true,
          visaSponsorship: false,
          jobType: ["WFH", "Hybrid", "Full-time"],
          targetPortals: ["LinkedIn", "Internshala", "Naukri"],
          resumeText
        });
        console.log(`${COLORS.agent}[SETUP] ✅ Default profile seeded into Convex!${COLORS.reset}`);
      }
    } catch (e) {
      // Non-fatal
    }
  }
}

function openBrowser(url) {
  const plat = process.platform;
  try {
    if (plat === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
    } else if (plat === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" });
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    }
  } catch (e) {}
}

function waitForServerAndOpen(url, maxRetries = 40) {
  let retries = 0;
  let opened = false;
  const checkInterval = setInterval(() => {
    retries++;
    const req = http.get(url, (res) => {
      if (!opened) {
        opened = true;
        clearInterval(checkInterval);
        console.log(`\n${COLORS.agent}${COLORS.bold}✨ UI Dashboard ready! Opening ${url} in your browser...${COLORS.reset}\n`);
        openBrowser(url);
      }
    });
    req.on("error", () => {
      if (retries >= maxRetries) {
        clearInterval(checkInterval);
      }
    });
  }, 1000);
}

const children = [];
let isShuttingDown = false;

function pipeWithPrefix(stream, prefix, color) {
  if (!stream) return;
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // keep last incomplete line

    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${color}${COLORS.bold}[${prefix}]${COLORS.reset} ${line}`);
      }
    }
  });

  stream.on("end", () => {
    if (buffer.trim().length > 0) {
      console.log(`${color}${COLORS.bold}[${prefix}]${COLORS.reset} ${buffer}`);
      buffer = "";
    }
  });
}

function startProcess(name, command, args, color) {
  const isWin = process.platform === "win32";
  const cmdStr = isWin ? `${command} ${args.join(" ")}` : command;
  const spawnArgs = isWin ? [] : args;
  const options = {
    shell: isWin ? true : false,
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  };

  const child = spawn(cmdStr, spawnArgs, options);
  children.push(child);

  pipeWithPrefix(child.stdout, name, color);
  pipeWithPrefix(child.stderr, name, COLORS.error);

  child.on("error", (err) => {
    console.error(`${color}[${name}] Failed to start:${COLORS.reset}`, err.message);
  });

  child.on("close", (code) => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      if (name === "CONVEX") {
        console.log(`${COLORS.convex}[CONVEX] ℹ️ Using cloud Convex backend: ${process.env.NEXT_PUBLIC_CONVEX_URL || "Connected"}${COLORS.reset}`);
      } else {
        console.log(`${color}[${name}] exited with code ${code}${COLORS.reset}`);
      }
    }
  });

  return child;
}

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${COLORS.runner}${COLORS.bold}[RUNNER] Gracefully stopping all processes...${COLORS.reset}`);

  for (const child of children) {
    if (child && child.pid) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
        } catch (e) {}
      } else {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch (e) {
          try { child.kill("SIGTERM"); } catch (e2) {}
        }
      }
    }
  }

  setTimeout(() => {
    console.log(`${COLORS.runner}[RUNNER] All processes stopped. Goodbye!${COLORS.reset}`);
    process.exit(0);
  }, 800);
}

// Windows readline hook for Ctrl+C
if (process.platform === "win32") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on("SIGINT", () => {
    shutdown();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  await autoSetup();

  console.log(`
Starting all components:
  ${COLORS.convex}● [CONVEX]  npx convex dev${COLORS.reset}       (Backend & Database)
  ${COLORS.next}● [NEXTJS]  npx next dev${COLORS.reset}         (Dashboard UI)
  ${COLORS.agent}● [AGENT ]  agent-listener.js${COLORS.reset}    (Automation Agent)

${COLORS.bold}🌐 Dashboard:${COLORS.reset} ${COLORS.next}http://localhost:3000${COLORS.reset}
${COLORS.dim}Press Ctrl+C at any time to stop all services.${COLORS.reset}
============================================================
`);

  // 1. Start Convex Backend
  startProcess("CONVEX", "npx", ["convex", "dev"], COLORS.convex);

  // 2. Start Next.js Frontend
  startProcess("NEXTJS", "npx", ["next", "dev"], COLORS.next);

  // 3. Start Local Agent Listener
  startProcess("AGENT ", "node", ["scripts/agent-listener.js"], COLORS.agent);

  // 4. Poll and auto-open browser
  waitForServerAndOpen("http://localhost:3000");
}

main().catch(err => {
  console.error("Fatal startup error:", err);
});
