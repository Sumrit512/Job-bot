import { mutation } from "./_generated/server";
import { auth } from "./auth";

/**
 * Migration script: Assigns all records without a userId to the currently logged-in user.
 * Run this once after logging in to reclaim your single-tenant data.
 */
export const migrateToMultiTenant = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized: Please log in first.");

    let migratedJobs = 0;
    let migratedPrefs = 0;
    let migratedStatus = 0;

    // 1. Migrate Preferences
    const prefs = await ctx.db.query("preferences").collect();
    for (const doc of prefs) {
      if (!doc.userId) {
        await ctx.db.patch(doc._id, { userId });
        migratedPrefs++;
      }
    }

    // 2. Migrate Jobs
    const jobs = await ctx.db.query("jobs").collect();
    for (const doc of jobs) {
      if (!doc.userId) {
        await ctx.db.patch(doc._id, { userId });
        migratedJobs++;
      }
    }

    // 3. Migrate Agent Status
    const status = await ctx.db.query("agent_status").collect();
    for (const doc of status) {
      if (!doc.userId) {
        await ctx.db.patch(doc._id, { userId });
        migratedStatus++;
      }
    }

    return {
      message: "Migration complete",
      migratedPrefs,
      migratedJobs,
      migratedStatus
    };
  },
});
