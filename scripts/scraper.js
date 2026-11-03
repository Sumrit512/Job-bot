const { chromium } = require("playwright");
const path = require("path");
const readline = require("readline");

// --- CONFIGURATION ---
// Default pages to scan across platforms if not specified
const DEFAULT_MAX_PAGES = 1; 
// ---------------------

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

async function scrapeNaukri(role, location, maxPages = DEFAULT_MAX_PAGES) {
  console.log(`🔍 Searching Naukri for ${role} in ${location} (up to ${maxPages} page${maxPages > 1 ? 's' : ''})...`);
  const userDataDir = path.join(__dirname, "../.user_data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"]
  });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    // Naukri URL structure: naukri.com/role-jobs-in-location
    const cleanRole = role.toLowerCase().replace(/\s+/g, '-');
    const cleanLoc = location.toLowerCase().replace(/\s+/g, '-');
    const allFoundJobs = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`📄 Naukri: Scraping Page ${pageNum}...`);
      const url = pageNum === 1
        ? `https://www.naukri.com/${cleanRole}-jobs-in-${cleanLoc}`
        : `https://www.naukri.com/${cleanRole}-jobs-in-${cleanLoc}-${pageNum}`;
      
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(3000);

      const pageJobs = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('div.srp-jobtuple-wrapper, .cust-job-tuple');
        cards.forEach(card => {
          const titleEl = card.querySelector('a.title');
          const compEl = card.querySelector('a.comp-name');
          const locEl = card.querySelector('span.locWraper');
          const applyBtn = card.querySelector('button.apply-button');

          if (titleEl && compEl) {
            results.push({
              title: titleEl.innerText.trim(),
              company: compEl.innerText.trim(),
              location: locEl ? locEl.innerText.trim() : "Remote",
              url: titleEl.href.split('?')[0],
              source: "Naukri",
              isEasyApply: !!applyBtn
            });
          }
        });
        return results;
      });

      console.log(`📄 Naukri Page ${pageNum}: Found ${pageJobs.length} jobs.`);
      if (pageJobs.length === 0) {
        console.log("⏹️ No more Naukri jobs found on this page.");
        break;
      }
      allFoundJobs.push(...pageJobs);

      if (pageNum < maxPages) {
        await page.waitForTimeout(2000);
      }
    }

    const uniqueJobs = Array.from(new Map(allFoundJobs.map(j => [j.url, j])).values());
    console.log(`✅ Naukri: Found ${uniqueJobs.length} total jobs.`);
    return uniqueJobs;
  } catch (err) {
    console.error("❌ Naukri scraping error:", err.message);
    return [];
  } finally {
    await context.close();
  }
}

