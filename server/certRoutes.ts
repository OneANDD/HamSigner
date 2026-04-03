import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { checkCertificate, changeCertificatePassword } from "./certUtils";
import { storagePut } from "./storage";

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
      res.status(500).json({ error: errMsg });
    }
  }
);

export default router;
