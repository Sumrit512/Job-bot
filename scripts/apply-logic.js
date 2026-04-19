const path = require("path");
const readline = require("readline");
const { resolveQuestion } = require("./ai-resolver");
const { wait } = require("convex/server");

// --- TEST MODE FLAG ---
// Set to false to fully automate final submission.
const MANUAL_SUBMISSION = false; 
// ----------------------

async function handleNaukriChatbot(page, prefs) {
  // Check if the Naukri chatbot/drawer is open at all.
  // These selectors cover both the newer "recruiter question" drawer and the old chatbot overlay.
  const DRAWER_SELECTOR = [
    'div[class*="chatbot"]',
    'div[class*="Chatbot"]',
    '.chatbot_Overlay',
    '._chatBotContainer',
    '#_chatBotContainer',
    '.side-drawer',
    '.drawer-wrapper',
    // Naukri's newer recruiter-question panel
    'div[class*="questionnaire"]',
    'div[class*="Questionnaire"]',
  ].join(', ');

  const QUESTION_SELECTOR = [
    // Live Naukri drawer question elements (from HTML dump)
    '.botMsg span',
    '.msg span',
    '.botMsg',
    // Fallback selectors
    '.msg-text',
    '.msg-content',
    '.msgText',
    '.chatbot_Overlay .chat-msg',
    '.msg-cnt',
    '.message-text',
    '.drawer-content .question-text',
  ].join(', ');

  const INPUT_SELECTOR = [
    // Confirmed via live browser inspection: contenteditable div
    'div.textArea[id^="userInput__"]',
    'div.textArea',
    // Fallback standard fields
    '.chatbot_Overlay textarea',
    '.chatbot_Overlay input[type="text"]',
    '.side-drawer textarea',
    '.side-drawer input[type="text"]',
    // Newest Naukri drawer input (plain input inside the panel)
    'div[class*="chatbot"] input[type="text"]',
    'div[class*="questionnaire"] input[type="text"]',
    'div[class*="questionnaire"] textarea',
  ].join(', ');

  const SAVE_BTN_SELECTOR = [
    'div.sendMsg',
    'button.sendMsg',
    // Naukri's standalone "Save" button at the bottom of the drawer
    'div[class*="chatbot"] button:has-text("Save")',
    'div[class*="questionnaire"] button:has-text("Save")',
    '.chatbot_Overlay button:has-text("Save")',
    '.side-drawer button:has-text("Save")',
    // Generic fallbacks
    'button:has-text("Save")',
    'button:has-text("Send")',
  ].join(', ');

  try {
    // We already know it's visible from the outer loop, just grab the visible one.
    // Use evaluate to find the exact visible container element.
    const isVisible = await page.evaluate((selector) => {
      const els = Array.from(document.querySelectorAll(selector));
      return els.some(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
      });
    }, DRAWER_SELECTOR);

    if (!isVisible) {
      console.log("ℹ️ Chatbot was not detected as visible by evaluate script.");
      return false;
    }

    // Now we can use a robust locator for the rest of our operations
    const chatbotEl = page.locator(DRAWER_SELECTOR + ':visible').first();

    console.log("💬 Naukri Chatbot/Drawer detected. Starting Q&A loop...");

    // --- Inner Q&A Loop ---
    // Keeps answering questions until the bot says "thank you" or there are no more.
    const MAX_QUESTIONS = 20;
    for (let qNum = 0; qNum < MAX_QUESTIONS; qNum++) {
      // Give the UI time to render the next question
      await page.waitForTimeout(1500);

      // 1. Check for standard form fields inside the drawer (non-chatbot style)
      const drawerInput = page.locator('.side-drawer input:not([type="hidden"]), .side-drawer select, .side-drawer textarea').first();
      if (await drawerInput.isVisible().catch(() => false)) {
        console.log("ℹ️  Found standard form fields in drawer, delegating to form filler.");
        await answerFormQuestions(page, prefs);
        const saveBtn = page.locator(SAVE_BTN_SELECTOR).first();
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click({ force: true });
          await page.waitForTimeout(2000);
        }
        return true;
      }

      // 2. Grab ALL visible question/message bubbles and take the LAST one
      const allMessages = await page.locator(QUESTION_SELECTOR).allTextContents().catch(() => []);
      const questionText = allMessages.map(m => m.trim()).filter(m => m.length > 3).pop() || "";

      const isGreeting = (q) => {
        const lower = q.toLowerCase();
        return lower.includes("thank you") || lower.includes("hi sumrit") || lower.includes("hello") ||
               lower.includes("showing interest") || lower.includes("kindly answer") || lower.includes("successfully apply");
      };

      if (!questionText || isGreeting(questionText)) {
        // Check whether the bot is "done" (a thank-you message means application submitted)
        const bodyText = await page.innerText('body').catch(() => '');
        if (bodyText.toLowerCase().includes("thank you") || bodyText.includes("Applied successfully")) {
          console.log("✨ Chatbot finished — application submitted by bot.");
          return true;
        }
        console.log(`ℹ️  No actionable question found yet (attempt ${qNum + 1}). Waiting...`);
        continue;
      }

      // 3. Skip if we already answered the same question this cycle
      console.log(`❓ Chatbot Question [${qNum + 1}]: "${questionText.substring(0, 100)}"`);

      // 4. Check if the input field is currently visible/enabled
      const inputEl = page.locator(INPUT_SELECTOR).first();
      const inputVisible = await inputEl.isVisible().catch(() => false);
      if (!inputVisible) {
        // Maybe we're between questions — wait briefly and try again
        await page.waitForTimeout(1000);
        continue;
      }

      // 5. Get AI answer
      const aiAnswer = await resolveQuestion(questionText, prefs, 'input');
      if (!aiAnswer) {
        console.warn("⚠️  AI returned no answer for this question. Skipping.");
        continue;
      }
      console.log(`✍️   Answer: "${aiAnswer}"`);

      // 6. Fill the input
      await inputEl.click({ force: true });
      await page.waitForTimeout(200);

      // Try fill() first (works for regular inputs), fallback to keyboard typing (for contenteditable)
      const tagName = await inputEl.evaluate(el => el.tagName.toLowerCase()).catch(() => 'div');
      const isContentEditable = await inputEl.evaluate(el => el.isContentEditable).catch(() => false);

      if (tagName === 'input' || tagName === 'textarea') {
        await inputEl.fill(aiAnswer);
      } else if (isContentEditable) {
        // contenteditable div — must use keyboard
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.keyboard.type(aiAnswer, { delay: 25 });
      } else {
        // Unknown — try both
        await inputEl.fill(aiAnswer).catch(() => {});
        const val = await inputEl.inputValue().catch(() => null);
        if (!val) {
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Delete');
          await page.keyboard.type(aiAnswer, { delay: 25 });
        }
      }

      await page.waitForTimeout(400);

      // 7. Click Save / Send
      const saveBtnEl = page.locator(SAVE_BTN_SELECTOR).first();
      if (await saveBtnEl.isVisible().catch(() => false)) {
        await saveBtnEl.click({ force: true });
        console.log("💾 Clicked Save.");
      } else {
        await page.keyboard.press('Enter');
        console.log("⌨️  Pressed Enter to submit.");
      }

      // Wait for next question to render
      await page.waitForTimeout(2500);

      // 8. Check if the drawer closed (application submitted)
      const stillOpen = await chatbotEl.isVisible().catch(() => false);
      if (!stillOpen) {
        console.log("✅ Chatbot drawer closed — application submitted.");
        return true;
      }
    }

    console.log("⚠️  Reached max chatbot Q&A iterations.");
    return true;
  } catch (err) {
    console.warn("⚠️ Chatbot/Drawer handling error:", err.message);
    return false;
  }
}

function waitForKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question("--- LOG IN MANUALLY AND PRESS ENTER HERE TO CONTINUE ---", (ans) => {
    rl.close();
    resolve(ans);
  }));
}

async function answerFormQuestions(page, prefs) {
  try {
    const frames = page.frames();
    console.log(`🤖 Form Filler: Found ${frames.length} frames.`);
    
    let allFoundElements = [];

    for (const frame of frames) {
      const isVisible = await frame.locator('input, select, textarea').first().isVisible().catch(() => false);
      if (!isVisible && frames.length > 1) continue; // Skip hidden frames

      const elements = await frame.evaluate(() => {
        const findQuestionText = (el) => {
          let text = "";
          if (el.getAttribute('aria-label')) text = el.getAttribute('aria-label');
          if (!text && el.getAttribute('placeholder')) text = el.getAttribute('placeholder');
          if (!text && el.getAttribute('aria-labelledby')) {
            const labelEl = document.getElementById(el.getAttribute('aria-labelledby'));
            if (labelEl) text = labelEl.innerText;
          }
          if (!text && el.id) {
            const label = document.querySelector(`label[for="${el.id.replace(/:/g, '\\:')}"]`);
            if (label) text = label.innerText;
          }
          if (!text) {
            const section = el.closest('.jobs-easy-apply-form-section__grouping, .jobs-easy-apply-form-element, .fb-dash-form-element, .fb-dash-form-section, .display-flex.flex-column');
            if (section) text = section.innerText;
          }
          if (!text && el.parentElement) text = el.parentElement.innerText;
          
          // Check for validation errors nearby to help AI realize it needs a different format
          const errorSelectors = [
            '.artdeco-inline-feedback--error', 
            '.artdeco-inline-feedback__message',
            '[role="alert"]', 
            '.fb-dash-error-message',
            '.inline-error-message',
            '.fb-form-element__error-message'
          ];
          const errorEl = el.closest('.fb-dash-form-element, .jobs-easy-apply-form-element, .fb-dash-form-section, .jobs-easy-apply-form-section__grouping')?.querySelector(errorSelectors.join(', '));
          if (errorEl) {
            text += " (ERROR: " + errorEl.innerText + ")";
          }
          
          return text ? text.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 250) : "";
        };

        const result = [];
        const scan = (root) => {
          const fields = root.querySelectorAll('input, select, textarea');
          fields.forEach(el => {
            const qtext = findQuestionText(el);
            // Check for visibility (basic check)
            const style = window.getComputedStyle(el);
            const isHidden = style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null;
            
            // Ignore site header/footer search bars, layout toggles, and VideoJS elements
            const isGlobalSearch = el.closest('#ni-gnb-searchbar, .nI-gNb-sb__main, .nI-gNb-sb, .global-navbar, header');
            if (!qtext || qtext === "..." || qtext.includes("search") || isGlobalSearch || qtext.includes("select language") || el.id?.includes("adToggle") || el.id?.includes("vjs_") || isHidden) return;

            // Skip resume and cover letter upload steps (leave default selection)
            if (el.id?.includes("jobsDocumentCardToggle") || el.id?.includes("document-upload") || el.type === "file" || qtext.includes("include an updated resume") || qtext.includes("cover letter")) return;

            // Skip "Follow company" checkbox, we manually handle unchecking it before submit
            if (el.id?.includes("follow-company") || (qtext.includes("follow") && qtext.includes("stay up to date"))) return;

            result.push({ 
              tagName: el.tagName,
              id: el.id, 
              name: el.name,
              className: el.className,
              text: qtext, 
              value: el.value,
              selectedIndex: el.selectedIndex,
              checked: el.checked,
              type: el.type,
              label: (['radio', 'checkbox'].includes(el.type)) ? (el.parentElement?.innerText || "").toLowerCase().trim() : ""
            });
          });

          // Recurse into Shadow DOMs
          root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) scan(el.shadowRoot);
          });
        };

        scan(document);
        return result;
      });

      if (elements.length > 0) {
        console.log(`🤖 Frame [${frame.name() || 'main'}]: Found ${elements.length} elements.`);
        for (const el of elements) {
          console.log(`   - [${el.tagName}] ID: ${el.id}, Text: "${el.text.substring(0, 50)}..."`);
          allFoundElements.push({ ...el, frame });
        }
      }
    }


    for (const el of allFoundElements) {
      if (!el.id) continue;
      // Use [id="..."] exact attribute selector to prevent CSS parsing errors with colons, parentheses, etc.
      const safeId = el.id.replace(/"/g, '\\"');
      const locator = el.frame.locator(`[id="${safeId}"]`);

      // 1. Handle Text & Textarea
      if ((el.tagName === 'INPUT' && el.type !== 'radio' && el.type !== 'checkbox') || el.tagName === 'TEXTAREA') {
        let valueToFill = null;
        if (el.text.includes('full name') || el.text.includes('your name')) {
          valueToFill = prefs.fullName || null;
        } else if (el.text.includes('phone') || el.text.includes('mobile')) {
          valueToFill = prefs.phone || null;
        } else if (el.text.includes('github')) {
          valueToFill = prefs.githubId || null;
        } else if (el.text.includes('portfolio') || el.text.includes('website')) {
          valueToFill = prefs.portfolioUrl || prefs.linkedinId || null;
        } else if (el.text.includes('linkedin')) {
          valueToFill = prefs.linkedinId || null;
        } else if (el.text.includes('current company') || el.text.includes('employer')) {
          valueToFill = prefs.currentCompany || null;
        } else if (el.text.includes('current title') || el.text.includes('designation')) {
          valueToFill = prefs.currentTitle || null;
        } else if (el.text.includes('street address')) {
          valueToFill = prefs.streetAddress || null;
        } else if (el.text.includes('city')) {
          valueToFill = prefs.city || null;
        } else if (el.text.includes('state') || el.text.includes('province')) {
          valueToFill = prefs.state || null;
        } else if (el.text.includes('zip') || el.text.includes('postal')) {
          valueToFill = prefs.zipCode || null;
        } else if (el.text.includes('country')) {
          valueToFill = prefs.country || null;
        } else if (el.text.includes('earliest start date') || el.text.includes('availability date') || el.text.includes('how soon') || el.text.includes('notice period')) {
          if (el.text.includes('days') || el.text.includes('how many')) {
            valueToFill = "0";
          } else {
            valueToFill = "Immediate";
          }
        } else if ((el.text.includes('city') || el.text.includes('location')) && !el.value) {
          valueToFill = prefs.location || null;
        } else if (prefs.resumeText) {
          // AI Fallback for complex questions
          console.log(`🧠 Consulting AI for: "${el.text.substring(0, 40)}..."`);
          valueToFill = await resolveQuestion(el.text, prefs, 'input');
        }

        if (valueToFill !== null && el.value !== valueToFill) {
          console.log(`✍️  Filling input "${el.text.substring(0, 30)}..." with: ${valueToFill}`);
          await locator.click();
          await page.waitForTimeout(200);
          await locator.fill(""); // Clear
          await locator.fill(valueToFill);
          
          // Double check with keyboard if it didn't take
          const currentVal = await locator.inputValue();
          if (currentVal !== valueToFill) {
            console.log(`⌨️  React detected! Using keyword typing for: ${valueToFill}`);
            await locator.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(valueToFill);
          }
          await page.waitForTimeout(300);
          
          // If it's a location field, ensure we select from the autocomplete dropdown
          if (el.text.includes('location') || el.text.includes('city')) {
            await locator.click();
            await page.waitForTimeout(1000); // Wait for dropdown to show
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(300);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(800);
          }
        }
      }

      
      // 2. Handle Select
      const isSelectDefault = el.selectedIndex === 0 || el.value === "" || el.text.toLowerCase().includes("select an opt");
      if (el.tagName === 'SELECT' && isSelectDefault) {
        let targetRegex = null;
        let optionSelected = false;

        if (el.text.includes('experience') || el.text.includes('years')) {
          targetRegex = /3|mid|intermediate/i;
        } else if (el.text.includes('authorized') || el.text.includes('citizenship') || el.text.includes('comfortable') || el.text.includes('contract') || el.text.includes('weeks') || el.text.includes('join') || el.text.includes('start') || el.text.includes('notice')) {
          targetRegex = /yes|immediately|now|0|less than|none/i;
        } else if (el.text.includes('sponsorship')) {
          targetRegex = /no/i;
        } else if (el.text.includes('email')) {
          targetRegex = /arora|sumrit/i; // Match user email from profile
        } else if (el.text.includes('country code')) {
          targetRegex = /india|\+91/i; // Default to India as per profile
        }

        if (targetRegex) {
          const options = await locator.locator('option').allTextContents();
          for (let i = 1; i < options.length; i++) {
            if (targetRegex.test(options[i])) {
              console.log(`✅ Selecting join/contract option: "${options[i].trim()}"`);
              await locator.selectOption({ index: i });
              optionSelected = true;
              await page.waitForTimeout(300);
              break;
            }
          }
        } 
        
        if (!optionSelected && prefs.resumeText) {
          // AI Fallback for complex select if regex failed or wasn't applicable
          console.log(`🧠 Consulting AI for select: "${el.text.substring(0, 40)}..."`);
          const options = await locator.locator('option').allTextContents();
          const cleanOptions = options.slice(1).map(o => o.trim()).filter(o => o); // Skip "Select an option"
          
          let aiText = el.text + " (Options: " + cleanOptions.join(', ') + ")";
          if (el.text.includes('notice') || el.text.includes('join') || el.text.includes('start') || el.text.includes('availab')) {
            aiText += " (Note: Candidate is available to join IMMEDIATELY)";
          }
          const aiAnswer = await resolveQuestion(aiText, prefs, 'select');
          if (aiAnswer) {
            for (let i = 1; i < options.length; i++) {
              if (options[i].toLowerCase().includes(aiAnswer.toLowerCase()) || aiAnswer.toLowerCase().includes(options[i].toLowerCase())) {
                console.log(`✅ AI matching select: "${options[i].trim()}"`);
                await locator.selectOption({ index: i }, { timeout: 3000 }).catch(err => {
                   console.warn(`⚠️ Warning: Selection failed for "${options[i].trim()}": ${err.message}`);
                });
                optionSelected = true;
                await page.waitForTimeout(300);
                break;
              }
            }
          }
        }
      }

      // 3. Handle Radio & Checkbox
      if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox') && !el.checked) {
        let target = null;
        if (el.text.includes('have') || el.text.includes('experience') || el.text.includes('comfortable') || el.text.includes('authorized') || el.text.includes('legally') || el.text.includes('join') || el.text.includes('period') || el.text.includes('start') || el.text.includes('availab') || el.text.includes('declare') || el.text.includes('agree') || el.text.includes('consent') || el.text.includes('privacy')) {
          target = "yes";
        } else if (el.text.includes('sponsorship') || el.text.includes('visa')) {
          target = "no";
        }
        
        // Handle direct labels like "I consent"
        const isConsent = el.label.includes("consent") || el.label.includes("agree") || el.label.includes("yes");
        
        if ((target && el.label.includes(target)) || (target === "yes" && isConsent)) {
          console.log(`🔘 Clicking ${el.type}: "${el.label || el.text.substring(0, 30)}"`);
          await locator.click({ force: true });
          await page.waitForTimeout(300);
        } else if (prefs.resumeText) {
          // AI Fallback for complex radio/checkbox
          console.log(`🧠 Consulting AI for selection (${el.type}): "${el.text.substring(0, 40)}..."`);
          const aiAnswer = await resolveQuestion(el.text + " (Options: " + (el.label || "Check/Uncheck") + ")", prefs, 'radio');
          if (aiAnswer && (aiAnswer.toLowerCase().includes('yes') || aiAnswer.toLowerCase().includes('check') || (el.label && (el.label.includes(aiAnswer.toLowerCase()) || aiAnswer.toLowerCase().includes(el.label.toLowerCase()))))) {
            console.log(`✅ AI matching selection (${el.type}): "${el.label || 'checked'}"`);
            await locator.click({ force: true });
            await page.waitForTimeout(300);
          }
        }
      }
    }
  } catch (err) {
    console.error("⚠️ Error filling form questions:", err.message);
  }
}

