import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { checkCertificate, changeCertificatePassword, parseProvisioningProfile } from "./certUtils";
import { storagePut } from "./storage";
import { notifyCertificateDetails, notifyProvisioningProfileDetails, notifyError } from "./discordNotification";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/check-cert
 * Check certificate validity (expiration, OCSP, chain)
 */
router.post("/check-cert", upload.single("cert"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const password = req.body.password || "";

    if (!file) {
      return res.status(400).json({ error: "No certificate file provided" });
    }

    // Write file to temp location
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cert-check-"));
    const tmpPath = path.join(tmpDir, file.originalname);
    fs.writeFileSync(tmpPath, file.buffer);

    try {
      const result = await checkCertificate(tmpPath, password);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.cert);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errMsg });
  }
});

/**
 * POST /api/change-cert-password
 * Change P12 certificate password
 */
router.post(
  "/change-cert-password",
  upload.single("p12"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const currentPassword = req.body.currentPassword || "";
      const newPassword = req.body.newPassword || "";

      if (!file) {
        return res.status(400).json({ error: "No P12 file provided" });
      }

      // Write file to temp location
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cert-pass-"));
      const inputPath = path.join(tmpDir, "input.p12");
      const outputPath = path.join(tmpDir, "output.p12");

      fs.writeFileSync(inputPath, file.buffer);

      try {
        const result = await changeCertificatePassword(
          inputPath,
          currentPassword,
          newPassword,
          outputPath
        );

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        // Read the modified P12 file
        const modifiedBuffer = fs.readFileSync(outputPath);

        // Upload to S3
        const fileKey = `certs/modified-${Date.now()}.p12`;
        const { url } = await storagePut(fileKey, modifiedBuffer, "application/x-pkcs12");

        res.json({ downloadUrl: url });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      
      // Log error to Discord
      try {
        const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
        await notifyError(
          discordWebhook,
          "Certificate Check Error",
          `Failed to check certificate or provisioning profile: ${errMsg}`
        );
      } catch (discordErr) {
        console.error("[cert-check] Failed to log error to Discord:", discordErr);
      }
      
      res.status(500).json({ error: errMsg });
    }
  }
);

export default router;

/**
 * POST /api/check-cert-and-profile
 * Check P12 certificate and/or provisioning profile (at least one required)
 */
router.post(
  "/check-cert-and-profile",
  upload.fields([
    { name: "cert", maxCount: 1 },
    { name: "mobileprovision", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const certFile = files?.cert?.[0];
      const provFile = files?.mobileprovision?.[0];
      const password = req.body.password || "";

      if (!certFile && !provFile) {
        return res.status(400).json({ error: "At least one file (P12 certificate or provisioning profile) is required" });
      }

      // Create temp directory
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cert-profile-check-"));
      const result: any = {};

      try {
        const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
        const checkId = `check-${Date.now()}`;

        // Check certificate if provided
        if (certFile) {
          const certPath = path.join(tmpDir, certFile.originalname);
          fs.writeFileSync(certPath, certFile.buffer);
          const certResult = await checkCertificate(certPath, password);
          if (!certResult.success) {
            return res.status(400).json({ error: certResult.error });
          }
          result.certificate = certResult.cert;

          // Log certificate to Discord
          try {
            const cert = certResult.cert;
            if (cert) {
              await notifyCertificateDetails(
                discordWebhook,
                cert.name,
                cert.isExpired ? "Expired" : "Valid",
                cert.expires,
                cert.issuer,
                cert.type
              );
            }
          } catch (err) {
            console.error("[cert-check] Failed to log certificate to Discord:", err);
          }
        }

        // Parse provisioning profile if provided
        if (provFile) {
          const provPath = path.join(tmpDir, provFile.originalname);
          fs.writeFileSync(provPath, provFile.buffer);
          const provResult = await parseProvisioningProfile(provPath);
          if (!provResult.success) {
            return res.status(400).json({ error: provResult.error });
          }
          result.profile = provResult.profile;

          // Log profile to Discord
          try {
            const profile = provResult.profile;
            if (profile) {
              // Determine certificate type from profile type
              const certType = profile.type === "Development" ? "Developer" : profile.type === "Enterprise" ? "Enterprise" : "Distribution";
              await notifyProvisioningProfileDetails(
                discordWebhook,
                profile.name,
                profile.appId,
                profile.teamId,
                profile.status,
                profile.expires,
                profile.type,
                certType,
                profile.entitlements
              );
            }
          } catch (err) {
            console.error("[cert-check] Failed to log profile to Discord:", err);
          }
        }

        res.json(result);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      
      // Log error to Discord
      try {
        const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
        await notifyError(
          discordWebhook,
          "Certificate Check Error",
          `Failed to check certificate or provisioning profile: ${errMsg}`
        );
      } catch (discordErr) {
        console.error("[cert-check] Failed to log error to Discord:", discordErr);
      }
      
      res.status(500).json({ error: errMsg });
    }
  }
);
