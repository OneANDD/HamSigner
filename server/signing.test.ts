import { describe, expect, it } from "vitest";
import { generateManifestPlist } from "./signingService";

describe("generateManifestPlist", () => {
  const opts = {
    ipaUrl: "https://cdn.example.com/signed/abc123/app.ipa",
    bundleId: "com.example.myapp",
    appVersion: "2.1.0",
    appName: "My App",
  };

  it("produces valid XML with correct structure", () => {
    const xml = generateManifestPlist(opts);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<plist");
    expect(xml).toContain("<key>items</key>");
    expect(xml).toContain("<key>assets</key>");
    expect(xml).toContain("<key>metadata</key>");
  });

  it("includes the IPA URL as software-package asset", () => {
    const xml = generateManifestPlist(opts);
    expect(xml).toContain("<string>software-package</string>");
    expect(xml).toContain(`<string>${opts.ipaUrl}</string>`);
  });

  it("includes correct bundle identifier", () => {
    const xml = generateManifestPlist(opts);
    expect(xml).toContain("<key>bundle-identifier</key>");
    expect(xml).toContain(`<string>${opts.bundleId}</string>`);
  });

  it("includes correct bundle version", () => {
    const xml = generateManifestPlist(opts);
    expect(xml).toContain("<key>bundle-version</key>");
    expect(xml).toContain(`<string>${opts.appVersion}</string>`);
  });

  it("includes app title", () => {
    const xml = generateManifestPlist(opts);
    expect(xml).toContain("<key>title</key>");
    expect(xml).toContain(`<string>${opts.appName}</string>`);
  });

  it("includes kind=software in metadata", () => {
    const xml = generateManifestPlist(opts);
    expect(xml).toContain("<string>software</string>");
  });

  it("escapes XML special characters in app name", () => {
    const xml = generateManifestPlist({ ...opts, appName: "App & <Test>" });
    expect(xml).toContain("App &amp; &lt;Test&gt;");
    expect(xml).not.toContain("App & <Test>");
  });

  it("escapes XML special characters in IPA URL", () => {
    const xml = generateManifestPlist({ ...opts, ipaUrl: "https://cdn.example.com/app?a=1&b=2" });
    expect(xml).toContain("https://cdn.example.com/app?a=1&amp;b=2");
  });
});

describe("ITMS URL format", () => {
  it("produces correct itms-services:// URL format", () => {
    const manifestUrl = "https://cdn.example.com/signed/abc/manifest.plist";
    const itmsUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
    expect(itmsUrl).toMatch(/^itms-services:\/\/\?action=download-manifest&url=/);
    expect(itmsUrl).toContain(encodeURIComponent(manifestUrl));
    expect(decodeURIComponent(itmsUrl.split("url=")[1])).toBe(manifestUrl);
  });
});
