const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

async function buildProfile() {
  try {
    const resumePath = path.join(__dirname, '..', 'downloaded_resume.pdf');
    if (!fs.existsSync(resumePath)) {
      console.error("❌ Resume not found at:", resumePath);
      return;
    }

    console.log("📄 Reading resume...");
    const dataBuffer = fs.readFileSync(resumePath);
    const data = await pdf(dataBuffer);

    const profile = {
      fullName: "Nimit", // Fallback, could be extracted
      resumeText: data.text,
      lastUpdated: new Date().toISOString(),
      preferences: {
        yearsOfExperience: 3,
        location: "India",
        noticePeriod: "0 days",
        expectedSalary: "Market Standard",
        willingToRelocate: true
      }
    };

    const profilePath = path.join(__dirname, '..', 'user_profile.json');
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    console.log("✅ AI Profile built successfully at:", profilePath);
    console.log("📝 Resume length:", data.text.length, "characters.");

  } catch (err) {
    console.error("❌ Error building profile:", err.message);
  }
}

buildProfile();
