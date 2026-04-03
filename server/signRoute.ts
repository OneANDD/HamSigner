import express, { Request, Response } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { storagePut } from "./storage";
import { createSigningJob, updateSigningJob, getSigningJob } from "./db";
import { signIpa, extractIpaMetadata, generateManifestPlist } from "./signingService";

const router = express.Router();

// Use disk storage so we can pass file paths to zsign
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ipa-upload-"));
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      // Sanitise filename
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, safe);
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB per file
    files: 3,
  },
  fileFilter: (_req, file, cb) => {
    const allowed: Record<string, string[]> = {
      ipa: ["application/octet-stream", "application/zip", "application/x-ios-app"],
      p12: ["application/x-pkcs12", "application/octet-stream"],
      mobileprovision: ["application/octet-stream"],
    };
    const field = file.fieldname as keyof typeof allowed;
    if (!allowed[field]) {
      return cb(new Error(`Unexpected field: ${file.fieldname}`));
    }
    cb(null, true);
  },
});

const uploadFields = upload.fields([
  { name: "ipa", maxCount: 1 },
  { name: "p12", maxCount: 1 },
  { name: "mobileprovision", maxCount: 1 },
]);

// POST /api/sign — accepts multipart form with ipa, p12, mobileprovision, password
router.post("/sign", (req: Request, res: Response) => {
  uploadFields(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "File upload failed" });
    }

    const files = req.files as Record<string, Express.Multer.File[]>;
    const ipaFile = files?.ipa?.[0];
    const p12File = files?.p12?.[0];
    const provFile = files?.mobileprovision?.[0];
    const password: string = (req.body?.password as string) ?? "";

    if (!ipaFile || !p12File || !provFile) {
      return res.status(400).json({ error: "Missing required files: ipa, p12, mobileprovision" });
    }

    const jobId = uuidv4();
    const tmpDir = path.dirname(ipaFile.path);

    try {
      // Create job record
      await createSigningJob({
        id: jobId,
        status: "uploading",
        originalIpaName: ipaFile.originalname,
      });

      // ---- Sign the IPA ----
      await updateSigningJob(jobId, { status: "signing" });

      const signedIpaName = `signed_${ipaFile.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const outputPath = path.join(tmpDir, signedIpaName);

      const signingResult = await signIpa({
        ipaPath: ipaFile.path,
        p12Path: p12File.path,
        provPath: provFile.path,
        password,
        outputPath,
      });

      if (!signingResult.success) {
        await updateSigningJob(jobId, {
          status: "error",
          errorMessage: signingResult.error,
        });
        return res.status(422).json({ jobId, error: signingResult.error });
      }

      // ---- Extract metadata ----
      const meta = await extractIpaMetadata(outputPath);
      const appName = meta.appName || ipaFile.originalname.replace(/\.ipa$/i, "");
      const bundleId = meta.bundleId || "com.unknown.app";
      const appVersion = meta.appVersion || "1.0";

      // ---- Upload signed IPA to S3 ----
      const ipaKey = `signed/${jobId}/${signedIpaName}`;
      const ipaBuffer = fs.readFileSync(outputPath);
      const { url: signedIpaUrl } = await storagePut(ipaKey, ipaBuffer, "application/octet-stream");

      // ---- Generate and upload manifest.plist ----
      const manifestXml = generateManifestPlist({
        ipaUrl: signedIpaUrl,
        bundleId,
        appVersion,
        appName,
      });
      const manifestKey = `signed/${jobId}/manifest.plist`;
      const { url: manifestUrl } = await storagePut(
        manifestKey,
        Buffer.from(manifestXml, "utf8"),
        "text/xml"
      );

      // ---- Update job as done ----
      await updateSigningJob(jobId, {
        status: "done",
        signedIpaUrl,
        manifestUrl,
        appName,
        bundleId,
        appVersion,
      });

      return res.json({
        jobId,
        status: "done",
        signedIpaUrl,
        manifestUrl,
        itmsUrl: `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`,
        appName,
        bundleId,
        appVersion,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[sign] Unexpected error:", msg);
      await updateSigningJob(jobId, { status: "error", errorMessage: msg }).catch(() => {});
      return res.status(500).json({ jobId, error: "An unexpected error occurred during signing." });
    } finally {
      // Clean up temp files
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  });
});

// GET /api/sign/:jobId — poll job status
router.get("/sign/:jobId", async (req: Request, res: Response) => {
  try {
    const job = await getSigningJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const response: Record<string, unknown> = {
      jobId: job.id,
      status: job.status,
      appName: job.appName,
      bundleId: job.bundleId,
      appVersion: job.appVersion,
      errorMessage: job.errorMessage,
    };

    if (job.status === "done") {
      response.signedIpaUrl = job.signedIpaUrl;
      response.manifestUrl = job.manifestUrl;
      response.itmsUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(job.manifestUrl ?? "")}`;
    }

    return res.json(response);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: msg });
  }
});

export default router;
