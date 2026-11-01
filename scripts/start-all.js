/**
 * Unified Runner for Automatic Job Applier
 * Starts Convex backend, Next.js frontend, and the local Agent listener simultaneously.
 */

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
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

console.log(`
${COLORS.bold}${COLORS.runner}============================================================
       🚀 AUTOMATIC JOB APPLIER - ALL-IN-ONE RUNNER
============================================================${COLORS.reset}
Starting all components:
  ${COLORS.convex}● [CONVEX]  npx convex dev${COLORS.reset}       (Backend & Database)
  ${COLORS.next}● [NEXTJS]  npx next dev${COLORS.reset}         (Dashboard UI)
  ${COLORS.agent}● [AGENT ]  agent-listener.js${COLORS.reset}    (Automation Agent)

${COLORS.bold}🌐 Dashboard:${COLORS.reset} ${COLORS.next}http://localhost:3000${COLORS.reset}
${COLORS.dim}Press Ctrl+C at any time to cleanly stop all services.${COLORS.reset}
============================================================
`);

// Pre-flight check for .env.local
const envLocalPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envLocalPath)) {
  console.log(`${COLORS.runner}[RUNNER] ⚠️  Warning: .env.local not found in project root.${COLORS.reset}`);
  console.log(`${COLORS.runner}[RUNNER] ℹ️  Please ensure you configure your environment variables.${COLORS.reset}\n`);
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
    cwd: path.join(__dirname, ".."),
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
      console.log(`${color}[${name}] exited with code ${code}${COLORS.reset}`);
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

// 1. Start Convex Backend
startProcess("CONVEX", "npx", ["convex", "dev"], COLORS.convex);

// 2. Start Next.js Frontend
startProcess("NEXTJS", "npx", ["next", "dev"], COLORS.next);

// 3. Start Local Agent Listener
startProcess("AGENT ", "node", ["scripts/agent-listener.js"], COLORS.agent);
