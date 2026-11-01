const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Universal AI Caller (OpenAI ChatGPT -> Groq fallback)
 */
async function callAI(messages, { temperature = 0.2, jsonMode = false } = {}) {
  // 1. Try OpenAI if OPENAI_API_KEY is present
  if (process.env.OPENAI_API_KEY) {
    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const body = {
        model,
        messages,
        temperature,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      };

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content.trim();
      } else {
        const err = await res.text();
        console.warn(`[AI] OpenAI API error (${res.status}): ${err}`);
      }
    } catch (e) {
      console.warn(`[AI] OpenAI request failed: ${e.message}`);
    }
  }

  // 2. Try Groq if GROQ_API_KEY is present
  if (process.env.GROQ_API_KEY) {
    try {
      const { Groq } = require('groq-sdk');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

      const completion = await groq.chat.completions.create({
        messages,
        model,
        temperature,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      });

      return completion.choices[0].message.content.trim();
    } catch (e) {
      // Fallback model on Groq if 120b is busy
      try {
        const { Groq } = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          messages,
          model: "openai/gpt-oss-20b",
          temperature,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        });
        return completion.choices[0].message.content.trim();
      } catch (e2) {
        console.warn(`[AI] Groq request failed: ${e2.message}`);
      }
    }
  }

  throw new Error("No AI API keys configured or all AI calls failed.");
}

/**
 * Checks if a question is a basic personal information field.
 * Returns the field key in profile if matched, or null if it should be answered by AI.
 */
function isBasicPersonalInfo(questionText) {
  const t = (questionText || "").toLowerCase().trim();

  // Full Name, First Name, Last Name
  if (t.includes("full name") || t.includes("first name") || t.includes("last name") || t.includes("your name") || t === "name") {
    return "fullName";
  }
  // Phone / Mobile
  if (t.includes("phone") || t.includes("mobile") || t.includes("contact number") || t.includes("cell")) {
    return "phone";
  }
  // Email
  if (t.includes("email") || t.includes("e-mail") || t === "mail") {
    return "email";
  }
  // Street Address
  if (t.includes("street address") || t.includes("address line 1") || t.includes("address line 2")) {
    return "streetAddress";
  }
  // City
  if (t.includes("city") && !t.includes("relocate") && !t.includes("willing")) {
    return "city";
  }
  // State / Province
  if (t.includes("state") || t.includes("province")) {
    return "state";
  }
  // Zip / Postal Code
  if (t.includes("zip") || t.includes("postal") || t.includes("pin code") || t.includes("pincode")) {
    return "zipCode";
  }
  // Country
  if (t.includes("country") && !t.includes("authorized") && !t.includes("eligible") && !t.includes("visa")) {
    return "country";
  }
  // LinkedIn
  if (t.includes("linkedin")) {
    return "linkedinId";
  }
  // GitHub
  if (t.includes("github")) {
    return "githubId";
  }
  // Portfolio / Website
  if (t.includes("portfolio") || t.includes("personal website") || t.includes("personal url")) {
    return "portfolioUrl";
  }

  return null;
}

/**
 * Rate the candidate's resume match against a job description.
 * Returns { score: number, reason: string }
 */
