import express, { Request, Response } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import https from "https";
import { storagePut } from "./storage";
import { createSigningJob, updateSigningJob, getSigningJob } from "./db";
import { signIpa, extractIpaMetadata, generateManifestPlist } from "./signingService";
import { notifySigningError, notifySigningSuccess, notifyError, notifyCertificateDetails, notifyProvisioningProfileDetails } from "./discordNotification";
import { checkCertificate, parseProvisioningProfile } from "./certUtils";

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
      mobileprovision: ["application/octet-stream", "application/x-apple-aspen-mobileprovision"],
      provision: ["application/octet-stream", "application/x-apple-aspen-mobileprovision"], // Accept both names
    };
    const field = file.fieldname as keyof typeof allowed;
    if (!allowed[field]) {
      console.error(`[multer] Unexpected field: ${file.fieldname}`);
      return cb(new Error(`Unexpected field: ${file.fieldname}`));
    }
    const mimeTypes = allowed[field];
    if (!mimeTypes.includes(file.mimetype)) {
      console.error(`[multer] Invalid MIME type for ${field}: ${file.mimetype}. Allowed: ${mimeTypes.join(", ")}`);
      return cb(new Error(`Invalid MIME type for ${field}: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// Helper to download file from URL
function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl: string) => {
      https.get(currentUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            console.log(`[download] Redirecting to ${redirectUrl}`);
            makeRequest(redirectUrl);
            return;
          }
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`[download] Downloaded ${buffer.length} bytes`);
          resolve(buffer);
        });
        response.on('error', reject);
      }).on('error', reject);
    };
    makeRequest(url);
  });
}

// POST /api/sign — accepts multipart form with (ipa OR ipaUrl), p12, mobileprovision, password
router.post("/sign", (req: Request, res: Response, next) => {
  // Use .any() to accept all fields, then manually validate
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ipa-upload-"));
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, safe);
      },
    }),
    limits: {
      fileSize: 500 * 1024 * 1024,
      files: 3,
    },
  }).any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "File upload failed" });
    }
    
    // Manually validate uploaded files
    const files = req.files as Express.Multer.File[] || [];
    console.log("[sign] Received files:", files.map(f => ({ fieldname: f.fieldname, mimetype: f.mimetype })));
    console.log("[sign] Received body:", Object.keys(req.body));
    const allowed: Record<string, string[]> = {
      ipa: ["application/octet-stream", "application/zip", "application/x-ios-app"],
      p12: ["application/x-pkcs12", "application/octet-stream"],
      mobileprovision: ["application/octet-stream", "application/x-apple-aspen-mobileprovision"],
      provision: ["application/octet-stream", "application/x-apple-aspen-mobileprovision"], // Accept both names
    };
    
    for (const file of files) {
      const field = file.fieldname as keyof typeof allowed;
      console.log(`[sign] Validating field: ${field}, MIME: ${file.mimetype}`);
      if (!allowed[field]) {
        console.log(`[sign] Field ${field} not in allowed list:`, Object.keys(allowed));
        return res.status(400).json({ error: `Unexpected field: ${file.fieldname}` });
      }
      const mimeTypes = allowed[field];
      if (!mimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: `Invalid MIME type for ${field}: ${file.mimetype}` });
      }
    }
    
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    // Convert files array to keyed object
    const filesArray = req.files as Express.Multer.File[] || [];
    const files: Record<string, Express.Multer.File[]> = {};
    for (const file of filesArray) {
      if (!files[file.fieldname]) {
        files[file.fieldname] = [];
      }
      files[file.fieldname].push(file);
    }
    
    const ipaUrl: string | undefined = (req.body?.ipaUrl as string) || undefined;
    const ipaFile = files?.ipa?.[0];
    const p12File = files?.p12?.[0];
    const provFile = files?.mobileprovision?.[0] || files?.provision?.[0]; // Accept both field names
    const password: string = (req.body?.password as string) ?? "";
    const bundleIdOverride: string | undefined = (req.body?.bundleIdOverride as string) || undefined;
    const appNameOverride: string | undefined = (req.body?.appNameOverride as string) || undefined;

    if ((!ipaFile && !ipaUrl) || !p12File || !provFile) {
      return res.status(400).json({ error: "Missing required files: (ipa or ipaUrl), p12, mobileprovision" });
    }

    const jobId = uuidv4();
    let tmpDir: string;
    let ipaPath: string;
    let ipaOriginalName: string;

    // If ipaUrl is provided, download it; otherwise use uploaded file
    if (ipaUrl) {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ipa-download-"));
      try {
        const ipaBuffer = await downloadFile(ipaUrl);
        ipaOriginalName = ipaUrl.split('/').pop() || 'app.ipa';
        ipaPath = path.join(tmpDir, ipaOriginalName);
        fs.writeFileSync(ipaPath, ipaBuffer);
      } catch (downloadErr: unknown) {
        const msg = downloadErr instanceof Error ? downloadErr.message : String(downloadErr);
        const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
        await notifyError(discordWebhook, "IPA Download Error", msg, {
          "URL": ipaUrl.substring(0, 100),
          "Error Type": downloadErr instanceof Error ? downloadErr.constructor.name : "Unknown",
        });
        return res.status(400).json({ error: `Failed to download IPA: ${msg}` });
      }
    } else if (ipaFile) {
      ipaPath = ipaFile.path;
      ipaOriginalName = ipaFile.originalname;
      tmpDir = path.dirname(ipaPath);
    } else {
      return res.status(400).json({ error: "No IPA file or URL provided" });
    }

    try {
      // Create job record
      await createSigningJob({
        id: jobId,
        status: "uploading",
        originalIpaName: ipaOriginalName,
      });

      // ---- Sign the IPA ----
      await updateSigningJob(jobId, { status: "signing" });

      // Copy P12 and provisioning files to the same temp directory as the IPA
      const p12Path = path.join(tmpDir, path.basename(p12File.path));
      const provPath = path.join(tmpDir, path.basename(provFile.path));
      fs.copyFileSync(p12File.path, p12Path);
      fs.copyFileSync(provFile.path, provPath);

      const signedIpaName = `signed_${ipaOriginalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const outputPath = path.join(tmpDir, signedIpaName);

      const signingResult = await signIpa(
        ipaPath,
        p12Path,
        password,
        provPath,
        outputPath
      );

      if (!signingResult.success) {
        await updateSigningJob(jobId, {
          status: "error",
          errorMessage: signingResult.error,
        });
        const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
        await notifySigningError(discordWebhook, jobId, ipaOriginalName, signingResult.error || "Unknown error");
        return res.status(422).json({ jobId, error: signingResult.error });
      }

      // ---- Extract metadata ----
      console.log(`[sign] Extracting metadata from: ${outputPath}`);
      console.log(`[sign] File exists: ${fs.existsSync(outputPath)}`);
      const meta = await extractIpaMetadata(outputPath);
      console.log(`[sign] Extracted metadata:`, meta);
      const appName = appNameOverride || (meta.appName as string) || ipaOriginalName.replace(/\.ipa$/i, "");
      const bundleId = bundleIdOverride || (meta.bundleId as string) || "com.unknown.app";
      const appVersion = (meta.appVersion as string) || "1.0";
      console.log(`[sign] Final metadata:`, { appName, bundleId, appVersion });

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
        "application/x-plist"
      );

      // ---- Update job as done ----
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await updateSigningJob(jobId, {
        status: "done",
        signedIpaUrl,
        manifestUrl,
        appName,
        bundleId,
        appVersion,
        expiresAt,
      });

      const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
      await notifySigningSuccess(discordWebhook, jobId, appName, bundleId, appVersion);

      // Log certificate details to Discord
      try {
        console.log("[sign] Starting certificate logging...");
        const certResult = await checkCertificate(p12Path, password);
        console.log("[sign] Certificate check result:", certResult);
        if (certResult.success && certResult.cert) {
          const cert = certResult.cert;
          console.log("[sign] Logging certificate to Discord:", { name: cert.name, type: cert.type, issuer: cert.issuer });
          await notifyCertificateDetails(
            discordWebhook,
            cert.name,
            cert.isExpired ? "Expired" : "Valid",
            cert.expires,
            cert.issuer,
            cert.type,
            cert.entitlements
          );
          console.log("[sign] Certificate notification sent");
        } else {
          console.log("[sign] Certificate check failed:", certResult.error);
        }
      } catch (err) {
        console.error("[sign] Failed to log certificate details:", err);
      }

      // Log provisioning profile details to Discord
      try {
        console.log("[sign] Starting provisioning profile logging...");
        const provResult = await parseProvisioningProfile(provPath);
        console.log("[sign] Provisioning profile parse result:", provResult);
        if (provResult.success && provResult.profile) {
          const profile = provResult.profile;
          console.log("[sign] Logging profile to Discord:", { name: profile.name, type: profile.type, appId: profile.appId });
          await notifyProvisioningProfileDetails(
            discordWebhook,
            profile.name,
            profile.appId,
            profile.teamId,
            profile.status,
            profile.expires,
            profile.type,
            profile.type === "Development" ? "Developer" : profile.type === "Enterprise" ? "Enterprise" : "Distribution",
            profile.entitlements
          );
          console.log("[sign] Profile notification sent");
        } else {
          console.log("[sign] Profile parse failed:", provResult.error);
        }
      } catch (err) {
        console.error("[sign] Failed to log provisioning profile details:", err);
      }

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
      const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
      await notifyError(discordWebhook, "Unexpected Signing Error", msg, {
        "Job ID": jobId,
        "IPA Name": ipaOriginalName,
        "Error Type": error instanceof Error ? error.constructor.name : "Unknown",
      });
      return res.status(500).json({ jobId, error: "An unexpected error occurred during signing." });
    } finally {
      // Clean up temp files
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    await notifyError(discordWebhook, "Request Processing Error", msg, {
      "Error Type": err instanceof Error ? err.constructor.name : "Unknown",
    });
    return res.status(400).json({ error: msg || "Request processing failed" });
  }
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
