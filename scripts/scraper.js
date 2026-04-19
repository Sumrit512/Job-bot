const { chromium } = require("playwright");
const path = require("path");
const readline = require("readline");

// --- CONFIGURATION ---
// Change this to 5+ to scan more jobs across all platforms.
const MAX_PAGES = 1; 
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

async function scrapeNaukri(role, location) {
  console.log(`🔍 Searching Naukri for ${role} in ${location}...`);
  const userDataDir = path.join(__dirname, "../.user_data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"]
  });
  const page = await context.newPage();

  try {
    // Naukri URL structure: naukri.com/role-jobs-in-location
    const cleanRole = role.toLowerCase().replace(/\s+/g, '-');
    const cleanLoc = location.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.naukri.com/${cleanRole}-jobs-in-${cleanLoc}`;
    
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(3000);

    const jobs = await page.evaluate(() => {
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

    console.log(`✅ Naukri: Found ${jobs.length} jobs.`);
    return jobs;
  } catch (err) {
    console.error("❌ Naukri scraping error:", err.message);
    return [];
  } finally {
    await context.close();
  }
}

async function scrapeIndeed(role, location) {
  console.log(`🔍 Searching Indeed for ${role} in ${location}...`);
  const userDataDir = path.join(__dirname, "../.user_data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"]
  });
  const page = await context.newPage();

  try {
    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}`;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(4000);

    const allFoundJobs = [];

    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      console.log(`📄 Indeed: Scraping Page ${pageNum}...`);
      
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

      allFoundJobs.push(...pageJobs);

      if (pageNum < MAX_PAGES) {
        const nextBtn = page.locator('a[aria-label="Next Page"], a[data-testid="pagination-page-next"]').first();
        if (await nextBtn.isVisible()) {
          console.log("➡️ Moving to next Indeed page...");
          await nextBtn.click();
          await page.waitForTimeout(3000 + Math.random() * 2000);
        } else {
          break;
        }
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

async function scrapeInternshala(role, location) {
  console.log(`🔍 Searching Internshala for ${role}...`);
  const userDataDir = path.join(__dirname, "../.user_data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"]
  });
  const page = await context.newPage();

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
    
    const url = `https://internshala.com/jobs/${slug}-jobs/`;
    console.log(`🌐 Navigating to Internshala URL: ${url}`);
    
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    
    // Close potential popups
    try {
      const closeBtn = page.locator('.close_registration, #close_popup, .ic-24-cross').first();
      if (await closeBtn.isVisible({ timeout: 5000 })) {
        await closeBtn.click();
      }
    } catch (e) {}

    // Wait for at least one job card to appear
    await page.waitForSelector('.job-title-href', { timeout: 10000 }).catch(() => {
      console.log("⚠️ No jobs found on page or slow loading.");
    });

    const jobs = await page.evaluate(() => {
      const results = [];
      // Targeting both common card containers
      const cards = document.querySelectorAll('.individual_internship, .job-container, .container-fluid-custom');
      cards.forEach(card => {
        const titleEl = card.querySelector('.job-title-href');
        const compEl = card.querySelector('.company-name, .company_and_premium p');
        const locEl = card.querySelector('#location_names, .location_names, .location_link');

        if (titleEl && compEl) {
          results.push({
            title: titleEl.innerText.trim(),
            company: compEl.innerText.trim(),
            location: locEl ? locEl.innerText.trim() : "Remote",
            url: titleEl.href.split('?')[0],
            source: "Internshala",
            isEasyApply: true
          });
        }
      });
      return results;
    });

    console.log(`✅ Internshala: Found ${jobs.length} jobs.`);
    return jobs;
  } catch (err) {
    console.error("❌ Internshala scraping error:", err.message);
    return [];
  } finally {
    await context.close();
  }
}

