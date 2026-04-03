import fs from "fs";
import forge from "node-forge";

export interface CertInfo {
  name: string;
  issued: string;
  expires: string;
  daysRemaining: number;
  isExpired: boolean;
  issuer: string;
  serialNumber: string;
  algorithm: string;
  type: string; // 'Developer' or 'Enterprise'
}

/**
 * Uses node-forge to extract certificate information from a P12 file.
 * No external dependencies required.
 */
export async function checkCertificate(
  p12Path: string,
  password?: string
): Promise<{ success: boolean; error?: string; cert?: CertInfo }> {
  if (!fs.existsSync(p12Path)) {
    return { success: false, error: "P12 file not found" };
  }

  try {
    // Read P12 file and convert to binary string for forge
    const p12Buffer = fs.readFileSync(p12Path);
    console.log(`[checkCertificate] Read P12 file, size: ${p12Buffer.length} bytes`);
    const p12BinaryString = p12Buffer.toString('binary');
    console.log(`[checkCertificate] Converted to binary string, length: ${p12BinaryString.length}`);
    console.log(`[checkCertificate] forge type: ${typeof forge}`);
    console.log(`[checkCertificate] forge.asn1 available: ${!!forge.asn1}`);
    console.log(`[checkCertificate] forge.asn1.fromDer available: ${typeof forge.asn1.fromDer}`);
    
    if (!forge || !forge.asn1 || typeof forge.asn1.fromDer !== 'function') {
      console.log(`[checkCertificate] forge:`, forge);
      console.log(`[checkCertificate] forge.asn1:`, forge?.asn1);
      return { success: false, error: "node-forge library not properly initialized" };
    }
    
    const p12Asn1 = forge.asn1.fromDer(p12BinaryString);
    console.log(`[checkCertificate] Successfully parsed ASN1`);

    // Decrypt P12 - try empty password first, then user password
    let pkcs12: any;
    const passwordsToTry = [""];
    if (password) {
      passwordsToTry.push(password);
    }
    
    let lastError: string | null = null;
    for (const pwd of passwordsToTry) {
      try {
        pkcs12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pwd);
        break; // Success, exit loop
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        lastError = errMsg;
        // Continue to next password attempt
      }
    }
    
    if (!pkcs12) {
      if (lastError?.toLowerCase().includes("password") || lastError?.toLowerCase().includes("decrypt")) {
        return { success: false, error: password ? "Incorrect P12 password" : "P12 file is password-protected. Please enter the password." };
      }
      return { success: false, error: "Failed to read P12 file" };
    }

    // Extract certificates
    const certs = pkcs12.getBags({ bagType: forge.pki.oids.certBag });
    if (!certs || !certs[forge.pki.oids.certBag] || certs[forge.pki.oids.certBag].length === 0) {
      return { success: false, error: "No certificate found in P12 file" };
    }

    // Get the first certificate (usually the signing certificate)
    const certBag = certs[forge.pki.oids.certBag][0];
    const cert = certBag.cert;

    if (!cert) {
      return { success: false, error: "Failed to extract certificate" };
    }

    // Extract certificate information
    const now = new Date();
    const expiryDate = new Date(cert.validity.notAfter);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Extract subject CN
    let name = "Unknown";
    if (cert.subject && cert.subject.attributes) {
      const cnAttr = (cert.subject.attributes as any[]).find((attr: any) => attr.name === "commonName");
      if (cnAttr) {
        name = cnAttr.value;
      }
    }

    // Extract issuer
    let issuer = "Unknown";
    if (cert.issuer && cert.issuer.attributes) {
      const cnAttr = (cert.issuer.attributes as any[]).find((attr: any) => attr.name === "commonName");
      if (cnAttr) {
        issuer = cnAttr.value;
      }
    }

    // Determine certificate type (Developer vs Enterprise)
    let type = "Developer";
    if (issuer.toLowerCase().includes("enterprise")) {
      type = "Enterprise";
    } else if (issuer.toLowerCase().includes("distribution")) {
      type = "Distribution";
    } else if (issuer.toLowerCase().includes("developer")) {
      type = "Developer";
    }

    // Extract serial number
    const serialNumber = cert.serialNumber ? cert.serialNumber.toString(16).toUpperCase() : "Unknown";

    // Extract signature algorithm
    let algorithm = "Unknown";
    if ((cert as any).signatureOid) {
      const oidName = (forge.pki.oids as any)[(cert as any).signatureOid];
      algorithm = oidName || (cert as any).signatureOid;
    }

    const certInfo: CertInfo = {
      name,
      issued: cert.validity.notBefore.toISOString(),
      expires: expiryDate.toISOString(),
      daysRemaining,
      isExpired: now > expiryDate,
      issuer,
      serialNumber,
      algorithm,
      type,
    };

    return { success: true, cert: certInfo };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to check certificate: ${errMsg}` };
  }
}

/**
 * Changes the password of a P12 certificate file using node-forge.
 * Returns a new P12 file with the updated password.
 */
export async function changeCertificatePassword(
  p12Path: string,
  oldPassword: string,
  newPassword: string,
  outputPath: string
): Promise<{ success: boolean; error?: string }> {
  if (!fs.existsSync(p12Path)) {
    return { success: false, error: "P12 file not found" };
  }

  try {
    // Read and decrypt the original P12
    const p12Buffer = fs.readFileSync(p12Path);
    console.log(`[changeCertificatePassword] Read P12 file, size: ${p12Buffer.length} bytes`);
    const p12BinaryString = p12Buffer.toString('binary');
    console.log(`[changeCertificatePassword] forge.asn1.fromDer available: ${typeof forge.asn1.fromDer}`);
    const p12Asn1 = forge.asn1.fromDer(p12BinaryString);
    console.log(`[changeCertificatePassword] Successfully parsed ASN1`);

    let pkcs12: any;
    try {
      pkcs12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, oldPassword);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.toLowerCase().includes("password") || errMsg.toLowerCase().includes("decrypt")) {
        return { success: false, error: "Incorrect old password" };
      }
      return { success: false, error: "Failed to read P12 file" };
    }

    // Extract private key and certificates
    const keyBags = pkcs12.getBags({ bagType: forge.pki.oids.keyBag });
    const certBags = pkcs12.getBags({ bagType: forge.pki.oids.certBag });
    
    console.log(`[changeCertificatePassword] keyBag OID:`, forge.pki.oids.keyBag);
    console.log(`[changeCertificatePassword] keyBags:`, keyBags);
    console.log(`[changeCertificatePassword] keyBags[keyBag]:`, keyBags ? keyBags[forge.pki.oids.keyBag] : 'undefined');
    console.log(`[changeCertificatePassword] certBags:`, certBags);

    if (!keyBags || !keyBags[forge.pki.oids.keyBag] || keyBags[forge.pki.oids.keyBag].length === 0) {
      console.log(`[changeCertificatePassword] No private key found - returning error`);
      // Try to get all bags to understand structure
      const allBags = pkcs12.getBags({});
      console.log(`[changeCertificatePassword] All bags:`, allBags);
      return { success: false, error: "No private key found in P12 file" };
    }

    const privateKey = (keyBags[forge.pki.oids.keyBag][0] as any).key;
    const certificates = certBags ? (certBags[forge.pki.oids.certBag] || []).map((b: any) => b.cert) : [];

    // Re-encrypt with new password
    const newP12Asn1 = forge.pkcs12.toPkcs12Asn1(
      privateKey,
      certificates,
      newPassword,
      { algorithm: "3des" }
    );

    // Convert to DER and write
    const newP12Der = forge.asn1.toDer(newP12Asn1).getBytes();
    fs.writeFileSync(outputPath, Buffer.from(newP12Der, "binary"));

    return { success: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to change password: ${errMsg}` };
  }
}


