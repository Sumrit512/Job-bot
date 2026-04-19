import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./auth_helpers";

export const getStatus = query({
  args: { agentKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx, args.agentKey);
    return await ctx.db
      .query("agent_status")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const triggerCommand = mutation({
  args: { 
    agentKey: v.optional(v.string()), 
    command: v.string() 
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx, args.agentKey);
    const status = await ctx.db
      .query("agent_status")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (status) {
      await ctx.db.patch(status._id, { command: args.command, lastUpdated: Date.now() });
    } else {
      await ctx.db.insert("agent_status", { 
        userId, 
        command: args.command, 
        lastUpdated: Date.now() 
      });
    }
  },
});

export const clearCommand = mutation({
  args: { agentKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx, args.agentKey);
    const status = await ctx.db
      .query("agent_status")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (status) {
      await ctx.db.patch(status._id, { command: "idle", lastUpdated: Date.now() });
    }
  },
});

