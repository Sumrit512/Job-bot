import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    agentKey: v.optional(v.string()),
  }).index("by_agentKey", ["agentKey"]),

  preferences: defineTable({
    userId: v.id("users"),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    experience: v.optional(v.string()),
    location: v.optional(v.string()),
    salaryRange: v.optional(v.string()),
    currentCtc: v.optional(v.string()),
    expectedCtc: v.optional(v.string()),
    linkedinId: v.optional(v.string()),
    githubId: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    noticePeriod: v.optional(v.string()),
    workAuthorization: v.optional(v.boolean()),
    visaSponsorship: v.optional(v.boolean()),
    currentCompany: v.optional(v.string()),
    currentTitle: v.optional(v.string()),
    degree: v.optional(v.string()),
    university: v.optional(v.string()),
    gradYear: v.optional(v.number()),
    jobType: v.optional(v.array(v.string())), // WFH, Hybrid, In-office
    // Geographic Details
    streetAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),

    // Demographics & Legal (EEOC)
    gender: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    veteranStatus: v.optional(v.string()),
    disabilityStatus: v.optional(v.string()),
    pronouns: v.optional(v.string()),

    // Availability & Preferences
    earliestStartDate: v.optional(v.string()),
    willingToRelocate: v.optional(v.boolean()),

    // Motivational Snippets
    whyThisRole: v.optional(v.string()),
    biggestAchievement: v.optional(v.string()),

    // Advanced Data (Arrays of Objects)
    references: v.optional(v.array(v.object({
      name: v.string(),
      relation: v.string(),
      email: v.string(),
      phone: v.string(),
    }))),

    resumeUrl: v.optional(v.string()),
    resumeStorageId: v.optional(v.id("_storage")),
    yearsOfExperience: v.optional(v.number()),
    resumeText: v.optional(v.string()),
    numberOfProjects: v.optional(v.number()),
    fitnessFrequency: v.optional(v.string()),
    dob: v.optional(v.string()), // Format: DD/MM/YYYY
  }).index("by_userId", ["userId"]),

  jobs: defineTable({
    userId: v.id("users"),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    status: v.string(), // "pending", "applying", "applied", "failed"
    source: v.string(),
    url: v.string(),
    error: v.optional(v.string()),
    appliedAt: v.optional(v.number()),
  }).index("by_userId_and_status", ["userId", "status"]),

  agent_status: defineTable({
    userId: v.id("users"),
    command: v.string(), // "idle", "scrape", "apply"
    lastUpdated: v.number(),
  }).index("by_userId", ["userId"]),

  saved_answers: defineTable({
    userId: v.id("users"),
    question: v.string(),
    answer: v.string(),
    jobTitle: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_userId_and_question", ["userId", "question"]),
});