async function scrapeIndeed(role, location, maxPages = DEFAULT_MAX_PAGES) {
  console.log(`🔍 Searching Indeed for ${role} in ${location} (up to ${maxPages} page${maxPages > 1 ? 's' : ''})...`);
  const userDataDir = path.join(__dirname, "../.user_data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"]
  });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    const allFoundJobs = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`📄 Indeed: Scraping Page ${pageNum}...`);
      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}&start=${(pageNum - 1) * 10}`;
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(3500);

      const pageJobs = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('div.job_seen_beacon');
        cards.forEach(card => {
          const titleEl = card.querySelector('a.jcs-JobTitle');
          const compEl = card.querySelector('span[data-testid="company-name"]');
          const locEl = card.querySelector('div[data-testid="text-location"]');
          const easyApplyTag = card.querySelector('span[data-testid="easily-apply"], span.iaIcon');

          if (titleEl && compEl) {
            results.push({
              title: titleEl.innerText.trim(),
              company: compEl.innerText.trim(),
              location: locEl ? locEl.innerText.trim() : "Remote",
              url: titleEl.href.split('?')[0],
              source: "Indeed",
              isEasyApply: !!easyApplyTag
            });
          }
        });
        return results;
      });

      console.log(`📄 Indeed Page ${pageNum}: Found ${pageJobs.length} jobs.`);
      if (pageJobs.length === 0) {
        console.log("⏹️ No more Indeed jobs found on this page.");
        break;
      }
      allFoundJobs.push(...pageJobs);

      if (pageNum < maxPages) {
        await page.waitForTimeout(2000 + Math.random() * 1500);
      }
    }

    const uniqueJobs = Array.from(new Map(allFoundJobs.map(j => [j.url, j])).values());
    console.log(`✅ Indeed: Found ${uniqueJobs.length} total jobs.`);
    return uniqueJobs;
  } catch (err) {
    console.error("❌ Indeed scraping error:", err.message);
    return [];
  } finally {
    await context.close();
  }
}

async function scrapeInternshala(role, location, maxPages = DEFAULT_MAX_PAGES) {
  console.log(`🔍 Searching Internshala for ${role} (up to ${maxPages} page${maxPages > 1 ? 's' : ''})...`);
  const userDataDir = path.join(__dirname, "../.user_data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"]
  });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    // Map common roles to Internshala's canonical slugs
    let slug = role.toLowerCase().replace(/\s+/g, '-');
    if (slug.includes('full-stack') || slug.includes('fullstack')) {
      slug = 'full-stack-development';
    } else if (slug.includes('frontend')) {
      slug = 'front-end-development';
    } else if (slug.includes('backend')) {
      slug = 'back-end-development';
    }

    const allFoundJobs = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = pageNum === 1
        ? `https://internshala.com/jobs/${slug}-jobs/`
        : `https://internshala.com/jobs/${slug}-jobs/page-${pageNum}/`;

      console.log(`📄 Internshala: Scraping Page ${pageNum} (${url})...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(2500);

      // Close potential popups
      try {
        const closeBtn = page.locator('.close_registration, #close_popup, .ic-24-cross, #close_icon').first();
        if (await closeBtn.isVisible({ timeout: 2000 })) {
          await closeBtn.click();
        }
      } catch (e) {}

      // Wait for at least one job card to appear
      await page.waitForSelector('.individual_internship, a[href*="/job/detail/"]', { timeout: 8000 }).catch(() => {
        console.log("⚠️ Slow loading on Internshala page.");
      });

      const pageJobs = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('.individual_internship, .job-container, [id^="individual_internship_"]');
        cards.forEach(card => {
          const titleEl = card.querySelector('a[href*="/job/detail/"], .job-title-href, .heading_4_5 a');
          const compEl = card.querySelector('.company_name a, .company-name a, .company_name, .company-name, .company_and_premium a');
          const locEl = card.querySelector('.locations, .location_names, #location_names, a[href*="jobs-in-"]');

          if (titleEl && compEl) {
            results.push({
              title: titleEl.innerText.trim(),
              company: compEl.innerText.trim().split('\n')[0].trim(),
              location: locEl ? locEl.innerText.trim() : "Remote",
              url: titleEl.href.split('?')[0],
              source: "Internshala",
              isEasyApply: true
            });
          }
        });
        return results;
      });

      console.log(`📄 Internshala Page ${pageNum}: Found ${pageJobs.length} jobs.`);
      if (pageJobs.length === 0) {
        console.log("⏹️ No more Internshala jobs found.");
        break;
      }
      allFoundJobs.push(...pageJobs);

      if (pageNum < maxPages) {
        await page.waitForTimeout(1500);
      }
    }

    const uniqueJobs = Array.from(new Map(allFoundJobs.map(j => [j.url, j])).values());
    console.log(`✅ Internshala: Found ${uniqueJobs.length} total jobs.`);
    return uniqueJobs;
  } catch (err) {
    console.error("❌ Internshala scraping error:", err.message);
    return [];
  } finally {
    await context.close();
  }
}

async function scrapeLinkedIn(role, location, maxPages = DEFAULT_MAX_PAGES) {
  console.log(`🔍 Searching LinkedIn for Easy Apply jobs: ${role} in ${location} (up to ${maxPages} page${maxPages > 1 ? 's' : ''})...`);

  const userDataDir = path.join(__dirname, "../.user_data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"]
  });

  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    // Note: f_AL=true is LinkedIn's official search parameter for Easy Apply jobs
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&f_AL=true`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    // Auto-detect login: check if already logged in or search results are accessible
    const currentUrl = page.url();
    const isAuthwall = currentUrl.includes("/login") || currentUrl.includes("/checkpoint") || currentUrl.includes("/authwall") || currentUrl.includes("/uas/");
    const hasNavMe = await page.isVisible('button[aria-label="Primary Navigation"], .global-nav__me-photo, .nav-item--me, nav.global-nav, img[alt*="photo"], [aria-label*="Me"]').catch(() => false);
    const hasCards = await page.locator('[componentkey*="job-card"], .jobs-search__results-list, .base-card, .base-search-card, li[data-occludable-job-id]').count().catch(() => 0) > 0;

    let isLoggedIn = !isAuthwall && (hasNavMe || hasCards || currentUrl.includes("/jobs/search"));

    if (!isLoggedIn) {
      console.log("\n⚠️  LinkedIn Login Required for full job search.");
      console.log("👉 Please log in to your LinkedIn account in the browser window.");
      console.log("   (Auto-detecting login for 25s... will proceed automatically once logged in)");

      for (let sec = 0; sec < 25; sec++) {
        await page.waitForTimeout(1000);
        const urlNow = page.url();
        const navCheck = await page.isVisible('button[aria-label="Primary Navigation"], .global-nav__me-photo, .nav-item--me, nav.global-nav, img[alt*="photo"], [aria-label*="Me"]').catch(() => false);
        const cardCheck = await page.locator('[componentkey*="job-card"], .jobs-search__results-list, .base-card, .base-search-card, li[data-occludable-job-id]').count().catch(() => 0) > 0;
        
        if (!urlNow.includes("/login") && !urlNow.includes("/authwall") && (navCheck || cardCheck || urlNow.includes("/jobs/search"))) {
          console.log("✅ LinkedIn login confirmed! Continuing search...");
          isLoggedIn = true;
          break;
        }
      }
    } else {
      console.log("✅ Already logged in to LinkedIn!");
    }

    // Wait for the results to load
    console.log("Waiting for results...");
    await page.waitForTimeout(2000);

    // Guarantee Easy Apply filter is active on page
    try {
      const easyApplyBtn = page.locator('button.artdeco-pill:has-text("Easy Apply"), button[aria-label*="Easy Apply"], button:has-text("Easy Apply")').first();
      if (await easyApplyBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
        const isPressed = await easyApplyBtn.getAttribute("aria-checked").catch(() => null) === "true" ||
                          await easyApplyBtn.getAttribute("aria-pressed").catch(() => null) === "true";
        if (!isPressed) {
          await easyApplyBtn.click();
          console.log("🖱️ Enabled Easy Apply filter on LinkedIn!");
          await page.waitForTimeout(3000);
        }
      }
    } catch (e) {}

    const allFoundJobs = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`📄 LinkedIn: Scraping Page ${pageNum}...`);

      const pageJobs = await page.evaluate(async () => {
        const jobMap = new Map();

        // Find scrollable container
        let scrollable = document.querySelector('.jobs-search-results-list') ||
          document.querySelector('.jobs-search-results-display__list') ||
          document.querySelector('.scaffold-layout__list-container')?.parentElement ||
          document.querySelector('div[class*="jobs-search"]') ||
          window;

        for (let i = 0; i < 10; i++) {
          // Method 1: Modern LinkedIn 2026 componentkey cards
          const componentCards = document.querySelectorAll('[componentkey*="job-card"]');
          componentCards.forEach(c => {
            const key = c.getAttribute('componentkey') || '';
            const match = key.match(/job-card-component-ref-(\d+)/);
            if (!match) return;
            const jobId = match[1];
            const url = `https://www.linkedin.com/jobs/view/${jobId}/`;
            if (jobMap.has(url)) return;

            const cardText = c.innerText || '';
            // STRICT: Must be Easy Apply
            const isEasyApply = cardText.includes("Easy Apply") || 
              c.querySelector('[aria-label*="Easy Apply"], .job-card-container__apply-method') !== null;

            if (!isEasyApply) {
              return; // Skip external apply jobs
            }

            const lines = cardText.split('\n').map(s => s.trim()).filter(Boolean);
            const cleanLines = lines.filter(l =>
              !l.includes('Verified job') &&
              !l.includes('Selected') &&
              !l.includes('Viewed') &&
              !l.includes('Posted') &&
              !l.includes('ago') &&
              !l.includes('Easy Apply') &&
              !l.includes('connection')
            );

            const title = cleanLines[0] || 'Software Engineer';
            const company = cleanLines[1] || 'Hiring Company';
            const loc = cleanLines[2] || 'India';

            jobMap.set(url, {
              title,
              company,
              location: loc,
              url,
              source: "LinkedIn",
              isEasyApply: true
            });
          });

          // Method 2: Classic / Links-based cards fallback
          const links = document.querySelectorAll('a[href*="/jobs/view/"], a[href*="currentJobId="]');
          links.forEach(link => {
            let jobId = null;
            const viewMatch = link.href.match(/\/jobs\/view\/(\d+)/);
            const currentMatch = link.href.match(/currentJobId=(\d+)/);
            if (viewMatch) jobId = viewMatch[1];
            else if (currentMatch) jobId = currentMatch[1];
            if (!jobId) return;

            const url = `https://www.linkedin.com/jobs/view/${jobId}/`;
            if (jobMap.has(url)) return;

            const card = link.closest('li, .job-card-container, .base-card, div[data-job-id]') || link;
            const cardText = card.innerText || '';

            // STRICT: Must be Easy Apply
            const isEasyApply = cardText.includes("Easy Apply");
            if (!isEasyApply) {
              return; // Skip external apply jobs
            }

            const titleEl = card.querySelector('.job-card-list__title, h3, a.base-card__full-link');
            const compEl = card.querySelector('.job-card-container__primary-description, .job-card-container__company-name, .base-search-card__subtitle');
            const locEl = card.querySelector('.job-card-container__metadata-item, .job-search-card__location');

            const title = titleEl ? titleEl.innerText.trim() : link.innerText.trim().split('\n')[0];
            const company = compEl ? compEl.innerText.trim() : 'Company';
            const loc = locEl ? locEl.innerText.trim() : 'Location';

            if (title && title.length > 2 && !title.includes("How promoted") && !title.includes("How AI search")) {
              jobMap.set(url, {
                title,
                company,
                location: loc,
                url,
                source: "LinkedIn",
                isEasyApply: true
              });
            }
          });

          // Scroll to load additional jobs in list
          if (scrollable === window) {
            window.scrollBy(0, 500);
          } else {
            scrollable.scrollTop += 500;
          }
          await new Promise(r => setTimeout(r, 800));
        }

        return Array.from(jobMap.values());
      });

      console.log(`✅ LinkedIn Page ${pageNum} finished. Found ${pageJobs.length} Easy Apply jobs.`);
      allFoundJobs.push(...pageJobs);

      if (pageNum < maxPages) {
        console.log(`➡️ Moving to LinkedIn page ${pageNum + 1}...`);
        let moved = false;
        try {
          const nextButton = page.locator('button[aria-label="Next"], button:has-text("Next"), .artdeco-pagination__button--next').first();
          if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextButton.click();
            await page.waitForTimeout(4000);
            moved = true;
          }
        } catch (e) {}

        if (!moved) {
          // Direct navigation fallback using LinkedIn's standard pagination offset (25 jobs per page)
          const nextStart = pageNum * 25;
          const nextUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&f_AL=true&start=${nextStart}`;
          console.log(`🌐 Navigating directly to LinkedIn Page ${pageNum + 1} (${nextUrl})...`);
          await page.goto(nextUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
          await page.waitForTimeout(3500);
        }
      }
    }

    // Deduplicate jobs by URL in case some overlap between pages
    const uniqueJobs = Array.from(new Map(allFoundJobs.map(j => [j.url, j])).values());
    console.log(`\n✨ LinkedIn Scraping complete! Total Easy Apply jobs found: ${uniqueJobs.length}`);
    return uniqueJobs;

  } catch (err) {
    console.error("LinkedIn scraping error:", err.message);
    return [];
  } finally {
    await context.close();
  }
}

// Example usage
if (require.main === module) {
  scrapeLinkedIn('Frontend Developer', 'Remote')
    .then(jobs => console.log(JSON.stringify(jobs, null, 2)))
    .catch(err => console.error(err));
}

module.exports = { 
  scrapeLinkedIn, 
  scrapeNaukri, 
  scrapeIndeed, 
  scrapeInternshala 
};
