import { getDb } from "./db";
import { signingJobs } from "../drizzle/schema";
import { lt, eq, and } from "drizzle-orm";
import { ENV } from "./_core/env";

/**
 * Cleanup service to delete expired signed IPA files from S3
 * Runs periodically to remove files older than 7 days
 */

async function deleteFromStorage(key: string): Promise<boolean> {
  try {
    const baseUrl = ENV.forgeApiUrl;
    const apiKey = ENV.forgeApiKey;

    if (!baseUrl || !apiKey) {
      console.warn("[Cleanup] Storage credentials missing");
      return false;
    }

    const deleteUrl = new URL("v1/storage/delete", baseUrl.replace(/\/+$/, "") + "/");
    deleteUrl.searchParams.set("path", key);

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`[Cleanup] Failed to delete ${key}: ${response.status}`);
      return false;
    }

    console.log(`[Cleanup] Successfully deleted ${key}`);
    return true;
  } catch (error) {
    console.error(`[Cleanup] Error deleting ${key}:`, error);
    return false;
  }
}

export async function cleanupExpiredFiles(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Cleanup] Database not available");
      return;
    }

    // Find all expired files that haven't been deleted yet
    const now = new Date();
    const expiredJobs = await db
      .select()
      .from(signingJobs)
      .where(
        and(
          lt(signingJobs.expiresAt, now),
          eq(signingJobs.isDeleted, 0),
          eq(signingJobs.status, "done")
        )
      );

    if (expiredJobs.length === 0) {
      console.log("[Cleanup] No expired files to clean up");
      return;
    }

    console.log(`[Cleanup] Found ${expiredJobs.length} expired files to delete`);

    for (const job of expiredJobs) {
      try {
        // Extract the job ID from the URLs to construct the S3 keys
        if (job.signedIpaUrl) {
          // Extract key from URL: signed/{jobId}/{filename}
          const ipaKey = `signed/${job.id}/${job.originalIpaName || "app.ipa"}`;
          await deleteFromStorage(ipaKey);
        }

        if (job.manifestUrl) {
          // Delete manifest.plist
          const manifestKey = `signed/${job.id}/manifest.plist`;
          await deleteFromStorage(manifestKey);
        }

        // Mark job as deleted in database
        await db
          .update(signingJobs)
          .set({ isDeleted: 1 })
          .where(eq(signingJobs.id, job.id));

        console.log(`[Cleanup] Marked job ${job.id} as deleted`);
      } catch (error) {
        console.error(`[Cleanup] Error processing job ${job.id}:`, error);
      }
    }

    console.log("[Cleanup] Cleanup job completed");
  } catch (error) {
    console.error("[Cleanup] Cleanup job failed:", error);
  }
}

/**
 * Start the cleanup job that runs every 6 hours
 */
export function startCleanupSchedule(): void {
  // Run cleanup every 6 hours (21600000 ms)
  const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000;

  // Run cleanup immediately on startup
  cleanupExpiredFiles().catch((err) => console.error("[Cleanup] Initial cleanup failed:", err));

  // Then run periodically
  setInterval(() => {
    cleanupExpiredFiles().catch((err) => console.error("[Cleanup] Scheduled cleanup failed:", err));
  }, CLEANUP_INTERVAL);

  console.log("[Cleanup] Cleanup schedule started - runs every 6 hours");
}