async function checkAllLogins(page) {
  const platforms = [
    { 
      name: 'LinkedIn', 
      url: 'https://www.linkedin.com/feed/', 
      markers: ['nav.global-nav', '.nav-item--me'] 
    },
    { 
      name: 'Naukri', 
      url: 'https://www.naukri.com/', 
      markers: ['.nI-g_nav-profile', 'a[href*="naukri.com/mnjuser/profile"]'] 
    },
    /*
    { 
      name: 'Indeed', 
      url: 'https://www.indeed.com/', 
      markers: ['a[href*="/myjobs"]', 'button#PrimaryNav-userProfile', '.gnav-LoggedOutAccountIcon'] 
    },
    */
    { 
      name: 'Internshala', 
      url: 'https://internshala.com/student/dashboard', 
      markers: ['.nav-item.profile_container', 'a[href*="/student/dashboard"]'] 
    }
  ];

  console.log("\n🛡️  Starting Global Login Check...");
  for (const p of platforms) {
    console.log(`🔍 Checking ${p.name}...`);
    try {
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      let loggedIn = false;
      for (const marker of p.markers) {
        if (await page.isVisible(marker)) {
          loggedIn = true;
          break;
        }
      }

      // if (p.name === 'Indeed' && await page.isVisible('.gnav-LoggedOutAccountIcon')) loggedIn = false;

      if (!loggedIn) {
        console.log(`\n⚠️  NOT LOGGED IN TO ${p.name.toUpperCase()}! ⚠️`);
        console.log(`Please log in to ${p.name} in the browser window and then press ENTER here.`);
        await waitForKey();
        console.log(`✅ ${p.name} login confirmed.`);
      } else {
        console.log(`✅ Already logged in to ${p.name}.`);
      }
    } catch (e) {
      console.log(`⚠️  Could not verify login for ${p.name}: ${e.message}`);
    }
  }
  console.log("🚀 All logins verified! Starting applications...\n");
  page.sessionAuthenticated = true;
}

