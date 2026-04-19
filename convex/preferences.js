import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./auth_helpers";
import { auth } from "./auth";

export const getPreferences = query({
  args: { agentKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx, args.agentKey);
    return await ctx.db
      .query("preferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const savePreferences = mutation({
  args: {
    agentKey: v.optional(v.string()),
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
    const { agentKey, ...prefData } = args;
    const userId = await getUserId(ctx, agentKey);

    // Strip undefined and empty-string values
    const cleanArgs = Object.fromEntries(
      Object.entries(prefData).filter(([_, v]) => v !== undefined && v !== "")
    );

    const existing = await ctx.db
      .query("preferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, cleanArgs);
    } else {
      await ctx.db.insert("preferences", { ...cleanArgs, userId });
    }
  },
});

export const getOrGenerateAgentKey = mutation({
  args: {},
  handler: async (ctx) => {
    let userId = await auth.getUserId(ctx);
    
    // DEV BYPASS: If no user is logged in, find or create a default dev user
    if (!userId) {
      const existingDevUser = await ctx.db.query("users").first();
      if (existingDevUser) {
        userId = existingDevUser._id;
      } else {
        userId = await ctx.db.insert("users", { name: "Default Dev User" });
      }
    }

    const user = await ctx.db.get(userId);
    if (user?.agentKey) return user.agentKey;

    const newKey = `ak_${Math.random().toString(36).substring(2, 15)}`;
    await ctx.db.patch(userId, { agentKey: newKey });
    return newKey;
  },
});