async function rateResumeMatch(jobTitle, company, jobDescription, profile) {
  const resumeText = profile.resumeText || "";

  const systemPrompt = `You are a strict, senior technical recruiter and hiring manager.
Your task is to evaluate the match between a candidate's resume and a specific job opening.
Evaluate technical skills, frameworks, years of experience, and role responsibilities.
Provide a realistic match score from 0 to 100 and a 1-sentence explanation.
Return ONLY valid JSON in this exact structure:
{
  "score": <integer between 0 and 100>,
  "reason": "<one concise sentence explaining the score>"
}`;

  const userPrompt = `
JOB DETAILS:
- Title: ${jobTitle}
- Company: ${company}
- Description/Requirements:
${(jobDescription || "Role: " + jobTitle).substring(0, 4000)}

CANDIDATE RESUME & PROFILE:
- Target Role: ${profile.role || "Developer"}
- Experience: ${profile.yearsOfExperience || profile.experience || 3} years
- Current Title: ${profile.currentTitle || profile.role || "Developer"}
- Current Company: ${profile.currentCompany || "N/A"}
- Resume Text:
${resumeText.substring(0, 4000)}
`;

  try {
    const rawResponse = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], { temperature: 0.1, jsonMode: true });

    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (e) {
      const match = rawResponse.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (parsed && typeof parsed.score === "number") {
      return {
        score: Math.min(100, Math.max(0, Math.round(parsed.score))),
        reason: parsed.reason || "Score calculated based on resume and job alignment."
      };
    }
  } catch (err) {
    console.error("⚠️ AI Match Rating failed:", err.message);
  }

  // Fallback heuristic scoring if AI call failed
  return fallbackMatchRating(jobTitle, jobDescription, profile);
}

function fallbackMatchRating(jobTitle, jobDescription, profile) {
  const text = `${jobTitle} ${jobDescription || ""}`.toLowerCase();
  const resume = (profile.resumeText || "").toLowerCase();
  
  const keywords = ["react", "next", "node", "javascript", "typescript", "full stack", "frontend", "backend", "developer", "engineer", "aws", "solidity", "web3", "sql", "api"];
  let matched = 0;
  let total = 0;

  for (const kw of keywords) {
    if (text.includes(kw)) {
      total++;
      if (resume.includes(kw)) {
        matched++;
      }
    }
  }

  const score = total > 0 ? Math.min(95, Math.max(70, Math.round((matched / total) * 100))) : 85;
  return {
    score,
    reason: `Heuristic match: matched ${matched}/${total} key technical skills.`
  };
}

/**
 * Resolves a form question.
 * If it's a basic personal info question, resolves from profile directly.
 * Otherwise, asks ChatGPT / AI for the best response.
 */