async function autoApply(page, jobUrl, resumePath, prefs) {
  let applied = false;
  const platform = jobUrl.includes('linkedin.com') ? 'LinkedIn' :
                   jobUrl.includes('naukri.com') ? 'Naukri' :
                   jobUrl.includes('indeed.com') ? 'Indeed' :
                   jobUrl.includes('internshala.com') ? 'Internshala' : 'Unknown';

  try {
    console.log(`--- Applying to [${platform}]: ${jobUrl} ---`);
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // 1. Handle Login Context per Platform
    if (!page.sessionAuthenticated) {
      let loginMarkers = [];
      if (platform === 'LinkedIn') loginMarkers = ['nav.global-nav', '.nav-item--me'];
      else if (platform === 'Naukri') loginMarkers = ['.nI-g_nav-profile', 'a[href*="naukri.com/mnjuser/profile"]'];
      // else if (platform === 'Indeed') loginMarkers = ['a[href*="/myjobs"]', 'button#PrimaryNav-userProfile'];
      else if (platform === 'Internshala') loginMarkers = ['.nav-item.profile_container', 'a[href*="/student/dashboard"]'];

      let loggedIn = false;
      for (const selector of loginMarkers) {
        if (await page.isVisible(selector)) { loggedIn = true; break; }
      }

      if (!loggedIn && !jobUrl.includes('login')) {
        console.log(`\n⚠️  NOT LOGGED IN TO ${platform.toUpperCase()}! ⚠️`);
        console.log("Please log in in the opened browser window and then press ENTER.");
        await waitForKey();
        page.sessionAuthenticated = true;
        console.log("🚀 Continuing...");
        await page.waitForTimeout(2000);
      } else {
        page.sessionAuthenticated = true;
      }
    }

    await page.waitForTimeout(4000);

    // 2. Identify and Click initial Apply Button
    let applySelector = '';
    if (platform === 'LinkedIn') applySelector = '.jobs-apply-button--top-card button, .jobs-apply-button, button:has-text("Easy Apply"), button:has-text("Apply"), a:has-text("Easy Apply"), a:has-text("Apply"), .jobs-s-apply button';
    else if (platform === 'Naukri') applySelector = 'button.apply-button, .apply-button-container button, button:has-text("Apply")';
    // else if (platform === 'Indeed') applySelector = 'button#indeedApplyButton, span:has-text("Apply now"), button:has-text("Apply now")';
    else if (platform === 'Internshala') applySelector = '.apply_now_button, button:has-text("Apply now")';

    let applyButton = null;
    let isVisible = false;
    
    // Poll the DOM for up to 15 seconds to find a visible apply button
    for (let attempt = 0; attempt < 15; attempt++) {
      const allButtons = await page.locator(applySelector).all();
      for (const btn of allButtons) {
        if (await btn.isVisible()) {
          // Double check it's not a generic sitewide button if it just says 'Apply'
          const text = await btn.innerText().catch(() => "");
          if (text) {
             applyButton = btn;
             isVisible = true;
             break;
          }
        }
      }
      if (isVisible) break;
      await page.waitForTimeout(1000);
    }
    
    if (!isVisible || !applyButton) {
      console.log(`📸 Apply button not found for ${platform}. Saving debug: debug_${platform.toLowerCase()}_fail.png`);
      await page.screenshot({ path: `debug_${platform.toLowerCase()}_fail.png` });
      return false;
    }

    const buttonText = await applyButton.innerText();
    console.log(`🖱️  Found ${platform} apply button ("${buttonText.trim()}"). Clicking...`);
    await applyButton.click();
    
    // Special handling for Naukri: give it time to either show a success message or open a chatbot/drawer
    if (platform === 'Naukri') {
      let naukriSuccess = false;
      for (let i = 0; i < 10; i++) {
        const text = await page.innerText('body');
        if (text.includes('Applied successfully') || text.includes('Applied to "') || page.url().includes('applied-successfully')) {
          naukriSuccess = true;
          break;
        }
        // Check if chatbot is visible
        if (await page.locator('.chatbot_Overlay, .side-drawer, .drawer-wrapper').first().isVisible()) {
          console.log("💬 Naukri Chatbot/Drawer appeared!");
          break;
        }
        await page.waitForTimeout(1000);
      }
    } else {
      await page.waitForTimeout(3000);
    }

    // 3. Multi-step form automation
    let canProceed = true;
    let steps = 0;
    let lastButtonText = "";
    let repeatCount = 0;

    while (canProceed && steps < 15) {
      steps++;
      
      const currentUrl = page.url();
      // 3.4 Success detection
      const text = await page.innerText('body');
      if (text.includes('Applied successfully') || text.includes('Applied to "') || currentUrl.includes('saveApply') || currentUrl.includes('applied-successfully')) {
        console.log("✅ Application confirmed successful!");
        break; 
      }

      // 3.5 Handle Naukri Chatbot if present
      // handleNaukriChatbot now handles the ENTIRE Q&A session internally.
      // If it returns true, the chatbot was present and handled — treat as applied for Naukri.
      const chatbotWasPresent = await handleNaukriChatbot(page, prefs);
      if (chatbotWasPresent) {
        console.log("ℹ️ Chatbot session completed.");
        // Check if the application actually went through
        await page.waitForTimeout(2000);
        const bodyText = await page.innerText('body').catch(() => '');
        if (bodyText.includes('Applied successfully') || bodyText.includes('Applied to "') || page.url().includes('applied-successfully')) {
          console.log("✅ Naukri chatbot application confirmed successful!");
          applied = true;
        } else {
          // Chatbot answered all questions — Naukri may have auto-submitted
          console.log("✅ Naukri chatbot Q&A complete. Marking as applied.");
          applied = true;
        }
        canProceed = false;
        break;
      }

      await answerFormQuestions(page, prefs);
      await page.waitForTimeout(1000);

      // Handle LinkedIn-specific "Follow company"
      if (platform === 'LinkedIn') {
        try {
          const followLabel = page.locator('label:has-text("stay up to date")').first();
          if (await followLabel.isVisible()) {
            const forAttr = await followLabel.getAttribute('for');
            if (forAttr) {
              const cb = page.locator(`input#${forAttr.replace(/:/g, '\\\\:')}`);
              if (await cb.isChecked()) { await followLabel.click({ force: true }); console.log("🚫 Unchecked 'Follow company'"); }
            }
          }
        } catch (e) {}
      }

      // 4. Find Navigation Buttons
      const submitSelectors = [
        'button:has-text("Submit application")', 'button:has-text("Submit")', 
        'button:has-text("Apply now")', 'button:has-text("Finish")',
        'button#submit', 'button[aria-label*="Submit"]'
      ];
      const nextSelectors = [
        'button:has-text("Next")', 'button:has-text("Continue")', 
        'button:has-text("Review")', 'button[aria-label*="Next"]',
        'button[aria-label*="Continue"]', '#continue-button'
      ];
      const doneSelectors = [
        'button:has-text("Done")', 'button[aria-label="Dismiss"]', 
        '.post-apply-icon', 'h2:has-text("Application sent")'
      ];

      const submitButton = page.locator(submitSelectors.join(', ')).first();
      const nextButton = page.locator(nextSelectors.join(', ')).first();
      const doneButton = page.locator(doneSelectors.join(', ')).first();

      let currentButton = "";
      if (await submitButton.isVisible()) currentButton = "Submit";
      else if (await nextButton.isVisible()) currentButton = await nextButton.innerText();

      if (currentButton === lastButtonText && currentButton !== "") {
        repeatCount++;
        if (repeatCount > 3) { console.log(`⚠️ Stuck on "${currentButton.trim()}". Skipping.`); canProceed = false; break; }
      } else { repeatCount = 0; lastButtonText = currentButton; }

      if (await submitButton.isVisible()) {
        if (typeof MANUAL_SUBMISSION !== 'undefined' && MANUAL_SUBMISSION) {
          console.log("\n🚨 READY TO SUBMIT! Please review and click ENTER here.");
          await waitForKey();
          applied = true;
        } else {
          await submitButton.click({ force: true });
          console.log("✨ Application Submitted!");
          applied = true;
          await page.waitForTimeout(4000);
        }
        canProceed = false;
      } else if (await nextButton.isVisible()) {
        console.log(`➡️  Clicking Next/Continue...`);
        await nextButton.click({ force: true });
        await page.waitForTimeout(2000);
        
        const errorVisible = await page.evaluate(() => {
          const sels = ['.error', '.alert', '[aria-invalid="true"]', '.fb-dash-error-message', '.artdeco-inline-feedback--error'];
          return sels.some(s => !!document.querySelector(s)) || document.body.innerText.toLowerCase().includes("please enter a valid answer");
        });
        
        if (errorVisible) { console.log("⚠️ Validation error on form. Skipping."); canProceed = false; break; }
      } else if (await doneButton.isVisible()) {
        console.log("✅ Application confirmed.");
        applied = true;
        canProceed = false;
      } else {
        if (platform === 'Naukri' && steps === 1) {
           // Verify if it ACTUALLY applied
           const bodyText = await page.innerText('body');
           if (bodyText.includes('Applied successfully') || bodyText.includes('Applied to "') || page.url().includes('applied-successfully')) {
             console.log("✅ One-tap apply successful.");
             applied = true;
           } else {
             console.log("⏹️  No more steps found, but success message not detected. Marking as skipped for safety.");
             applied = false;
           }
        } else {
           console.log("⏹️  No more steps found.");
        }
        canProceed = false;
      }
    }
  } catch (err) {
    console.error(`❌ Error in autoApply (${platform}):`, err.message);
  }
  return applied;
}

module.exports = { autoApply, checkAllLogins };


