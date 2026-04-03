import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module so tests don't need a real DB connection
vi.mock("./db", () => {
  const store = new Map<string, Record<string, unknown>>();
  return {
    createSigningJob: vi.fn(async (job: Record<string, unknown>) => {
      store.set(job.id as string, { ...job });
    }),
    getSigningJob: vi.fn(async (id: string) => store.get(id)),
    updateSigningJob: vi.fn(async (id: string, update: Record<string, unknown>) => {
      const existing = store.get(id);
      if (existing) store.set(id, { ...existing, ...update });
    }),
    __store: store,
  };
});

import { createSigningJob, getSigningJob, updateSigningJob } from "./db";

describe("signing job lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a job with pending status", async () => {
    await createSigningJob({ id: "job-1", status: "pending" });
    expect(createSigningJob).toHaveBeenCalledWith({ id: "job-1", status: "pending" });
  });

  it("transitions from uploading → signing → done", async () => {
    await createSigningJob({ id: "job-2", status: "uploading" });
    await updateSigningJob("job-2", { status: "signing" });
    await updateSigningJob("job-2", {
      status: "done",
      signedIpaUrl: "https://cdn.example.com/signed.ipa",
      manifestUrl: "https://cdn.example.com/manifest.plist",
      appName: "TestApp",
      bundleId: "com.test.app",
      appVersion: "1.0",
    });

    const job = await getSigningJob("job-2");
    expect(job?.status).toBe("done");
    expect(job?.signedIpaUrl).toBe("https://cdn.example.com/signed.ipa");
    expect(job?.manifestUrl).toBe("https://cdn.example.com/manifest.plist");
    expect(job?.appName).toBe("TestApp");
  });

  it("transitions to error state with message", async () => {
    await createSigningJob({ id: "job-3", status: "uploading" });
    await updateSigningJob("job-3", { status: "signing" });
    await updateSigningJob("job-3", {
      status: "error",
      errorMessage: "Incorrect P12 certificate password.",
    });

    const job = await getSigningJob("job-3");
    expect(job?.status).toBe("error");
    expect(job?.errorMessage).toContain("Incorrect P12");
  });

  it("returns undefined for non-existent job", async () => {
    const job = await getSigningJob("non-existent-id");
    expect(job).toBeUndefined();
  });
});
