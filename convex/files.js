import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./auth_helpers";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveResume = mutation({
  args: {
    agentKey: v.optional(v.string()),
    storageId: v.id("_storage"),
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
    jobType: v.optional(v.array(v.string())),
    targetPortals: v.optional(v.array(v.string())),
    maxPages: v.optional(v.number()),
    yearsOfExperience: v.optional(v.number()),

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

    // Advanced Data
    references: v.optional(v.array(v.object({
      name: v.string(),
      relation: v.string(),
      email: v.string(),
      phone: v.string()
    }))),

    resumeText: v.optional(v.string()),
    numberOfProjects: v.optional(v.number()),
    fitnessFrequency: v.optional(v.string()),
    dob: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agentKey, storageId, resumeText, ...prefs } = args;
    const userId = await getUserId(ctx, agentKey);

    // Strip empty string values
    const cleanPrefs = Object.fromEntries(
      Object.entries(prefs).filter(([_, v]) => v !== undefined && v !== "")
    );

    const patchData = {
      ...cleanPrefs,
      userId,
      resumeStorageId: storageId,
      resumeText: resumeText || undefined,
    };

    const existing = await ctx.db
      .query("preferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, patchData);
    } else {
      await ctx.db.insert("preferences", patchData);
    }
  },
});

export const getResumeUrl = query({
  args: { agentKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx, args.agentKey);
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!prefs || !prefs.resumeStorageId) return null;
    return await ctx.storage.getUrl(prefs.resumeStorageId);
  },
});


