import fs from "fs";
import * as forge from "node-forge";

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
    // Read P12 file as binary string
    const p12Buffer = fs.readFileSync(p12Path);
    const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer));

    // Decrypt P12
    let pkcs12: any;
    try {
      pkcs12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || "");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.toLowerCase().includes("password") || errMsg.toLowerCase().includes("decrypt")) {
        return { success: false, error: "Incorrect P12 password" };
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
    const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer));

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

    if (!keyBags || !keyBags[forge.pki.oids.keyBag] || keyBags[forge.pki.oids.keyBag].length === 0) {
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