async function scrapeLinkedIn(role, location) {
  console.log(`🔍 Searching LinkedIn for ${role} in ${location}...`);
  // Existing logic...

  const userDataDir = path.join(__dirname, "../.user_data");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  const page = await context.newPage();

  try {
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}`;
    await page.goto(searchUrl, { waitUntil: "load", timeout: 60000 });

    // Handle potential login/cookie wall
    // Check for "Sign in" buttons or absence of profile nav
    const isLoggedIn = await page.isVisible('button[aria-label="Primary Navigation"], .global-nav__me-photo, .nav-item--me');
    if (!isLoggedIn || page.url().includes("login")) {
      console.log("\n⚠️  NOT LOGGED IN! ⚠️");
      console.log("1. Go to the opened browser window.");
      console.log("2. Log in to your LinkedIn account.");
      console.log("3. Come back here and press ENTER.");
      await waitForKey();
      console.log("✅ Continuing search...");
      await page.waitForTimeout(2000);
    }

    // Wait for the results to load
    console.log("Waiting for results...");
    // 1. Try to click "Easy Apply" filter if available
    console.log("Applying 'Easy Apply' filter...");
    try {
      // Look for the specific Easy Apply toggle/filter button
      const easyApplyBtn = page.locator('button.artdeco-pill:has-text("Easy Apply"), button[aria-label="Easy Apply filter"]').first();
      if (await easyApplyBtn.isVisible()) {
        await easyApplyBtn.click();
        console.log("🖱️ Clicked Easy Apply filter!");
        await page.waitForTimeout(4000); // Wait for results to refresh
      } else {
        console.log("⚠️ Could not find Easy Apply button automatically.");
        console.log("Please click the 'Easy Apply' filter in the browser if you want only automated jobs.");
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log("ℹ️ Filter error:", e.message);
    }

    const allFoundJobs = [];

    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      console.log(`📄 LinkedIn: Scraping Page ${pageNum}...`);

      const pageJobs = await page.evaluate(async () => {
        const jobMap = new Map();
        let scrollable = document.querySelector('.jobs-search-results-list') ||
          document.querySelector('.jobs-search-results-display__list') ||
          document.querySelector('.scaffold-layout__list-container')?.parentElement;

        if (!scrollable || scrollable === document.body) {
          const cards = document.querySelectorAll('li[data-occludable-job-id], .job-card-container');
          if (cards.length > 0) {
            let current = cards[0];
            while (current && current !== document.body) {
              const style = window.getComputedStyle(current);
              if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                scrollable = current;
                break;
              }
              current = current.parentElement;
            }
          }
        }

        if (!scrollable) scrollable = window;

        for (let i = 0; i < 15; i++) {
          const jobLinks = Array.from(document.querySelectorAll('a[href*="/jobs/view/"]'));
          jobLinks.forEach(link => {
            const card = link.closest('li, .job-card-container, .base-card');
            if (!card) return;
            const url = link.href.split('?')[0];
            if (jobMap.has(url)) return;
            const text = card.innerText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            const title = card.querySelector('.job-card-list__title, h3')?.innerText.trim() || text[0];
            const company = card.querySelector('.job-card-container__primary-description, .job-card-container__company-name')?.innerText.trim() || text[1];
            const location = card.querySelector('.job-card-container__metadata-item')?.innerText.trim() || text[2];
            if (title && url.includes('/jobs/view/')) {
              jobMap.set(url, { title, company, location, url, source: "LinkedIn" });
            }
          });
          if (scrollable === window) window.scrollBy(0, 600);
          else scrollable.scrollTop += 500;
          await new Promise(r => setTimeout(r, 1200));
        }
        return Array.from(jobMap.values());
      });

      console.log(`✅ Page ${pageNum} finished. Found ${pageJobs.length} jobs.`);
      allFoundJobs.push(...pageJobs);

      if (pageNum < MAX_PAGES) {
        console.log("➡️ Moving to next page...");
        try {
          const nextButton = page.locator('button[aria-label^="Page"], button:has-text("Next"), .artdeco-pagination__button--next').first();
          if (await nextButton.isVisible()) {
            await nextButton.click();
            await page.waitForTimeout(5000); 
          } else {
            console.log("⏹️ No more pages found.");
            break;
          }
        } catch (e) {
          console.log("⏹️ Failed to click next page.");
          break;
        }
      }
    }

    // Deduplicate jobs by URL in case some overlap between pages
    const uniqueJobs = Array.from(new Map(allFoundJobs.map(j => [j.url, j])).values());
    console.log(`\n✨ Scraping complete! Total unique jobs found: ${uniqueJobs.length}`);
    return uniqueJobs;




  } catch (err) {
    console.error("Scraping error:", err.message);
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
  // scrapeIndeed, 
  scrapeInternshala 
};
