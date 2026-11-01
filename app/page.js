"use client";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  User, 
  Link2, // Changed from Link as LinkIcon to Link2
  FileText, 
  Play,
  RotateCcw,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Github,
  Globe,
  ShieldCheck,
  Calendar,
  Award,
  Trash2,
  PlusCircle,
  Mail,
  Users,
  Copy
} from "lucide-react";


export default function Home() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("4");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [linkedinId, setLinkedinId] = useState("");
  const [githubId, setGithubId] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("Immediate");
  const [workAuth, setWorkAuth] = useState(true);
  const [visaSponsorship, setVisaSponsorship] = useState(false);
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [degree, setDegree] = useState("");
  const [university, setUniversity] = useState("");
  const [gradYear, setGradYear] = useState(new Date().getFullYear());
  const [expectedCtc, setExpectedCtc] = useState("");
  const [currentCtc, setCurrentCtc] = useState("");
  const [selectedJobTypes, setSelectedJobTypes] = useState(["WFH", "Hybrid"]);

  // NEW: Absolute Automation Fields
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");

  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [veteranStatus, setVeteranStatus] = useState("No");
  const [disabilityStatus, setDisabilityStatus] = useState("No");
  const [pronouns, setPronouns] = useState("");

  const [numberOfProjects, setNumberOfProjects] = useState(0);
  const [fitnessFrequency, setFitnessFrequency] = useState("4 times a day");
  const [dob, setDob] = useState("");

  const [earliestStartDate, setEarliestStartDate] = useState("");
  const [willingToRelocate, setWillingToRelocate] = useState(false);

  const [whyThisRole, setWhyThisRole] = useState("");
  const [biggestAchievement, setBiggestAchievement] = useState("");

  const [references, setReferences] = useState([]);

  const addReference = () => setReferences([...references, { name: "", relation: "", email: "", phone: "" }]);
  const removeReference = (index) => setReferences(references.filter((_, i) => i !== index));
  const updateReference = (index, field, value) => {
    const newRefs = [...references];
    newRefs[index] = { ...newRefs[index], [field]: value };
    setReferences(newRefs);
  };
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [agentKey, setAgentKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle", "saving", "saved", "error"
  const isInitialLoad = useRef(true);
  

  const fileInputRef = useRef(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveResume = useMutation(api.files.saveResume);
  const jobs = useQuery(api.jobs.listJobs);
  const existingPrefs = useQuery(api.preferences.getPreferences);
  const getAgentKey = useMutation(api.preferences.getOrGenerateAgentKey);

  // Fetch agent key
  useEffect(() => {
    async function fetchKey() {
      try {
        const key = await getAgentKey();
        setAgentKey(key);
      } catch (e) {
        console.error("Failed to fetch agent key:", e);
      }
    }
    fetchKey();
  }, [getAgentKey]);


  // Load existing preferences
  useEffect(() => {
    const p = Array.isArray(existingPrefs) ? existingPrefs[0] : existingPrefs;
    if (p) {
      setFullName(p.fullName || "");
      setPhone(p.phone || "");
      setRole(p.role || "");
      const expVal = p.yearsOfExperience?.toString() || p.experience || "4";
      // If it's a non-numeric string (old data), default to "4"
      setExperience(/^[0-9]+$/.test(expVal) ? expVal : "4");
      setLocation(p.location || "");
      setSalary(p.salaryRange || "");
      setLinkedinId(p.linkedinId || "");
      setGithubId(p.githubId || "");
      setPortfolioUrl(p.portfolioUrl || "");
      setNoticePeriod(p.noticePeriod || "Immediate");
      setWorkAuth(p.workAuthorization ?? true);
      setVisaSponsorship(p.visaSponsorship ?? false);
      setCurrentCompany(p.currentCompany || "");
      setCurrentTitle(p.currentTitle || "");
      setDegree(p.degree || "");
      setUniversity(p.university || "");
      setGradYear(p.gradYear || 2024);
      setSelectedJobTypes(p.jobType || ["WFH", "Hybrid"]);
      setCurrentCtc(p.currentCtc || "");
      setExpectedCtc(p.expectedCtc || "");

      // Load NEW Fields
      setStreetAddress(p.streetAddress || "");
      setCity(p.city || "");
      setState(p.state || "");
      setZipCode(p.zipCode || "");
      setCountry(p.country || "");
      setGender(p.gender || "");
      setEthnicity(p.ethnicity || "");
      setVeteranStatus(p.veteranStatus || "No");
      setDisabilityStatus(p.disabilityStatus || "No");
      setPronouns(p.pronouns || "");
      setEarliestStartDate(p.earliestStartDate || "");
      setWillingToRelocate(p.willingToRelocate ?? false);
      setWhyThisRole(p.whyThisRole || "");
      setBiggestAchievement(p.biggestAchievement || "");
      setNumberOfProjects(p.numberOfProjects || 0);
      setFitnessFrequency(p.fitnessFrequency || "");
      setDob(p.dob || "");
      if (p.references) setReferences(p.references);
      setResumeText(p.resumeText || "");
      // Map yearsOfExperience back to a level if necessary
      if (p.yearsOfExperience) {
        setExperience(p.yearsOfExperience >= 5 ? "Mid Level" : "Entry Level");
      }
      setTimeout(() => {
        isInitialLoad.current = false;
        setSaveStatus("saved");
      }, 600);
    } else {
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 600);
    }
  }, [existingPrefs]);

  const getPayload = () => ({
    fullName, phone, role, experience, location, linkedinId, githubId, 
    portfolioUrl, noticePeriod, workAuthorization: workAuth, visaSponsorship, 
    currentCompany, currentTitle, degree, university, gradYear: parseInt(gradYear) || 2024,
    jobType: selectedJobTypes,
    salaryRange: salary,
    currentCtc, expectedCtc,
    yearsOfExperience: parseInt(experience) || 4,
    experience: experience.toString(), // sync string field with number for compatibility
    streetAddress, city, state, zipCode, country,
    gender, ethnicity, veteranStatus, disabilityStatus, pronouns,
    earliestStartDate, willingToRelocate: !!willingToRelocate,
    whyThisRole, biggestAchievement,
    numberOfProjects: parseInt(numberOfProjects) || 0,
    fitnessFrequency,
    dob,
    references: references.filter(r => r.name)
  });

  const savePreferences = useMutation(api.preferences.savePreferences);

  // Debounced Auto-Save whenever the user edits any form field
  useEffect(() => {
    if (isInitialLoad.current) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await savePreferences(getPayload());
        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("error");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    fullName, phone, role, experience, location, salary, linkedinId, githubId,
    portfolioUrl, noticePeriod, workAuth, visaSponsorship, currentCompany, currentTitle,
    degree, university, gradYear, expectedCtc, currentCtc, selectedJobTypes,
    streetAddress, city, state, zipCode, country, gender, ethnicity,
    veteranStatus, disabilityStatus, pronouns, numberOfProjects, fitnessFrequency,
    dob, earliestStartDate, willingToRelocate, whyThisRole, biggestAchievement, references
  ]);


  const toggleJobType = (type) => {
    setSelectedJobTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setResumeText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleUpload = async () => {
    if (!resumeFile && !resumeText) {
      alert("Please upload a resume first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let storageId = null;
      if (resumeFile) {
        setUploadProgress(30);
        const postUrl = await generateUploadUrl();
        if (!postUrl) {
          throw new Error("Failed to generate upload URL. Is Convex running?");
        }
        
        console.log("Uploading to:", postUrl);
        
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": resumeFile.type || "text/plain" },
          body: resumeFile,
        });

        if (!result.ok) {
          const errorText = await result.text();
          throw new Error(`Upload failed with status ${result.status}: ${errorText}`);
        }

        const { storageId: sid } = await result.json();
        storageId = sid;
      }

      setUploadProgress(70);
      
      const payload = {
        fullName, phone, role, experience, location, linkedinId, githubId, 
        portfolioUrl, noticePeriod, workAuthorization: workAuth, visaSponsorship, 
        currentCompany, currentTitle, degree, university, gradYear: parseInt(gradYear) || 2024,
        jobType: selectedJobTypes,
        salaryRange: salary,
        currentCtc, expectedCtc,
        yearsOfExperience: parseInt(experience) || 4,
        experience: experience.toString(), // sync string field with number for compatibility
        streetAddress, city, state, zipCode, country,
        gender, ethnicity, veteranStatus, disabilityStatus, pronouns,
        earliestStartDate, willingToRelocate: !!willingToRelocate,
        whyThisRole, biggestAchievement,
        numberOfProjects: parseInt(numberOfProjects) || 0,
        fitnessFrequency,
        dob,
        references: references.filter(r => r.name)
      };

      if (storageId) {
        await saveResume({ ...payload, storageId, resumeText });
      } else {
        await savePreferences(payload);
      }

      setUploadProgress(100);
      alert("Profile saved successfully!");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Save failed. check console.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerCommand = useMutation(api.agent.triggerCommand);
  const agentStatus = useQuery(api.agent.getStatus);

  const clearCommand = useMutation(api.agent.clearCommand);

  const handleTrigger = async (command) => {
    try {
      if (command === "idle") {
        await clearCommand();
        alert("Agent status reset to idle.");
      } else {
        // Ensure user data is saved immediately before triggering
        try {
          await savePreferences(getPayload());
          setSaveStatus("saved");
        } catch (saveErr) {
          console.warn("Auto-save prior to command failed:", saveErr);
        }

        await triggerCommand({ command });
        alert(`${command.charAt(0).toUpperCase() + command.slice(1)} command sent! The agent will evaluate match scores (>90) and auto-apply.`);
      }
    } catch (e) {
      alert("Error triggering command. Is Convex dev running?");
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-700 min-h-screen pb-20 px-4 md:px-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
              AI Job Dashboard
            </h1>
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <Loader2 size={12} className="animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={12} /> Auto-saved
              </span>
            )}
          </div>
          <p className="text-slate-400 mt-1">Full profile context for accurate auto-applications (Threshold: &gt; 90% match).</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => handleTrigger("scrape")}
            disabled={agentStatus?.command !== "idle" && !!agentStatus}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all border border-slate-700 disabled:opacity-50"
          >
            <Briefcase size={18} /> Find Jobs
          </button>
          <button 
            onClick={() => handleTrigger("apply")}
            disabled={agentStatus?.command !== "idle" && !!agentStatus}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Play size={18} /> {agentStatus?.command === "apply" ? "Agent Running..." : "Auto-Apply"}
          </button>
          <button 
            onClick={() => handleTrigger("idle")}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 px-4 py-2.5 rounded-xl text-sm transition-all"
            title="Force reset if agent is stuck"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            {isUploading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
            <div className="space-y-12">
              
              {/* SECTION: Personal & Contact */}
              <section>
                <div className="flex items-center gap-2 mb-6 text-blue-400">
                  <User size={20} />
                  <h2 className="text-lg font-semibold text-white">Personal & Contact</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Full Name</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Phone Number</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="+1 234 567 890" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Target Job Role</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="Software Engineer" value={role} onChange={e => setRole(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Current Location</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="New York / Remote" value={location} onChange={e => setLocation(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Date of Birth</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="DD/MM/YYYY" value={dob} onChange={e => setDob(e.target.value)} />
                  </div>
                </div>
              </section>

              {/* SECTION: Professional Links */}
              <section>
                <div className="flex items-center gap-2 mb-6 text-purple-400">
                  <Link2 size={20} />
                  <h2 className="text-lg font-semibold text-white">Professional Presence</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">LinkedIn URL</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm" placeholder="linkedin.com/in/..." value={linkedinId} onChange={e => setLinkedinId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">GitHub Profile</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm" placeholder="github.com/..." value={githubId} onChange={e => setGithubId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Portfolio / Blog</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm" placeholder="yourwebsite.com" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} />
                  </div>
                </div>
              </section>

              {/* SECTION: Career Details */}
              <section>
                <div className="flex items-center gap-2 mb-6 text-emerald-400">
                  <Briefcase size={20} />
                  <h2 className="text-lg font-semibold text-white">Career & Experience</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Current Company</label>
                      <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="Current or Last Company" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Current Title</label>
                      <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="Lead Engineer / Developer" value={currentTitle} onChange={e => setCurrentTitle(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Years of Exp</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="e.g. 4" value={experience} onChange={e => setExperience(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Expected Salary</label>
                        <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="$120k - $150k" value={salary} onChange={e => setSalary(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Current CTC</label>
                        <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="e.g. 15.0" value={currentCtc} onChange={e => setCurrentCtc(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Expected CTC</label>
                        <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" placeholder="e.g. 20.0" value={expectedCtc} onChange={e => setExpectedCtc(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Notice Period</label>
                        <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50" value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)}>
                          <option>Immediate</option>
                          <option>2 Weeks</option>
                          <option>1 Month</option>
                          <option>2 Months</option>
                          <option>3 Months</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Total Projects</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" value={numberOfProjects} onChange={e => setNumberOfProjects(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: Education */}
              <section>
                <div className="flex items-center gap-2 mb-6 text-amber-400">
                  <GraduationCap size={20} />
                  <h2 className="text-lg font-semibold text-white">Education</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Degree</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="Master of Computer Science" value={degree} onChange={e => setDegree(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">University</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="University Name" value={university} onChange={e => setUniversity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Grad Year</label>
                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" value={gradYear} onChange={e => setGradYear(e.target.value)} />
                  </div>
                </div>
              </section>

              {/* SECTION: Mailing Address */}
              <section>
                <div className="flex items-center gap-2 mb-6 text-indigo-400">
                  <Globe size={20} />
                  <h2 className="text-lg font-semibold text-white">Mailing Address</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Street Address</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="123 AI Lane, Apt 4" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">City</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="Silicon Valley" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">State</label>
                      <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="CA" value={state} onChange={e => setState(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Zip Code</label>
                      <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="94025" value={zipCode} onChange={e => setZipCode(e.target.value)} />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Country</label>
                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="United States" value={country} onChange={e => setCountry(e.target.value)} />
                  </div>
                </div>
              </section>

              {/* SECTION: Demographics & Legal */}
              <section>
                <div className="flex items-center gap-2 mb-6 text-pink-400">
                  <ShieldCheck size={20} />
                  <h2 className="text-lg font-semibold text-white">Demographics & Legal</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Gender</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Decline to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Pronouns</label>
                      <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="they/them" value={pronouns} onChange={e => setPronouns(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Fitness/Gym</label>
                      <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="e.g. 4 times a day" value={fitnessFrequency} onChange={e => setFitnessFrequency(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Ethnicity</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" value={ethnicity} onChange={e => setEthnicity(e.target.value)}>
                      <option value="">Select Ethnicity</option>
                      <option value="Asian">Asian</option>
                      <option value="Black">Black / African American</option>
                      <option value="Hispanic">Hispanic / Latino</option>
                      <option value="White">White</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Veteran</label>
                      <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" value={veteranStatus} onChange={e => setVeteranStatus(e.target.value)}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Disability</label>
                      <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none" value={disabilityStatus} onChange={e => setDisabilityStatus(e.target.value)}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: Availability & Bio */}
              <section>
                <div className="flex items-center gap-2 mb-6 text-orange-400">
                  <Calendar size={20} />
                  <h2 className="text-lg font-semibold text-white">Availability & Motivation</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Earliest Start Date</label>
                      <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="e.g. Next Monday / June 1st" value={earliestStartDate} onChange={e => setEarliestStartDate(e.target.value)} />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${willingToRelocate ? 'bg-orange-600 border-orange-500' : 'bg-slate-950 border-slate-800'}`}>
                        <input type="checkbox" className="hidden" checked={willingToRelocate} onChange={e => setWillingToRelocate(e.target.checked)} />
                        {willingToRelocate && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Willing to relocate for the right role</span>
                    </label>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Why this role? (Snippet)</label>
                      <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white h-24 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" placeholder="Briefly explain your interest..." value={whyThisRole} onChange={e => setWhyThisRole(e.target.value)} />
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: References */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Users size={20} />
                    <h2 className="text-lg font-semibold text-white">Professional References</h2>
                  </div>
                  <button onClick={addReference} className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all shadow-sm">
                    <PlusCircle size={14} /> Add Reference
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {references.map((ref, index) => (
                    <div key={index} className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50 relative group">
                      <button onClick={() => removeReference(index)} className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                      <div className="space-y-3">
                        <input className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500/50 outline-none" placeholder="Reference Name" value={ref.name} onChange={e => updateReference(index, "name", e.target.value)} />
                        <input className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500/50 outline-none" placeholder="Relation (e.g. Manager)" value={ref.relation} onChange={e => updateReference(index, "relation", e.target.value)} />
                        <div className="flex gap-2">
                          <input className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500/50 outline-none" placeholder="Email" value={ref.email} onChange={e => updateReference(index, "email", e.target.value)} />
                          <input className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500/50 outline-none" placeholder="Phone" value={ref.phone} onChange={e => updateReference(index, "phone", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {references.length === 0 && (
                    <div className="md:col-span-2 text-center py-8 border border-dashed border-slate-800 rounded-2xl text-slate-600 text-sm italic">
                      No references added yet.
                    </div>
                  )}
                </div>
              </section>

              {/* SECTION: Work Auth & Resume */}
              <section className="pt-8 border-t border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Work Authorization</h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${workAuth ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-800'}`}>
                          <input type="checkbox" className="hidden" checked={workAuth} onChange={e => setWorkAuth(e.target.checked)} />
                          {workAuth && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <span className="text-sm text-slate-300 group-hover:text-white">Authorized to work in target location</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${visaSponsorship ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-800'}`}>
                          <input type="checkbox" className="hidden" checked={visaSponsorship} onChange={e => setVisaSponsorship(e.target.checked)} />
                          {visaSponsorship && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <span className="text-sm text-slate-300 group-hover:text-white">Requires visa sponsorship</span>
                      </label>
                    </div>

                    <div className="pt-4">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Job Type Preference</h3>
                      <div className="flex flex-wrap gap-2">
                        {["WFH", "Hybrid", "In-office"].map(type => (
                          <button
                            key={type}
                            onClick={() => toggleJobType(type)}
                            className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                              selectedJobTypes.includes(type)
                                ? "bg-blue-500/10 border-blue-500 text-blue-400"
                                : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Resume Upload</h3>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all group cursor-pointer h-full min-h-[160px] ${
                        resumeFile ? "border-emerald-500/50 bg-emerald-500/5" : resumeText ? "border-blue-500/30 bg-blue-500/5" : "border-slate-800 bg-slate-950/50 hover:border-blue-500/30"
                      }`}
                    >
                      {resumeFile ? (
                        <>
                          <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                          <p className="text-emerald-400 text-sm font-medium">{resumeFile.name}</p>
                          <p className="text-[10px] text-emerald-600 mt-1 uppercase">Ready to Sync</p>
                        </>
                      ) : resumeText ? (
                        <>
                          <CheckCircle2 size={32} className="text-blue-400 mb-2" />
                          <p className="text-blue-300 text-sm font-medium">Resume Synced from Convex</p>
                          <p className="text-[10px] text-blue-600 mt-1 uppercase">Click to replace</p>
                        </>
                      ) : (
                        <>
                          <FileText size={32} className="text-slate-600 group-hover:text-blue-500 transition-colors mb-2" />
                          <p className="text-slate-400 text-sm font-medium">Drop TXT Resume</p>
                          <p className="text-[10px] text-slate-600 mt-1 uppercase">Optimal for AI Processing</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          {/* NEW: Agent Key Management */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm border-blue-500/20">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck size={16} /> Automation Agent Key
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Use this key in your local <code className="text-blue-300">.env.local</code> as <code className="text-blue-300">AGENT_KEY</code> to link your local agent.
            </p>
            <div className="flex gap-2">
              <input 
                type="password" 
                readOnly 
                value={agentKey} 
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:ring-0 outline-none"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(agentKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl border border-slate-700 transition-all"
                title="Copy Key"
              >
                {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">

            <h3 className="text-lg font-semibold mb-6 flex items-center justify-between">
              Live Status
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
              </div>
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Briefcase size={20} />
                  </div>
                  <span className="text-slate-400 text-sm">Discovered</span>
                </div>
                <span className="font-bold text-blue-400 text-xl">{jobs?.length || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-slate-400 text-sm">Applications</span>
                </div>
                <span className="font-bold text-emerald-400 text-xl">
                  {jobs?.filter(j => j.status === "applied").length || 0}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <RotateCcw size={20} />
                  </div>
                  <span className="text-slate-400 text-sm">Skipped</span>
                </div>
                <span className="font-bold text-blue-400 text-xl">
                  {jobs?.filter(j => j.status === "skipped").length || 0}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Trash2 size={20} />
                  </div>
                  <span className="text-slate-400 text-sm">Failed</span>
                </div>
                <span className="font-bold text-red-400 text-xl">
                  {jobs?.filter(j => j.status === "failed").length || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 shadow-xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <h3 className="text-white font-bold text-xl mb-3 relative z-10">AI Power Active</h3>
            <p className="text-blue-100 text-sm leading-relaxed relative z-10 opacity-90">
              The neural engine is ready. Enhance your profile to help the AI win you more interviews.
            </p>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
          <h3 className="text-xl font-semibold">Discovered Opportunities</h3>
          <span className="text-xs font-bold bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-700 uppercase tracking-tighter">
            {jobs?.length || 0} Total Listings
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-800">
                <th className="px-8 py-5">Job Details</th>
                <th className="px-8 py-5">Company</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {jobs?.map((job) => (
                <tr key={job._id} className="hover:bg-slate-800/20 transition-all group">
                  <td className="px-8 py-4">
                    <div className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{job.title}</div>
                    <div className="text-[10px] text-slate-500 uppercase mt-1 tracking-tight">{job.location} • {job.source}</div>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-400 font-medium">{job.company}</td>
                  <td className="px-8 py-4 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                      job.status === "applied" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" :
                      job.status === "failed" ? "bg-red-500/5 border-red-500/20 text-red-500" :
                      job.status === "skipped" ? "bg-blue-500/5 border-blue-500/20 text-blue-500" :
                      "bg-amber-500/5 border-amber-500/20 text-amber-500"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <a href={job.url} target="_blank" className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all border border-slate-700">
                      View <Play size={10} />
                    </a>
                  </td>
                </tr>
              ))}
              {(!jobs || jobs.length === 0) && (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center text-slate-600 font-medium italic">
                    Discovery scan complete. No jobs found in this cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

