import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

export interface CertInfo {
  name: string;
  issued: string;
  expires: string;
  daysRemaining: number;
  isExpired: boolean;
  issuer: string;
  serialNumber: string;
  algorithm: string;
}

/**
 * Uses openssl to extract certificate information from a P12 file.
 */
export async function checkCertificate(
  p12Path: string,
  password?: string
): Promise<{ success: boolean; error?: string; cert?: CertInfo }> {
  if (!fs.existsSync(p12Path)) {
    return { success: false, error: "P12 file not found" };
  }

  try {
    // Extract certificate from P12
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cert-check-"));
    const certPath = path.join(tmpDir, "cert.pem");

    const args = [
      "pkcs12",
      "-in", p12Path,
      "-out", certPath,
      "-clcerts",
      "-nokeys",
    ];

    if (password) {
      args.push("-passin", `pass:${password}`);
    } else {
      args.push("-passin", "pass:");
    }

    try {
      await execFileAsync("openssl", args, { timeout: 30_000 });
    } catch (err: unknown) {
      const execErr = err as { stderr?: string };
      const errMsg = execErr.stderr || String(err);
      if (errMsg.toLowerCase().includes("password")) {
        return { success: false, error: "Incorrect P12 password" };
      }
      return { success: false, error: "Failed to read P12 file" };
    }

    if (!fs.existsSync(certPath)) {
      return { success: false, error: "Failed to extract certificate" };
    }

    // Parse certificate with openssl x509
    const { stdout: textOutput } = await execFileAsync("openssl", [
      "x509",
      "-in", certPath,
      "-text",
      "-noout",
    ], { timeout: 30_000 });

    // Extract key information
    const cert = parseCertificateText(textOutput);

    fs.rmSync(tmpDir, { recursive: true, force: true });

    return { success: true, cert };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Parses openssl x509 text output to extract certificate info.
 */
function parseCertificateText(text: string): CertInfo {
  const lines = text.split("\n");

  // Subject (certificate name)
  let name = "Unknown";
  for (const line of lines) {
    if (line.includes("Subject:")) {
      const match = line.match(/CN\s*=\s*([^,]+)/);
      if (match) name = match[1].trim();
      break;
    }
  }

  // Issuer
  let issuer = "Unknown";
  for (const line of lines) {
    if (line.includes("Issuer:")) {
      const match = line.match(/CN\s*=\s*([^,]+)/);
      if (match) issuer = match[1].trim();
      break;
    }
  }

  // Serial Number
  let serialNumber = "Unknown";
  for (const line of lines) {
    if (line.includes("Serial Number:")) {
      serialNumber = line.split("Serial Number:")[1].trim();
      break;
    }
  }

  // Public Key Algorithm
  let algorithm = "Unknown";
  for (const line of lines) {
    if (line.includes("Public-Key:")) {
      algorithm = line.trim();
      break;
    }
  }

  // Not Before (Issued)
  let issued = "Unknown";
  for (const line of lines) {
    if (line.includes("Not Before:")) {
      issued = line.split("Not Before:")[1].trim();
      break;
    }
  }

  // Not After (Expires)
  let expires = "Unknown";
  let expiresDate: Date | null = null;
  for (const line of lines) {
    if (line.includes("Not After :")) {
      expires = line.split("Not After :")[1].trim();
      expiresDate = new Date(expires);
      break;
    }
  }

  // Calculate days remaining
  const now = new Date();
  let daysRemaining = 0;
  let isExpired = false;

  if (expiresDate) {
    const diff = expiresDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining < 0;
  }

  return {
    name,
    issued,
    expires,
    daysRemaining: Math.max(0, daysRemaining),
    isExpired,
    issuer,
    serialNumber,
    algorithm,
  };
}

/**
 * Changes the password of a P12 certificate file.
 */
export async function changeCertificatePassword(
  p12Path: string,
  currentPassword: string,
  newPassword: string,
  outputPath: string
): Promise<{ success: boolean; error?: string }> {
  if (!fs.existsSync(p12Path)) {
    return { success: false, error: "P12 file not found" };
  }

  try {
    const args = [
      "pkcs12",
      "-in", p12Path,
      "-out", outputPath,
      "-export",
      "-passin", `pass:${currentPassword}`,
      "-passout", `pass:${newPassword}`,
    ];

    try {
      await execFileAsync("openssl", args, { timeout: 30_000 });
    } catch (err: unknown) {
      const execErr = err as { stderr?: string };
      const errMsg = execErr.stderr || String(err);
      if (errMsg.toLowerCase().includes("password")) {
        return { success: false, error: "Incorrect current password" };
      }
      return { success: false, error: "Failed to process P12 file" };
    }

    if (!fs.existsSync(outputPath)) {
      return { success: false, error: "Failed to create new P12 file" };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
