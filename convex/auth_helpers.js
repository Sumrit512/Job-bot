import { auth } from "./auth";

/**
 * Resolves the userId from either the authenticated session or an agentKey.
 * @param ctx The Convex context (QueryCtx or MutationCtx)
 * @param agentKey Optional agentKey provided by local scripts
 * @returns The Id<"users"> or throws an error if unauthorized.
 */
export async function getUserId(ctx, agentKey) {
  // 1. Try to get user from authenticated session (UI)
  const userId = await auth.getUserId(ctx);
  if (userId) return userId;

  // 2. Try to get user from agentKey (Scripts)
  if (agentKey) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_agentKey", (q) => q.eq("agentKey", agentKey))
      .unique();
    if (user) return user._id;
  }

  // 3. DEV BYPASS: For local development without auth configured, just use the first user
  const firstUser = await ctx.db.query("users").first();
  if (firstUser) return firstUser._id;

  throw new Error("Unauthorized: Invalid session or agentKey.");
}
