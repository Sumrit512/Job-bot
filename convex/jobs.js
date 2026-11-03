import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./auth_helpers";

export const listJobs = query({
  args: { agentKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx, args.agentKey);
    return await ctx.db
      .query("jobs")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const addJob = mutation({
  args: {
    agentKey: v.optional(v.string()),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    source: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { agentKey, ...jobData } = args;
    const userId = await getUserId(ctx, agentKey);

    const existing = await ctx.db
      .query("jobs")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("url"), jobData.url))
      .first();

    if (existing) {
      return { id: existing._id, isNew: false };
    }

    const id = await ctx.db.insert("jobs", {
      ...jobData,
      userId,
      status: "pending",
    });
    
    return { id, isNew: true };
  },
});

export const updateJobStatus = mutation({
  args: {
    agentKey: v.optional(v.string()),
    id: v.id("jobs"),
    status: v.string(),
    error: v.optional(v.string()),
    score: v.optional(v.number()),
    missingSkills: v.optional(v.array(v.string())),
    atsFeedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agentKey, id, ...updates } = args;
    const userId = await getUserId(ctx, agentKey);

    // Verify ownership
    const job = await ctx.db.get(id);
    if (!job || job.userId !== userId) {
      throw new Error("Unauthorized: You do not own this job record.");
    }

    const patchData = {
      ...updates,
      appliedAt: updates.status === "applied" ? Date.now() : job.appliedAt,
    };
    Object.keys(patchData).forEach((key) => {
      if (patchData[key] === undefined) delete patchData[key];
    });

    await ctx.db.patch(id, patchData);
  },
});

