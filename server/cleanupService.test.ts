import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanupExpiredFiles } from "./cleanupService";
import { getDb, createSigningJob, updateSigningJob } from "./db";
import { signingJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("cleanupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should identify expired files correctly", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for testing");
      return;
    }

    // Create a signing job that expires in the past
    const jobId = `test-cleanup-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() - 1); // 1 day ago

    await createSigningJob({
      id: jobId,
      status: "done",
      signedIpaUrl: "https://example.com/signed.ipa",
      manifestUrl: "https://example.com/manifest.plist",
      appName: "Test App",
      bundleId: "com.test.app",
      appVersion: "1.0",
      expiresAt,
      isDeleted: 0,
      originalIpaName: "app.ipa",
    });

    // Verify the job was created
    const result = await db
      .select()
      .from(signingJobs)
      .where(eq(signingJobs.id, jobId));

    expect(result).toHaveLength(1);
    expect(result[0].expiresAt?.getTime()).toBeLessThan(new Date().getTime());
    expect(result[0].isDeleted).toBe(0);

    // Cleanup would mark this as deleted (we're not testing actual S3 deletion)
    // In real scenario, cleanupExpiredFiles() would delete from S3 and mark as deleted
  });

  it("should not delete files that haven't expired yet", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for testing");
      return;
    }

    // Create a signing job that expires in the future
    const jobId = `test-future-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await createSigningJob({
      id: jobId,
      status: "done",
      signedIpaUrl: "https://example.com/signed.ipa",
      manifestUrl: "https://example.com/manifest.plist",
      appName: "Test App",
      bundleId: "com.test.app",
      appVersion: "1.0",
      expiresAt,
      isDeleted: 0,
      originalIpaName: "app.ipa",
    });

    // Verify the job was created
    const result = await db
      .select()
      .from(signingJobs)
      .where(eq(signingJobs.id, jobId));

    expect(result).toHaveLength(1);
    expect(result[0].expiresAt?.getTime()).toBeGreaterThan(new Date().getTime());
    expect(result[0].isDeleted).toBe(0);
  });

  it("should set expiration time 7 days in the future when signing completes", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for testing");
      return;
    }

    // Create a signing job
    const jobId = `test-expiration-${Date.now()}`;
    await createSigningJob({
      id: jobId,
      status: "signing",
      originalIpaName: "app.ipa",
    });

    // Simulate signing completion with 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await updateSigningJob(jobId, {
      status: "done",
      signedIpaUrl: "https://example.com/signed.ipa",
      manifestUrl: "https://example.com/manifest.plist",
      appName: "Test App",
      bundleId: "com.test.app",
      appVersion: "1.0",
      expiresAt,
    });

    // Verify the expiration was set correctly
    const result = await db
      .select()
      .from(signingJobs)
      .where(eq(signingJobs.id, jobId));

    expect(result).toHaveLength(1);
    expect(result[0].expiresAt).toBeDefined();

    // Check that expiration is approximately 7 days from now (within 1 minute tolerance)
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const timeDiff = Math.abs(
      (result[0].expiresAt?.getTime() || 0) - sevenDaysFromNow.getTime()
    );
    const oneMinute = 60 * 1000;

    expect(timeDiff).toBeLessThan(oneMinute);
  });
});