async function resolveQuestion(questionText, profile, tagName = 'input', options = []) {
  // Check if it's basic personal info
  const basicField = isBasicPersonalInfo(questionText);
  if (basicField) {
    const val = profile[basicField];
    if (val) {
      console.log(`📋 Basic Info: Used profile.${basicField} ("${val}") for "${questionText.substring(0, 35)}..."`);
      return String(val);
    }
  }

  // For every other question: ASK CHATGPT / AI!
  try {
    const systemPrompt = `You are an expert career assistant completing a job application form on behalf of a candidate.
Answer the specific form question based on the candidate's resume and profile.
Follow these rules strictly:
1. Provide ONLY THE DIRECT ANSWER. No preamble, no conversational filler ("Based on...", "Sure, here is...").
2. For short inputs (e.g., years of experience, salary, availability): return ONLY the raw value (e.g., "3", "0", "Immediate", "Yes", "12 LPA").
3. For open-ended questions (e.g. "Why do you want to join?", "Describe your experience with X"): write a concise, professional 1-3 sentence response based on the candidate's actual projects and experience in the resume.
4. For availability / notice period questions: ALWAYS indicate immediate availability ("0 days", "Immediate").
5. For authorization / legal questions: candidate is authorized to work and does not require sponsorship unless specified.`;

    const userPrompt = `
CANDIDATE PROFILE & RESUME:
- Full Name: ${profile.fullName}
- Target Role: ${profile.role}
- Experience: ${profile.yearsOfExperience || profile.experience || 3} years
- Current Company: ${profile.currentCompany || "MNB Soft Solutions"}
- Current Role: ${profile.currentTitle || profile.role}
- Education: ${profile.degree} (${profile.university})
- Notice Period: Immediate / 0 days
- Resume Snippet:
${(profile.resumeText || "").substring(0, 3000)}

QUESTION TO ANSWER:
"${questionText}"
${options && options.length > 0 ? `\nAVAILABLE OPTIONS:\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : ""}

YOUR ANSWER:`;

    const answer = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], { temperature: 0.1 });

    // Clean up answer
    let clean = answer.trim();
    if (clean.includes(':') && (clean.toLowerCase().startsWith('answer:') || clean.toLowerCase().startsWith('final answer:'))) {
      clean = clean.split(':').slice(1).join(':').trim();
    }
    clean = clean.replace(/^["']|["']$/g, '').trim();

    console.log(`🧠 ChatGPT Answered: "${questionText.substring(0, 40)}..." -> "${clean.substring(0, 50)}"`);
    return clean;
  } catch (err) {
    console.error("❌ AI Question Resolver Error:", err.message);
    return localFallbackResolve(questionText, profile, tagName);
  }
}

/**
 * Given a select or radio/checkbox group with multiple options, asks ChatGPT to pick the single best option.
 */
async function chooseBestOption(questionText, options, profile) {
  if (!options || options.length === 0) return null;

  try {
    const prompt = `You are filling out a job application for a candidate.
Question: "${questionText}"
Candidate Role: ${profile.role || "Full Stack Developer"}
Candidate Experience: ${profile.yearsOfExperience || 3} years
Notice Period: Immediate / 0 days
Work Auth: Authorized to work, no sponsorship needed.
Resume: ${(profile.resumeText || "").substring(0, 1500)}

Available Options:
${options.map((opt, i) => `[${i}] ${opt}`).join('\n')}

Select the SINGLE BEST matching option for this candidate.
Return ONLY the EXACT option text as it appears in the list. Do not include quotes or indices.`;

    const answer = await callAI([
      { role: "system", content: "You are an automated job applicant. Return only the exact chosen option text." },
      { role: "user", content: prompt }
    ], { temperature: 0.1 });

    const cleanAnswer = answer.trim().replace(/^["']|["']$/g, '');
    
    // Find closest match in options
    const exactMatch = options.find(o => o.trim().toLowerCase() === cleanAnswer.toLowerCase());
    if (exactMatch) return exactMatch;

    const partialMatch = options.find(o => o.toLowerCase().includes(cleanAnswer.toLowerCase()) || cleanAnswer.toLowerCase().includes(o.toLowerCase()));
    if (partialMatch) return partialMatch;

    return cleanAnswer;
  } catch (err) {
    console.error("⚠️ AI Option Selection failed:", err.message);
    // Simple heuristic fallback
    return options[0];
  }
}

/**
 * Given a single checkbox or radio option, asks ChatGPT if it should be selected ("Yes" / "No").
 */
async function shouldSelectOption(questionText, optionLabel, profile) {
  try {
    const prompt = `You are filling out a job application.
Question Context: "${questionText}"
Option Label: "${optionLabel}"
Candidate: Full Stack Developer (3 years exp, available immediately, authorized to work, no visa sponsorship needed).

Should this option be selected/checked?
Return ONLY "Yes" or "No".`;

    const answer = await callAI([
      { role: "system", content: "Return ONLY 'Yes' or 'No'." },
      { role: "user", content: prompt }
    ], { temperature: 0.1 });

    return answer.toLowerCase().includes("yes");
  } catch (e) {
    return false;
  }
}

/**
 * Local fallback heuristics if AI is offline
 */
function localFallbackResolve(questionText, profile, tagName) {
  const text = (questionText || "").toLowerCase().trim();

  if (text.includes("notice") || text.includes("start") || text.includes("availab") || text.includes("join") || text.includes("how soon")) {
    if (text.includes("day") || text.includes("number")) return "0";
    return "Immediate";
  }

  if (text.includes("sponsorship") || text.includes("visa")) return "No";
  if (text.includes("authorized") || text.includes("legal")) return "Yes";
  if (text.includes("agree") || text.includes("consent") || text.includes("confirm")) return "Yes";
  if (text.includes("year") || text.includes("experience")) return String(profile.yearsOfExperience || 3);
  if (text.includes("salary") || text.includes("ctc")) return profile.expectedCtc || "12 LPA";

  return "Yes";
}

module.exports = {
  rateResumeMatch,
  resolveQuestion,
  chooseBestOption,
  shouldSelectOption,
  isBasicPersonalInfo,
};
