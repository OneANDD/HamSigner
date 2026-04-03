import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

export interface SigningInput {
  ipaPath: string;
  p12Path: string;
  provPath: string;
  password: string;
  outputPath: string;
}

export interface SigningResult {
  success: boolean;
  error?: string;
  appName?: string;
  bundleId?: string;
  appVersion?: string;
}

/**
 * Invokes zsign to re-sign an IPA file.
 * Returns success/failure and any metadata extracted from the signed IPA.
 */
export async function signIpa(input: SigningInput): Promise<SigningResult> {
  const { ipaPath, p12Path, provPath, password, outputPath } = input;

  // Validate inputs exist
  for (const [label, p] of [["IPA", ipaPath], ["P12", p12Path], ["MobileProvision", provPath]] as const) {
    if (!fs.existsSync(p)) {
      return { success: false, error: `${label} file not found at path: ${p}` };
    }
  }

  // Build zsign args
  const args: string[] = [
    "-k", p12Path,
    "-m", provPath,
    "-o", outputPath,
    "-z", "6",
    "-q",
  ];

  if (password) {
    args.push("-p", password);
  }

  args.push(ipaPath);

  try {
    const zsignPath = process.env.ZSIGN_PATH || "/usr/local/bin/zsign";
    const { stdout, stderr } = await execFileAsync(zsignPath, args, {
      timeout: 300_000, // 5 minutes max
      maxBuffer: 10 * 1024 * 1024,
    });

    if (!fs.existsSync(outputPath)) {
      const errMsg = stderr || stdout || "zsign produced no output file";
      return { success: false, error: parseZsignError(errMsg) };
    }

    return { success: true };
  } catch (err: unknown) {
    const execErr = err as { stderr?: string; stdout?: string; message?: string; code?: string };
    const raw = execErr.stderr || execErr.stdout || execErr.message || String(err);
    
    // Check if zsign binary is not found
    if (execErr.code === 'ENOENT' || raw.includes('ENOENT')) {
      return { 
        success: false, 
        error: "IPA signing service is not available in this environment. zsign binary is required but not installed. Please deploy to an environment with zsign installed or use a container."
      };
    }
    
    return { success: false, error: parseZsignError(raw) };
  }
}

/**
 * Translates raw zsign stderr into a user-friendly error message.
 */
function parseZsignError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("wrong password") || lower.includes("bad decrypt") || lower.includes("mac verify failure")) {
    return "Incorrect P12 certificate password. Please verify your password and try again.";
  }
  if (lower.includes("no such file") || lower.includes("can't open")) {
    return "One or more uploaded files could not be read. Please re-upload and try again.";
  }
  if (lower.includes("provision") || lower.includes("mobileprovision")) {
    return "The MobileProvision file is invalid or incompatible with the provided certificate.";
  }
  if (lower.includes("certificate") || lower.includes("cert") || lower.includes("p12")) {
    return "The P12 certificate file is invalid or corrupted. Please check your certificate.";
  }
  if (lower.includes("expired")) {
    return "The certificate or provisioning profile has expired.";
  }
  // Return a sanitised version of the raw error (first 300 chars)
  return `Signing failed: ${raw.slice(0, 300)}`;
}

/**
 * Extracts app metadata (name, bundle ID, version) from an IPA's Info.plist
 * by unzipping just that file.
 */
export async function extractIpaMetadata(ipaPath: string): Promise<{
  appName?: string;
  bundleId?: string;
  appVersion?: string;
}> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ipa-meta-"));
  try {
    // List IPA contents to find Info.plist
    const { stdout: listing } = await execFileAsync("unzip", ["-l", ipaPath], {
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
    });

    // Find the Info.plist path (Payload/AppName.app/Info.plist)
    const plistMatch = listing.match(/Payload\/[^/]+\.app\/Info\.plist/);
    if (!plistMatch) return {};

    const plistEntry = plistMatch[0];

    // Extract just that file
    await execFileAsync("unzip", ["-o", "-j", ipaPath, plistEntry, "-d", tmpDir], {
      timeout: 30_000,
    });

    const plistPath = path.join(tmpDir, "Info.plist");
    if (!fs.existsSync(plistPath)) return {};

    const content = fs.readFileSync(plistPath, "utf8");

    const appName = extractPlistValue(content, "CFBundleDisplayName") ||
                    extractPlistValue(content, "CFBundleName");
    const bundleId = extractPlistValue(content, "CFBundleIdentifier");
    const appVersion = extractPlistValue(content, "CFBundleShortVersionString") ||
                       extractPlistValue(content, "CFBundleVersion");

    return { appName, bundleId, appVersion };
  } catch {
    return {};
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function extractPlistValue(plist: string, key: string): string | undefined {
  // Handles both <string> and other simple value types after a <key>
  const regex = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`);
  const match = plist.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * Generates an ITMS manifest plist XML string.
 */
export function generateManifestPlist(opts: {
  ipaUrl: string;
  bundleId: string;
  appVersion: string;
  appName: string;
}): string {
  const { ipaUrl, bundleId, appVersion, appName } = opts;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${escapeXml(ipaUrl)}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${escapeXml(bundleId)}</string>
        <key>bundle-version</key>
        <string>${escapeXml(appVersion)}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${escapeXml(appName)}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
