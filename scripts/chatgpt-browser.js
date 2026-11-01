/**
 * ChatGPT Web Automation Controller
 * Communicates with ChatGPT via browser automation on https://chatgpt.com (NO API used).
 */

class ChatGPTController {
  constructor(context) {
    this.context = context;
    this.page = null;
    this.isReady = false;
  }

  /**
   * Initializes the ChatGPT tab inside the persistent browser context.
   */
  async init() {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    console.log("🤖 Opening ChatGPT tab on https://chatgpt.com...");
    
    // Check if a chatgpt tab is already open in context
    const pages = this.context.pages();
    for (const p of pages) {
      if (p.url().includes("chatgpt.com") || p.url().includes("chat.openai.com")) {
        this.page = p;
        break;
      }
    }

    if (!this.page || this.page.isClosed()) {
      this.page = await this.context.newPage();
      try {
        await this.page.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });
        });
        await this.page.goto("https://chatgpt.com", { waitUntil: "domcontentloaded", timeout: 45000 });
      } catch (err) {
        console.warn("ℹ️ ChatGPT page loading notice:", err.message);
      }
    }

    await this.ensureReady();
    return this.page;
  }

  /**
   * Ensures ChatGPT is ready to receive prompts (checks for login / Cloudflare).
   */
  async ensureReady() {
    if (!this.page || this.page.isClosed()) {
      await this.init();
      return;
    }

    await this.page.waitForTimeout(2000);

    const inputSelector = 'div.ProseMirror, div[contenteditable="true"], #prompt-textarea, textarea[placeholder*="Message"]';
    let isPromptVisible = await this.page.locator(inputSelector).first().isVisible().catch(() => false);

    if (!isPromptVisible) {
      console.log("\n⚠️  ChatGPT verification or prompt input loading...");
      console.log("👉 Checking for Cloudflare check or login requirements...");

      for (let sec = 0; sec < 45; sec++) {
        // Check for Cloudflare Turnstile iframes and attempt click
        try {
          for (const frame of this.page.frames()) {
            const checkbox = frame.locator('input[type="checkbox"], #challenge-stage, .ctp-checkbox-label').first();
            if (await checkbox.isVisible().catch(() => false)) {
              console.log("🛡️ Cloudflare verification checkbox detected! Auto-clicking...");
              await checkbox.click({ force: true }).catch(() => {});
            }
          }
        } catch (e) {}

        await this.page.waitForTimeout(1000);
        isPromptVisible = await this.page.locator(inputSelector).first().isVisible().catch(() => false);
        if (isPromptVisible) {
          console.log("✅ ChatGPT prompt input confirmed ready!");
          this.isReady = true;
          return;
        }
      }

      console.warn("⚠️ Warning: ChatGPT prompt input not visible yet. Attempting reload...");
      await this.page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
      await this.page.waitForTimeout(3000);
      isPromptVisible = await this.page.locator(inputSelector).first().isVisible().catch(() => false);
    }

    if (isPromptVisible) {
      console.log("✅ ChatGPT session is active and ready!");
      this.isReady = true;
    } else {
      console.warn("⚠️ ChatGPT input could not be confirmed visible. User may need to log in on the browser tab.");
      this.isReady = false;
    }
  }

  /**
   * Sends a prompt to ChatGPT web and returns the assistant's response.
   */
  async sendPrompt(promptText) {
    await this.ensureReady();

    try {
      // Focus the ChatGPT tab
      await this.page.bringToFront();
      await this.page.waitForTimeout(500);

      const inputSelector = 'div.ProseMirror, div[contenteditable="true"], #prompt-textarea, textarea[placeholder*="Message"]';
      const promptLocator = this.page.locator(inputSelector).first();
      await promptLocator.waitFor({ state: "visible", timeout: 25000 });

      // Focus and enter text
      await promptLocator.click();
      await this.page.waitForTimeout(300);

      // Native text insertion allows modern ProseMirror / React to update state accurately
      await this.page.keyboard.insertText(promptText);
      await this.page.waitForTimeout(600);

      // Locate send button
      const sendBtn = this.page.locator('button[aria-label*="Send"], button[type="submit"]:has(svg), button[data-testid*="send"], button[data-testid="fruitjuice-send-button"]').first();
      const sendBtnVisible = await sendBtn.isVisible().catch(() => false);
      
      if (sendBtnVisible && (await sendBtn.isEnabled().catch(() => false))) {
        await sendBtn.click();
      } else {
        await this.page.keyboard.press("Enter");
      }

      console.log("⏳ Waiting for ChatGPT response...");

      // Wait for streaming (stop button appears while generating)
      const stopBtn = this.page.locator('button[aria-label*="Stop"], button[data-testid*="stop"]').first();
      try {
        await stopBtn.waitFor({ state: "visible", timeout: 6000 });
        // Stream in progress: wait until stop button is detached
        await stopBtn.waitFor({ state: "detached", timeout: 70000 });
      } catch (e) {
        // Stop button might have detached quickly for short replies
        await this.page.waitForTimeout(4000);
      }

      // Small buffer for DOM rendering to stabilize
      await this.page.waitForTimeout(1500);

      // Extract the last response generated by ChatGPT
      const responseText = await this.page.evaluate(() => {
        // Priority 1: Markdown prose elements
        const markdowns = Array.from(document.querySelectorAll('.markdown, div[class*="markdown"], div[class*="prose"]'));
        if (markdowns.length > 0) {
          return markdowns[markdowns.length - 1].innerText;
        }

        // Priority 2: Conversation turns
        const turns = Array.from(document.querySelectorAll('[data-testid*="conversation-turn"]'));
        if (turns.length > 0) {
          return turns[turns.length - 1].innerText;
        }

        // Priority 3: Messages with assistant role
        const msgs = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
        if (msgs.length > 0) {
          return msgs[msgs.length - 1].innerText;
        }

        return "";
      });

      return (responseText || "").trim();
    } catch (err) {
      console.error("❌ ChatGPT Web Automation Error:", err.message);
      return null;
    }
  }

  /**
   * Rates candidate resume against a job role.
   * Returns: { score: number (0-100), explanation: string }
   */
  async rateResume(jobInfo, resumeText) {
    const prompt = `
You are an expert technical hiring manager and recruitment specialist.

Analyze the candidate's resume and rate how well it matches the target job role on a strict numerical scale from 0 to 100.
A score strictly ABOVE 90 means the candidate has the relevant skills, experience, and tech stack required for the role.
A score of 90 or below means there are missing requirements or technology mismatches.

CANDIDATE RESUME:
"""
${resumeText ? resumeText.substring(0, 3000) : "No resume text provided."}
"""

JOB DETAILS:
- Title: ${jobInfo.title || "Not specified"}
- Company: ${jobInfo.company || "Not specified"}
- Location: ${jobInfo.location || "Not specified"}
${jobInfo.description ? `- Description & Requirements:\n"""\n${jobInfo.description.substring(0, 2000)}\n"""` : ""}

TASK:
Provide your evaluation in this EXACT format:
SCORE: <number between 0 and 100>
REASON: <one short, straightforward sentence explaining why>
`;

    console.log(`\n🧠 Asking ChatGPT to rate resume for "${jobInfo.title}" at "${jobInfo.company}"...`);
    const rawResponse = await this.sendPrompt(prompt);

    if (!rawResponse) {
      console.warn("⚠️ Could not get rating from ChatGPT. Defaulting score to 85.");
      return { score: 85, explanation: "ChatGPT web response unavailable." };
    }

    console.log(`💬 ChatGPT Evaluation:\n${rawResponse}\n`);

    // Parse SCORE: XX
    let score = 0;
    const scoreMatch = rawResponse.match(/SCORE:\s*(\d{1,3})/i) || rawResponse.match(/(\d{1,3})\s*\/\s*100/);
    if (scoreMatch) {
      score = parseInt(scoreMatch[1], 10);
    } else {
      const anyNum = rawResponse.match(/\b([1-9]?\d|100)\b/);
      if (anyNum) score = parseInt(anyNum[1], 10);
    }

    // Parse REASON
    let explanation = "";
    const reasonMatch = rawResponse.match(/REASON:\s*(.+)/i);
    if (reasonMatch) {
      explanation = reasonMatch[1].trim();
    } else {
      explanation = rawResponse.replace(/SCORE:\s*\d+/i, '').trim().substring(0, 150);
    }

    return { score, explanation };
  }

  /**
   * Asks ChatGPT to answer a job application question straightforwardly.
   */
  async answerQuestion(questionText, options = [], profile = {}, jobContext = {}) {
    const prompt = `
You are helping a candidate answer a job application form question.
Provide a straightforward, direct answer. Do NOT add pleasantries, greetings, or conversational filler.

CANDIDATE PROFILE:
- Full Name: ${profile.fullName || "Sumrit Arora"}
- Current Role: ${profile.currentTitle || profile.role || "Full Stack Developer"}
- Experience: ${profile.yearsOfExperience || 3} years (${profile.experience || "Mid Level"})
- Key Technologies: React, Next.js, Node.js, Express, JavaScript, TypeScript, MongoDB, SQL, AWS, Solidity, Rust
- Availability: Immediate (0 days notice)
- Work Authorization: Authorized, No visa sponsorship required
- Resume Snippet: ${profile.resumeText ? profile.resumeText.substring(0, 1000) : ""}

JOB CONTEXT:
- Role: ${jobContext.title || "Software Developer"}
- Company: ${jobContext.company || "Hiring Company"}

QUESTION:
"${questionText}"

${options && options.length > 0 ? `AVAILABLE CHOICES:\n${options.map(o => `- "${o}"`).join('\n')}\n` : ''}

INSTRUCTIONS:
1. If this is a multiple choice or dropdown question, choose the best matching option from the choices above and output ONLY the exact text of that option.
2. If this is a numeric question (e.g. years of experience), output ONLY the number (e.g. "3").
3. If this is a Yes/No question, output ONLY "Yes" or "No".
4. If this is an availability question, answer "Immediate" or "0".
5. If this is an open-ended question (e.g. why this role, cover letter snippet), write a concise, professional, direct answer (1-2 sentences).
6. CRITICAL: Output ONLY the raw final answer with NO introductory text, NO quotes, NO explanation.
`;

    console.log(`🧠 Asking ChatGPT for question: "${questionText.substring(0, 50)}..."`);
    const rawResponse = await this.sendPrompt(prompt);

    if (!rawResponse) {
      return null;
    }

    // Clean up response: remove quotes, prefixes like "Answer:", etc.
    let clean = rawResponse.trim();
    if (clean.includes(":")) {
      const parts = clean.split(":");
      const label = parts[0].toLowerCase();
      if (label.includes("answer") || label.includes("result") || label.includes("choice") || label.includes("option")) {
        clean = parts.slice(1).join(":").trim();
      }
    }

    clean = clean.replace(/^["']|["']$/g, '').trim();
    console.log(`🎯 ChatGPT Answer: "${clean}"`);
    return clean;
  }
}

module.exports = { ChatGPTController };
