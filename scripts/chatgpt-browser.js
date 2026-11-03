/**
 * ChatGPT Web Automation Controller
 * Communicates with ChatGPT via browser automation on https://chatgpt.com (NO API used).
 */

/**
 * Formats the candidate's complete profile form and resume text into
 * an exhaustive structured summary so ChatGPT has full context.
 */
function formatFullCandidateContext(profile, resumeTextFallback = "") {
  if (!profile && !resumeTextFallback) return "No candidate information provided.";

  if (typeof profile === "string") {
    const text = profile.trim();
    return `FULL CANDIDATE RESUME & PROFILE:\n"""\n${text}\n"""`;
  }

  const sections = [];

  // 1. Personal & Contact
  const personal = [];
  if (profile.fullName) personal.push(`- Full Name: ${profile.fullName}`);
  if (profile.phone) personal.push(`- Phone: ${profile.phone}`);
  if (profile.dob) personal.push(`- Date of Birth: ${profile.dob}`);
  if (profile.gender) personal.push(`- Gender: ${profile.gender}`);
  if (profile.pronouns) personal.push(`- Pronouns: ${profile.pronouns}`);
  if (profile.ethnicity) personal.push(`- Ethnicity: ${profile.ethnicity}`);
  if (personal.length > 0) sections.push(`PERSONAL & CONTACT DETAILS:\n${personal.join("\n")}`);

  // 2. Current Role & Professional Experience
  const career = [];
  if (profile.currentTitle || profile.role) career.push(`- Target / Current Role: ${profile.currentTitle || profile.role}`);
  if (profile.currentCompany) career.push(`- Current Company: ${profile.currentCompany}`);
  const yoe = profile.yearsOfExperience ?? profile.experience ?? 4;
  career.push(`- Total Years of Experience: ${yoe} years`);
  if (profile.experience && String(profile.experience) !== String(yoe)) {
    career.push(`- Experience Level: ${profile.experience}`);
  }
  if (profile.numberOfProjects) career.push(`- Total Completed Projects / Apps: ${profile.numberOfProjects}`);
  if (career.length > 0) sections.push(`PROFESSIONAL EXPERIENCE:\n${career.join("\n")}`);

  // 3. Compensation & Availability
  const comp = [];
  if (profile.currentCtc) comp.push(`- Current CTC: ${profile.currentCtc}`);
  if (profile.expectedCtc || profile.salaryRange) comp.push(`- Expected CTC / Salary: ${profile.expectedCtc || profile.salaryRange}`);
  if (profile.noticePeriod) comp.push(`- Notice Period: ${profile.noticePeriod}`);
  if (profile.earliestStartDate) comp.push(`- Earliest Start Date: ${profile.earliestStartDate}`);
  if (comp.length > 0) sections.push(`COMPENSATION & AVAILABILITY:\n${comp.join("\n")}`);

  // 4. Education
  const edu = [];
  if (profile.degree) edu.push(`- Degree / Major: ${profile.degree}`);
  if (profile.university) edu.push(`- College / University: ${profile.university}`);
  if (profile.gradYear) edu.push(`- Graduation Year: ${profile.gradYear}`);
  if (edu.length > 0) sections.push(`EDUCATION:\n${edu.join("\n")}`);

  // 5. Location & Work Preferences
  const loc = [];
  if (profile.location) loc.push(`- Current City/Location: ${profile.location}`);
  const addressParts = [profile.streetAddress, profile.city, profile.state, profile.zipCode, profile.country].filter(Boolean);
  if (addressParts.length > 0) loc.push(`- Full Address: ${addressParts.join(", ")}`);
  if (profile.willingToRelocate !== undefined) loc.push(`- Willing to Relocate: ${profile.willingToRelocate ? "Yes" : "No"}`);
  if (profile.jobType) {
    const jobTypes = Array.isArray(profile.jobType) ? profile.jobType.join(", ") : profile.jobType;
    if (jobTypes) loc.push(`- Preferred Work Modes: ${jobTypes}`);
  }
  if (loc.length > 0) sections.push(`LOCATION & WORK PREFERENCES:\n${loc.join("\n")}`);

  // 6. Legal & Eligibility
  const legal = [];
  if (profile.workAuthorization !== undefined) legal.push(`- Legally Authorized to Work: ${profile.workAuthorization ? "Yes" : "No"}`);
  if (profile.visaSponsorship !== undefined) legal.push(`- Requires Visa Sponsorship: ${profile.visaSponsorship ? "Yes" : "No"}`);
  if (profile.veteranStatus) legal.push(`- Veteran Status: ${profile.veteranStatus}`);
  if (profile.disabilityStatus) legal.push(`- Disability Status: ${profile.disabilityStatus}`);
  if (legal.length > 0) sections.push(`LEGAL & ELIGIBILITY:\n${legal.join("\n")}`);

  // 7. Online Profiles & Portfolio
  const links = [];
  if (profile.linkedinId) links.push(`- LinkedIn: ${profile.linkedinId}`);
  if (profile.githubId) links.push(`- GitHub: ${profile.githubId}`);
  if (profile.portfolioUrl) links.push(`- Portfolio: ${profile.portfolioUrl}`);
  if (links.length > 0) sections.push(`ONLINE PROFILES & PORTFOLIO:\n${links.join("\n")}`);

  // 8. Motivations & Achievements
  const motivation = [];
  if (profile.biggestAchievement) motivation.push(`- Biggest Achievement: ${profile.biggestAchievement}`);
  if (profile.whyThisRole) motivation.push(`- Why This Role Motivation: ${profile.whyThisRole}`);
  if (profile.fitnessFrequency) motivation.push(`- Fitness / Routine: ${profile.fitnessFrequency}`);
  if (motivation.length > 0) sections.push(`MOTIVATION & ACHIEVEMENTS:\n${motivation.join("\n")}`);

  // 9. References
  if (profile.references && Array.isArray(profile.references) && profile.references.length > 0) {
    const refLines = profile.references
      .filter(r => r.name)
      .map(r => `  * ${r.name} (${r.relation || "Reference"}): ${r.email || ""} ${r.phone || ""}`.trim());
    if (refLines.length > 0) sections.push(`PROFESSIONAL REFERENCES:\n${refLines.join("\n")}`);
  }

  // 10. Complete Resume Content
  const rawResume = profile.resumeText || resumeTextFallback;
  if (rawResume && rawResume.trim()) {
    sections.push(`FULL RESUME TEXT:\n"""\n${rawResume.trim()}\n"""`);
  }

  return sections.join("\n\n");
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
   * Rates candidate resume and full user profile against a job role.
   * Also extracts a list of missing skills/keywords that could increase the ATS score.
   * Returns: { score: number (0-100), missingSkills: string[], explanation: string }
   */
  async rateResume(jobInfo, profileOrResume, resumeTextFallback = "") {
    const candidateContext = formatFullCandidateContext(profileOrResume, resumeTextFallback);

    const prompt = `
You are an expert technical hiring manager and recruitment specialist.

Analyze the candidate's complete profile and full resume below against the target job role.
1. Rate how well they match on a numerical scale from 0 to 100.
2. Note down a list of missing skills, qualifications, or technologies that the candidate lacks for this role and that would increase their score.

============================================================
CANDIDATE COMPLETE PROFILE & FULL RESUME:
============================================================
${candidateContext}

============================================================
JOB DETAILS:
============================================================
- Title: ${jobInfo.title || "Not specified"}
- Company: ${jobInfo.company || "Not specified"}
- Location: ${jobInfo.location || "Not specified"}
${jobInfo.description ? `- Description & Requirements:\n"""\n${jobInfo.description.substring(0, 3000)}\n"""` : ""}

TASK:
Provide your evaluation in this EXACT format:
SCORE: <number between 0 and 100>
MISSING_SKILLS: <comma-separated list of missing skills/technologies/qualifications that can increase the score, or "None">
REASON: <one short, straightforward sentence explaining why and how to improve>
`;

    console.log(`\n🧠 Asking ChatGPT to rate resume & identify missing skills for "${jobInfo.title}" at "${jobInfo.company}"...`);
    const rawResponse = await this.sendPrompt(prompt);

    if (!rawResponse) {
      console.warn("⚠️ Could not get rating from ChatGPT. Defaulting score to 85.");
      return { score: 85, missingSkills: [], explanation: "ChatGPT web response unavailable." };
    }

    console.log(`💬 ChatGPT Evaluation:\n${rawResponse}\n`);

    // Parse SCORE: XX
    let score = 80;
    const scoreMatch = rawResponse.match(/SCORE:\s*(\d{1,3})/i) || rawResponse.match(/(\d{1,3})\s*\/\s*100/);
    if (scoreMatch) {
      score = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
    } else {
      const anyNum = rawResponse.match(/\b([1-9]?\d|100)\b/);
      if (anyNum) score = Math.min(100, Math.max(0, parseInt(anyNum[1], 10)));
    }

    // Parse MISSING_SKILLS: skill1, skill2...
    let missingSkills = [];
    const skillsMatch = rawResponse.match(/MISSING_SKILLS:\s*([^\n\r]+)/i);
    if (skillsMatch) {
      const rawSkills = skillsMatch[1].trim();
      if (!/^none$/i.test(rawSkills) && !/^n\/a$/i.test(rawSkills) && !/^nil$/i.test(rawSkills)) {
        missingSkills = rawSkills
          .split(/[,;•|]/)
          .map(s => s.replace(/^[-*•\d.]+\s*/, '').trim())
          .filter(s => s.length > 1 && !/^none$/i.test(s));
      }
    }

    // Parse REASON
    let explanation = "";
    const reasonMatch = rawResponse.match(/REASON:\s*(.+)/i);
    if (reasonMatch) {
      explanation = reasonMatch[1].trim();
    } else {
      explanation = rawResponse
        .replace(/SCORE:\s*\d+/i, '')
        .replace(/MISSING_SKILLS:[^\n]+/i, '')
        .trim()
        .substring(0, 150);
    }

    return { score, missingSkills, explanation };
  }

  /**
   * Asks ChatGPT to answer a job application question straightforwardly.
   */
  async answerQuestion(questionText, options = [], profile = {}, jobContext = {}) {
    const candidateContext = formatFullCandidateContext(profile);

    const prompt = `
You are helping a candidate answer a job application form question.
Provide a straightforward, direct answer. Do NOT add pleasantries, greetings, or conversational filler.

============================================================
CANDIDATE COMPLETE PROFILE & FULL RESUME:
============================================================
${candidateContext}

============================================================
JOB CONTEXT:
============================================================
- Role: ${jobContext.title || "Software Developer"}
- Company: ${jobContext.company || "Hiring Company"}

============================================================
QUESTION:
============================================================
"${questionText}"

${options && options.length > 0 ? `AVAILABLE CHOICES:\n${options.map(o => `- "${o}"`).join('\n')}\n` : ''}

INSTRUCTIONS:
1. If this is a multiple choice or dropdown question, choose the best matching option from the choices above and output ONLY the exact text of that option.
2. If this is a numeric question (e.g. years of experience, current/expected CTC, notice period days, graduation year), output ONLY the number or requested format from the candidate profile.
3. If this is a Yes/No question, output ONLY "Yes" or "No".
4. If this is an availability question, answer "Immediate" or "0".
5. If this is an open-ended question (e.g. why this role, cover letter snippet, biggest achievement), write a concise, professional, direct answer (1-2 sentences) derived directly from the candidate profile and resume.
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
