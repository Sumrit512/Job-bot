const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function extractText() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const resumePath = path.join(__dirname, '..', 'downloaded_resume.pdf');
  const fileUrl = `file://${resumePath.replace(/\\/g, '/')}`;
  
  console.log("📂 Opening PDF in browser:", fileUrl);
  await page.goto(fileUrl);
  await page.waitForTimeout(2000); // Wait for viewer
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("📝 Extracted text length:", text.length);
  console.log("📝 Snippet:", text.substring(0, 100));
  
  fs.writeFileSync(path.join(__dirname, '..', 'user_profile.json'), JSON.stringify({ resumeText: text }, null, 2));
  await browser.close();
}

extractText();
