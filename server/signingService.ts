import { execFile as execFileCallback } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
// @ts-ignore
import plistModule from "plist";
// @ts-ignore
import * as bplistParser from "bplist-parser";

const plistParser = plistModule as any;

const execFileAsync = promisify(execFileCallback);

/**
 * Invokes zsign to re-sign an IPA file.
 * Returns success/failure and any metadata extracted from the signed IPA.
 */
export async function signIpa(
  ipaPath: string,
  p12Path: string,
  p12Password: string,
  provisioningProfilePath: string,
  outputPath?: string
): Promise<{ success: boolean; error?: string; metadata?: Record<string, unknown> }> {
  try {
    for (const [label, p] of [["IPA", ipaPath], ["P12", p12Path], ["MobileProvision", provisioningProfilePath]] as const) {
      if (!fs.existsSync(p)) {
        return { success: false, error: `${label} file not found: ${p}` };
      }
    }

    // Use provided outputPath or generate default
    const finalOutputPath = outputPath || ipaPath.replace(/\.ipa$/, "-signed.ipa");

    // Invoke zsign with the certificate password
    console.log(`[signIpa] Starting zsign with outputPath=${finalOutputPath}`);
    try {
      await execFileAsync("zsign", ["-k", p12Path, "-p", p12Password, "-m", provisioningProfilePath, "-o", finalOutputPath, ipaPath], {
        timeout: 300_000, // 5 minutes max
        maxBuffer: 10 * 1024 * 1024,
      });
      console.log(`[signIpa] zsign completed successfully`);
    } catch (zsignErr: unknown) {
      const zsignError = zsignErr as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
      const errorMsg = zsignError?.stderr || zsignError?.stdout || zsignError?.message || String(zsignErr);
      console.error(`[signIpa] zsign failed with error:`);
      console.error(`  Message: ${zsignError?.message}`);
      console.error(`  Code: ${zsignError?.code}`);
      console.error(`  Stderr: ${zsignError?.stderr}`);
      console.error(`  Stdout: ${zsignError?.stdout}`);
      console.error(`  Full error: ${errorMsg}`);
      return { success: false, error: `zsign failed: ${errorMsg}` };
    }

    // Verify output file exists
    if (!fs.existsSync(finalOutputPath)) {
      console.error(`[signIpa] Output file not created: ${finalOutputPath}`);
      return { success: false, error: `Signing completed but output file was not created. This usually means zsign is not installed or failed silently.` };
    }

    console.log(`[signIpa] Output file verified at ${finalOutputPath}`);

    // Extract metadata from the signed IPA
    const metadata = await extractIpaMetadata(finalOutputPath);

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
      if (!plistMatch) {
        console.log(`[extractIpaMetadata] No Info.plist found in IPA`);
        return {};
      }

      const plistEntry = plistMatch[0];
      console.log(`[extractIpaMetadata] Found plist at: ${plistEntry}`);

      // Extract Info.plist from the IPA
      await execFileAsync("unzip", ["-o", "-j", ipaPath, plistEntry, "-d", tmpDir], {
        maxBuffer: 2 * 1024 * 1024,
      });

      const plistPath = path.join(tmpDir, "Info.plist");
      if (!fs.existsSync(plistPath)) {
        console.log(`[extractIpaMetadata] Extracted plist not found at ${plistPath}`);
        return {};
      }

      // Read the plist file
      const buffer = fs.readFileSync(plistPath);

      // Check if it's a binary plist (starts with bplist00)
      const isBinaryPlist = buffer.slice(0, 8).toString('ascii') === 'bplist00';
      console.log(`[extractIpaMetadata] Plist is binary: ${isBinaryPlist}`);

      let parsedPlist: Record<string, unknown> = {};

      if (isBinaryPlist) {
        // Parse binary plist
        try {
          const parsed = (bplistParser as any).parseBuffer(buffer);
          parsedPlist = parsed[0] as Record<string, unknown>;
          console.log(`[extractIpaMetadata] Successfully parsed binary plist with ${Object.keys(parsedPlist).length} keys`);
          console.log(`[extractIpaMetadata] Binary plist keys:`, Object.keys(parsedPlist).slice(0, 20));
        } catch (bpErr) {
          console.error(`[extractIpaMetadata] Failed to parse binary plist:`, bpErr);
        }
      } else {
        // Parse XML plist
        try {
          const content = buffer.toString("utf8");
          parsedPlist = plistParser.parse(content);
          console.log(`[extractIpaMetadata] Successfully parsed XML plist with ${Object.keys(parsedPlist).length} keys`);
        } catch (xmlErr) {
          console.error(`[extractIpaMetadata] Failed to parse XML plist:`, xmlErr);
        }
      }

      console.log(`[extractIpaMetadata] Parsed plist keys:`, Object.keys(parsedPlist).slice(0, 20));

      // Extract values from parsed plist
      const appName = (parsedPlist.CFBundleDisplayName as string) || (parsedPlist.CFBundleName as string) || "Unknown App";
      const bundleId = (parsedPlist.CFBundleIdentifier as string) || "com.unknown.app";
      const appVersion = (parsedPlist.CFBundleShortVersionString as string) || (parsedPlist.CFBundleVersion as string) || "1.0";

      console.log(`[extractIpaMetadata] Extracted metadata:`, { appName, bundleId, appVersion });
      console.log(`[extractIpaMetadata] Full parsed plist keys:`, Object.keys(parsedPlist).slice(0, 20));

      return {
        appName,
        bundleId,
        appVersion,
      };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error("[extractIpaMetadata] Error:", err);
    return {};
  }
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
