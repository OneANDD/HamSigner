import { execFile as execFileCallback } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFileCallback);

/**
 * Invokes zsign to re-sign an IPA file.
 * Returns success/failure and any metadata extracted from the signed IPA.
 */
export async function signIpa(
  ipaPath: string,
  p12Path: string,
  p12Password: string,
  provisioningProfilePath: string
): Promise<{ success: boolean; error?: string; metadata?: Record<string, unknown> }> {
  try {
    for (const [label, p] of [["IPA", ipaPath], ["P12", p12Path], ["MobileProvision", provisioningProfilePath]] as const) {
      if (!fs.existsSync(p)) {
        return { success: false, error: `${label} file not found: ${p}` };
      }
    }

    const outputPath = ipaPath.replace(/\.ipa$/, "-signed.ipa");

    // Invoke zsign with the certificate password
    await execFileAsync("zsign", ["-k", p12Path, "-p", p12Password, "-m", provisioningProfilePath, "-o", outputPath, ipaPath], {
      timeout: 300_000, // 5 minutes max
      maxBuffer: 10 * 1024 * 1024,
    });

    // Extract metadata from the signed IPA
    const metadata = await extractIpaMetadata(outputPath);

    return { success: true, metadata };
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    const msg = error?.message || String(err);

    if (msg.includes("ENOENT") && msg.includes("zsign")) {
      return {
        success: false,
        error: "IPA signing service is not available in this environment. zsign binary is required but not installed. Please deploy to an environment with zsign installed or use a container."
      };
    }

    return { success: false, error: msg };
  }
}

/**
 * Extracts app metadata (name, bundle ID, version) from an IPA's Info.plist
 */
export async function extractIpaMetadata(ipaPath: string): Promise<Record<string, unknown>> {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ipa-extract-"));

    try {
      // List IPA contents to find Info.plist
      const { stdout: listing } = await execFileAsync("unzip", ["-l", ipaPath], {
        maxBuffer: 2 * 1024 * 1024,
      });

      // Find the Info.plist path (Payload/AppName.app/Info.plist)
      const plistMatch = listing.match(/Payload\/[^/]+\.app\/Info\.plist/);
      if (!plistMatch) return {};

      const plistEntry = plistMatch[0];

      // Extract Info.plist from the IPA
      await execFileAsync("unzip", ["-o", "-j", ipaPath, plistEntry, "-d", tmpDir], {
        maxBuffer: 2 * 1024 * 1024,
      });

      const plistPath = path.join(tmpDir, "Info.plist");
      if (!fs.existsSync(plistPath)) return {};

      const content = fs.readFileSync(plistPath, "utf8");

      return {
        appName: extractPlistValue(content, "CFBundleDisplayName") || extractPlistValue(content, "CFBundleName") || "Unknown App",
        bundleId: extractPlistValue(content, "CFBundleIdentifier") || "com.unknown.app",
        appVersion: extractPlistValue(content, "CFBundleShortVersionString") || extractPlistValue(content, "CFBundleVersion") || "1.0",
      };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error("[extractIpaMetadata] Error:", err);
    return {};
  }
}

function extractPlistValue(plist: string, key: string): string | undefined {
  const regex = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`);
  const match = plist.match(regex);
  return match ? match[1] : undefined;
}

/**
 * Generates an ITMS manifest plist XML string with proper formatting for iOS compatibility.
 * Properly formatted with newlines and indentation to ensure iOS devices can parse it correctly.
 */
export function generateManifestPlist(opts: {
  ipaUrl: string;
  bundleId: string;
  appVersion: string;
  appName: string;
}): string {
  const { ipaUrl, bundleId, appVersion, appName } = opts;
  
  // Format with proper newlines and indentation for iOS device compatibility
  // iOS devices require proper XML formatting to parse the manifest correctly
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