// Entitlements mapping with display names
const ENTITLEMENTS_MAP: Record<string, string> = {
  'com.apple.security.application-groups': 'App Groups',
  'com.apple.developer.networking.wifi-info': 'Access Wi-Fi Information',
  'com.apple.developer.accessibility.api': 'Accessibility Merchant API Control',
  'com.apple.developer.device-check.app-attest': 'App Attest',
  'com.apple.developer.in-app-payments': 'Apple Pay Payment Processing',
  'com.apple.developer.associated-domains': 'Associated Domains',
  'com.apple.developer.autofill-credential-provider': 'AutoFill Credential Provider',
  'com.apple.developer.classkit': 'ClassKit',
  'com.apple.developer.usernotifications.communication': 'Communication Notifications',
  'com.apple.developer.networking.custom-protocol': 'Custom Network Protocol',
  'com.apple.developer.usernotifications.critical': 'Critical Messaging',
  'com.apple.developer.dataprotection.filesystem': 'Data Protection',
  'com.apple.developer.default-calling-app': 'Default Calling App',
  'com.apple.developer.default-messaging-app': 'Default Messaging App',
  'com.apple.developer.driverkit.allow-third-party-userclient': 'DriverKit Allow Third Party UserClients',
  'com.apple.developer.kernel.extended-virtual-addressing': 'Extended Virtual Addressing',
  'com.apple.developer.fileprovider.testing-mode': 'FileProvider Testing Mode',
  'com.apple.developer.fonts': 'Fonts',
  'com.apple.developer.game-center': 'Game Center',
  'com.apple.developer.group-session': 'Group Activities',
  'com.apple.developer.arkit.head-pose': 'Head Pose',
  'com.apple.developer.healthkit': 'HealthKit',
  'com.apple.developer.healthkit.estimate-recalibration': 'HealthKit Estimate Recalibration',
  'com.apple.developer.hls-interstitial-previews': 'HLS Interstitial Previews',
  'com.apple.developer.homekit': 'HomeKit',
  'com.apple.developer.networking.hotspot': 'Hotspot',
  'com.apple.developer.icloud-container-environment': 'iCloud',
  'com.apple.developer.id-verifier.display-only': 'ID Verifier - Display Only',
  'com.apple.developer.in-app-purchase': 'In-App Purchase',
  'com.apple.developer.memory-limit.increased-debug': 'Increased Debugging Memory Limit',
  'com.apple.developer.memory-limit.increased': 'Increased Memory Limit',
  'com.apple.developer.inter-app-audio': 'Inter-App Audio',
  'com.apple.developer.journaling-suggestions': 'Journaling Suggestions',
  'com.apple.developer.hls.low-latency': 'Low Latency HLS',
  'com.apple.developer.matter.allow-setup-payload': 'Matter Allow Setup Payload',
  'com.apple.developer.networking.multipath': 'Multipath',
  'com.apple.developer.networking.networkextension': 'Network Extensions',
  'com.apple.developer.nfc.readersession.formats': 'NFC Tag Reading',
  'com.apple.developer.on-demand-install-capable': 'On Demand Install Capable for App Clip Extensions',
  'com.apple.developer.networking.vpn': 'Personal VPN',
  'com.apple.developer.usernotifications.time-sensitive': 'Time Sensitive Notifications',
  'com.apple.developer.push-to-talk': 'Push to Talk',
  'com.apple.developer.sensitive-content-analysis': 'Sensitive Content Analysis',
  'com.apple.developer.arkit.shallow-depth-pressure': 'Shallow Depth and Pressure',
  'com.apple.developer.shared-with-you': 'Shared with You',
  'com.apple.developer.sign-in-with-apple': 'Sign In with Apple',
  'com.apple.developer.sim-inserted-for-wireless-carriers': 'SIM Inserted for Wireless Carriers',
  'com.apple.developer.siri': 'Siri',
  'com.apple.developer.spatial-audio-profile': 'Spatial Audio Profile',
  'com.apple.developer.sustained-execution': 'Sustained Execution',
  'com.apple.developer.system-extension': 'System Extension',
  'com.apple.developer.user-management': 'User Management',
  'com.apple.developer.vmnet': 'VMNet',
  'com.apple.developer.weatherkit': 'WeatherKit',
  'com.apple.developer.wireless-accessory-configuration': 'Wireless Accessory Configuration',
};

