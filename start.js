// Quick root entrypoint: node start.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 1. Ensure dependencies are installed
if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.log("📦 Installing dependencies (npm install)... This may take a moment.");
  try {
    execSync("npm install", { stdio: "inherit" });
  } catch (e) {
    console.error("Failed to run npm install automatically:", e.message);
  }
}

// 2. Delegate to the unified runner
require("./scripts/start-all.js");
