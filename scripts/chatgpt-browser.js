/**
 * ChatGPT Web Automation Controller
 * Communicates with ChatGPT via browser automation on https://chatgpt.com (NO API used).
 */

const readline = require("readline");

function waitForKey(promptMessage = "Press ENTER to continue...") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(`\n👉 ${promptMessage} `, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

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

    const inputSelector = '#prompt-textarea, div[contenteditable="true"]#prompt-textarea, textarea[placeholder*="Message"], div[contenteditable="true"]';
    
    let isPromptVisible = await this.page.locator(inputSelector).first().isVisible().catch(() => false);

    if (!isPromptVisible) {
      console.log("\n⚠️  ChatGPT verification or login required in the browser!");
      console.log("👉 Please switch to the opened ChatGPT browser tab and complete any login/Cloudflare check.");
      console.log("   (Auto-detecting... will proceed automatically as soon as the prompt input is ready)");

      for (let sec = 0; sec < 30; sec++) {
        await this.page.waitForTimeout(1000);
        isPromptVisible = await this.page.locator(inputSelector).first().isVisible().catch(() => false);
        if (isPromptVisible) {
          console.log("✅ ChatGPT prompt input confirmed ready!");
          break;
        }
      }
    } else {
      console.log("✅ ChatGPT session is active and ready!");
    }

    this.isReady = true;
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

      const inputSelector = '#prompt-textarea, div[contenteditable="true"]#prompt-textarea, textarea[placeholder*="Message"], div[contenteditable="true"]';
      const promptLocator = this.page.locator(inputSelector).first();
      await promptLocator.waitFor({ state: "visible", timeout: 20000 });

      // Count existing assistant messages to know when a new one arrives
      const initialAssistantCount = await this.page.locator('[data-message-author-role="assistant"]').count().catch(() => 0);

      // Fill in prompt
      await promptLocator.click();
      await this.page.waitForTimeout(300);

      // Use evaluate for reliable input across contenteditable and textarea implementations
      await this.page.evaluate(({ selector, text }) => {
        const el = document.querySelector(selector);
        if (el) {
          el.focus();
          if (el.isContentEditable) {
            el.innerHTML = `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`;
          } else {
            el.value = text;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, { selector: '#prompt-textarea', text: promptText }).catch(async () => {
        // Fallback to fill
        await promptLocator.fill(promptText);
      });

      await this.page.waitForTimeout(600);

      // Click Send or press Enter
      const sendBtn = this.page.locator('button[data-testid="send-button"], button[aria-label*="Send"], button[data-testid="fruitjuice-send-button"]').first();
      const sendBtnVisible = await sendBtn.isVisible().catch(() => false);
      
      if (sendBtnVisible && (await sendBtn.isEnabled().catch(() => false))) {
        await sendBtn.click();
      } else {
        await this.page.keyboard.press("Enter");
      }

      console.log("⏳ Waiting for ChatGPT response...");

      // 1. Wait for assistant response to appear
      await this.page.waitForFunction((prevCount) => {
        const msgs = document.querySelectorAll('[data-message-author-role="assistant"]');
        return msgs.length > prevCount;
      }, initialAssistantCount, { timeout: 45000 }).catch(() => {
        console.log("ℹ️ Waiting for streaming to start...");
      });

      // 2. Wait for streaming to complete (stop button disappears and send button returns)
      await this.page.waitForTimeout(2000);
      const stopBtn = this.page.locator('button[data-testid="stop-button"], button[aria-label*="Stop"]').first();
      
      try {
        await stopBtn.waitFor({ state: "detached", timeout: 60000 });
      } catch (e) {
        // Stop button might have already detached or not appeared for quick answers
      }

      // Buffer to ensure DOM text has fully updated
      await this.page.waitForTimeout(1500);

      // 3. Extract the last assistant response
      const assistantMsgs = this.page.locator('[data-message-author-role="assistant"]');
      const count = await assistantMsgs.count();
      let responseText = "";

      if (count > 0) {
        responseText = await assistantMsgs.nth(count - 1).innerText();
      } else {
        const markdowns = this.page.locator('.markdown');
        const mCount = await markdowns.count();
        if (mCount > 0) {
          responseText = await markdowns.nth(mCount - 1).innerText();
        }
      }

      return responseText.trim();
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
A score above 90 means the candidate has the relevant skills, experience, and tech stack required for the role.
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
      // Fallback: look for any number 0-100
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