export interface ProvisioningProfileInfo {
  name: string;
  appId: string;
  teamId: string;
  status: string;
  expires: string;
  daysRemaining: number;
  isExpired: boolean;
  entitlements: Array<{ name: string; enabled: boolean }>;
  type: string;
}

/**
 * Parse provisioning profile (.mobileprovision) file
 */
export async function parseProvisioningProfile(
  provPath: string
): Promise<{ success: boolean; error?: string; profile?: ProvisioningProfileInfo }> {
  if (!fs.existsSync(provPath)) {
    return { success: false, error: "Provisioning profile not found" };
  }

  try {
    const provBuffer = fs.readFileSync(provPath);
    const provString = provBuffer.toString('utf-8');
    
    // Extract plist content between XML tags
    const plistMatch = provString.match(/<\?xml[\s\S]*?<\/plist>/);
    if (!plistMatch) {
      return { success: false, error: "Invalid provisioning profile format" };
    }

    const plistXml = plistMatch[0];
    
    // Parse plist manually (simple XML parsing)
    const nameMatch = plistXml.match(/<key>Name<\/key>\s*<string>([^<]+)<\/string>/);
    const appIdMatch = plistXml.match(/<key>Entitlements<\/key>\s*<dict>([\s\S]*?)<\/dict>/);
    const expirationMatch = plistXml.match(/<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/);
    const bundleIdMatch = plistXml.match(/<key>application-identifier<\/key>\s*<string>([^<]+)<\/string>/);
    const teamIdMatch = plistXml.match(/<key>com\.apple\.developer\.team-identifier<\/key>\s*<string>([^<]+)<\/string>/);
    const provisionsAllDevicesMatch = plistXml.match(/<key>ProvisionedDevices<\/key>/);
    
    const name = nameMatch ? nameMatch[1] : "Unknown";
    const appId = bundleIdMatch ? bundleIdMatch[1] : "Unknown";
    const teamId = teamIdMatch ? teamIdMatch[1] : (appId.split('.')[0] || "Unknown");
    const expirationStr = expirationMatch ? expirationMatch[1] : new Date().toISOString();
    
    const expirationDate = new Date(expirationStr);
    const now = new Date();
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining < 0;
    
    // Determine profile type (check ad hoc before distribution to avoid false positives)
    let profileType = "Development";
    if (name.toLowerCase().includes("enterprise")) {
      profileType = "Enterprise";
    } else if (name.toLowerCase().includes("ad hoc")) {
      profileType = "Ad Hoc";
    } else if (name.toLowerCase().includes("distribution") || name.toLowerCase().includes("appstore")) {
      profileType = "App Store";
    } else if (!provisionsAllDevicesMatch) {
      profileType = "Development";
    }

    // Extract entitlements
    const entitlements: Array<{ name: string; enabled: boolean }> = [];
    const entitlementRegex = /<key>([^<]+)<\/key>\s*<(true|false)\/>/g;
    let entitlementMatch;
    
    while ((entitlementMatch = entitlementRegex.exec(plistXml)) !== null) {
      const key = entitlementMatch[1];
      const enabled = entitlementMatch[2] === 'true';
      const displayName = ENTITLEMENTS_MAP[key] || key;
      entitlements.push({ name: displayName, enabled });
    }

    return {
      success: true,
      profile: {
        name,
        appId,
        teamId,
        status: isExpired ? "Expired" : "Valid",
        expires: expirationDate.toISOString().split('T')[0],
        daysRemaining,
        isExpired,
        entitlements,
        type: profileType,
      },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Failed to parse provisioning profile: ${errMsg}` };
  }
}
