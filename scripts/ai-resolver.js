const { Groq } = require('groq-sdk');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Resolves a question using Groq AI based on user profile context.
 */
async function resolveQuestion(questionText, profile, tagName = 'input') {
  try {
    const prompt = `
      You are an expert career assistant helping a candidate apply for a job.
      Based on the candidate's Resume and Profile below, answer the specific form question.
      
      RESUME TEXT:
      ${profile.resumeText || "No resume text provided."}
      
      USER PROFILE:
      - Full Name: ${profile.fullName || "Not provided"}
      - Phone: ${profile.phone || "Not provided"}
      - Date of Birth: ${profile.dob || "Not provided"}
      - Current Role: ${profile.currentTitle || profile.role}
      - Current Company: ${profile.currentCompany || "Not provided"}
      - Experience Level: ${profile.experience}
      - Target Location: ${profile.location}
      - Salary Expectation: ${profile.salaryRange || profile.salary}
      - Current CTC: ${profile.currentCtc || "Not provided"}
      - Expected CTC: ${profile.expectedCtc || "Not provided"}
      - Notice Period: ${profile.noticePeriod || "Not provided"}
      - Education: ${profile.degree} from ${profile.university} (Grad: ${profile.gradYear})
      
      MAILING ADDRESS:
      - Street: ${profile.streetAddress || "Not provided"}
      - City/State/Zip: ${profile.city}, ${profile.state} ${profile.zipCode}
      - Country: ${profile.country || "Not provided"}
      
      DEMOGRAPHICS (Optional/EEO):
      - Gender: ${profile.gender || "Decline to self-identify"}
      - Ethnicity: ${profile.ethnicity || "Decline to self-identify"}
      - Veteran: ${profile.veteranStatus || "No"}
      - Disability: ${profile.disabilityStatus || "No"}
      - Pronouns: ${profile.pronouns || "Not provided"}
      
      TECH STACK & PROFICIENCY:
      - Assume high proficiency for ALL technologies, tools, and platforms mentioned in the resume or required for this job role.
      - If asked for years of experience directly for ANY specific tech, tool, language, or framework, ALWAYS provide exactly ${profile.yearsOfExperience || 4} years. Do not reduce the number.
      
      CUSTOM METRICS (For tricky or specific form questions):
      - Total Projects Completed: ${profile.numberOfProjects || "Many"} (If asked for number of projects, apps, products, or third-party APIs integrated, answer around this number or slightly higher).
      - Fitness / Gym Frequency: ${profile.fitnessFrequency || "Not provided"} (If asked how many days you go to the gym, do fitness exercises, or do yoga/meditation, strictly answer using this text/frequency).

      AVAILABILITY:
      - Start Date: Immediate (PRIORITY: Always answer any availability question as "Immediate", "0 days", or "Immediately")
      - Willing to Relocate: ${profile.willingToRelocate ? "Yes" : "No"}
      
      MOTIVATION:
      - Why this role: ${profile.whyThisRole || "Refer to resume/experience."}
      - Achievement: ${profile.biggestAchievement || "Refer to resume."}
      
      PROFESSIONAL LINKS:
      - GitHub: ${profile.githubId || "Not provided"}
      - Portfolio: ${profile.portfolioUrl || "Not provided"}
      - LinkedIn: ${profile.linkedinId || "Not provided"}
      
      WORK AUTH:
      - Authorized: ${profile.workAuthorization ? "Yes" : "No"}
      - Sponsorship needed: ${profile.visaSponsorship ? "Yes" : "No"}
      
      QUESTION:
      "${questionText}"
      
      INSTRUCTIONS:
      1. Provide ONLY THE RAW VALUE (e.g., 'Sumrit', '4', 'Yes', '1500000').
      2. No conversational filler, no formatting, no quotes. JUST THE DATA.
      3. For Dates (like DOB), ALWAYS follow the format requested in the question text or placeholder (e.g., if it says DDMMYYYY, provide 01011995; if it says DD/MM/YYYY, provide 01/01/1995).
      4. For Numbers (Experience, Salary, Notice Period), follow the specific unit or precision requested.
      5. If the question asks for "INR" but the profile is in "Lakhs" (e.g., 12.0), and the form expects a full number (e.g., > 100000), convert intelligently.
      6. For Yes/No or Radio buttons, provide ONLY "Yes", "No", or the specific option name.
      7. Be flexible: Prioritize the format implied or stated by the question/placeholder over everything else.
      8. SPECIAL CASE (Availability): If the question is about when you can start, notice period, or availability, ALWAYS provide an answer that indicates "Immediate Availability".
         - For numeric answers: Provide "0" or "0 days".
         - For word answers: Provide "Immediate" or "Immediately".
         - For selection/multiple choice: Choose the option that most closely matches "Available to join immediately".
      
      FINAL ANSWER:
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
    });

    let answer = chatCompletion.choices[0].message.content.trim();
    
    // Clean up "Based on..." or "The answer is..." style filler if it sneaks in
    if (answer.includes(':')) {
       // If it has a colon, it's often "Answer: Value" or "Final Answer: Value"
       const parts = answer.split(':');
       const lastPart = parts[parts.length - 1].trim();
       // Only replace if the part before the colon looks like a label
       if (answer.toLowerCase().includes('answer') || answer.toLowerCase().includes('result')) {
         answer = lastPart;
       }
    }
    
    // Strip quotes and leading/trailing punctuation that LLMs sometimes add
    answer = answer.replace(/^["']|["']$/g, '').trim();

    // Final sanity check for "whole number" requirements
    if (questionText.toLowerCase().includes('whole') || questionText.toLowerCase().includes('integer') || questionText.toLowerCase().includes('day')) {
      // If it's a numeric value with a decimal .0, strip it
      if (/^\d+\.0+$/.test(answer)) {
        answer = answer.split('.')[0];
      }
    }

    console.log(`🧠 AI Resolver: Answered "${questionText.substring(0, 40)}..." with "${answer}"`);
    return answer;
  } catch (err) {
    console.error("❌ AI Resolver Error:", err.message);
    console.log("⚠️ Groq API failed. Using local rule-based fallback...");
    return localFallbackResolve(questionText, profile, tagName);
  }
}

/**
 * Fallback resolver using heuristics and user profile context when the LLM is unavailable.
 */
function localFallbackResolve(questionText, profile, tagName) {
  const text = questionText.toLowerCase().trim();

  // 1. Notice period / availability / start date
  if (text.includes("notice") || text.includes("start") || text.includes("availab") || text.includes("join") || text.includes("how soon")) {
    if (text.includes("day") || text.includes("week") || text.includes("month") || text.includes("number")) {
      return "0";
    }
    return "Immediate";
  }

  // 2. Visa / H1B / Sponsorship
  if (text.includes("sponsorship") || text.includes("visa") || text.includes("h1b") || text.includes("permit") || text.includes("citizenship")) {
    // Return Yes if profile requires sponsorship, otherwise No (default candidate doesn't need sponsorship)
    return profile.visaSponsorship ? "Yes" : "No";
  }

  // 3. Authorization / Eligibility
  if (text.includes("authorized") || text.includes("citizen") || text.includes("legal") || text.includes("work in") || text.includes("legally")) {
    return profile.workAuthorization ? "Yes" : "No";
  }

  // 4. Agreement / Consent / Background Check
  if (text.includes("agree") || text.includes("consent") || text.includes("declare") || text.includes("background check") || text.includes("privacy") || text.includes("confirm")) {
    return "Yes";
  }

  // 5. Demographics (Gender, Ethnicity, Veteran, Disability)
  if (text.includes("gender") || text.includes("sex")) {
    return profile.gender || "Decline to self-identify";
  }
  if (text.includes("ethnicity") || text.includes("race")) {
    return profile.ethnicity || "Decline to self-identify";
  }
  if (text.includes("veteran")) {
    return profile.veteranStatus || "No";
  }
  if (text.includes("disability") || text.includes("handicap")) {
    return profile.disabilityStatus || "No";
  }

  // 6. Technology skills / Years of experience
  // If the question is short (often just a skill name e.g. "React.JS") or contains terms related to experience
  const words = text.split(/\s+/);
  const isProbablySkill = text.length < 40 && !text.includes("?") && !words.some(w => ["what", "why", "where", "how", "who", "when", "describe", "explain", "please"].includes(w));
  
  const isSkillQuestion = isProbablySkill || (
    text.includes("react") || text.includes("typescript") || text.includes("javascript") || 
    text.includes("playwright") || text.includes("aws") || text.includes("node") || 
    text.includes("python") || text.includes("css") || text.includes("html") || 
    text.includes("frontend") || text.includes("backend") || text.includes("developer") ||
    text.includes("engineer") || text.includes("database") || text.includes("sql") ||
    text.includes("git") || text.includes("docker") || text.includes("kubernetes") ||
    text.includes("programming") || text.includes("coding") || text.includes("development")
  );
  
  if (text.includes("year") || text.includes("experience") || text.includes("how long") || isSkillQuestion) {
    // Return years of experience as a string digit
    return String(profile.yearsOfExperience || 4);
  }

  // 7. General Yes/No questions
  if (text.includes("do you") || text.includes("have you") || text.includes("are you") || text.includes("can you")) {
    return "Yes";
  }

  // 8. General numeric questions
  if (text.includes("how many") || text.includes("number of") || text.includes("count")) {
    return "3";
  }

  // Default fallback
  return "Yes";
}

module.exports = { resolveQuestion };
