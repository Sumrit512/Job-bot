import { mutation } from "./_generated/server";

export const execute = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all preferences
    const allPrefs = await ctx.db.query("preferences").collect();
    if (allPrefs.length <= 1) return "Nothing to do";

    // Find the one with the most keys
    let bestDoc = allPrefs[0];
    let maxKeys = 0;
    
    for (const doc of allPrefs) {
      const keyCount = Object.keys(doc).length;
      if (keyCount > maxKeys) {
        maxKeys = keyCount;
        bestDoc = doc;
      }
    }

    // Merge data from the best doc into the most recent doc if needed,
    // or simply delete all other docs so the best one is the ONLY one.
    // Wait, getPreferences uses .order("desc").first() or .collect().
    // If we just keep bestDoc and delete the rest, bestDoc is returned.
    for (const doc of allPrefs) {
      if (doc._id !== bestDoc._id) {
        await ctx.db.delete(doc._id);
      }
    }
    
    return "Cleaned up duplicates, kept ID: " + bestDoc._id;
  }
});
