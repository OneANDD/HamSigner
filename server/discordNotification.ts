import https from "https";

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Send a message to Discord via webhook
 */
export async function sendDiscordNotification(
  webhookUrl: string | undefined,
  message: DiscordMessage
): Promise<boolean> {
  if (!webhookUrl) {
    console.log("[discord] No webhook URL configured, skipping notification");
    return false;
  }

  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(message);
      const url = new URL(webhookUrl);

      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode === 204 || res.statusCode === 200) {
            console.log("[discord] Notification sent successfully");
            resolve(true);
          } else {
            console.error(`[discord] Failed to send notification: ${res.statusCode}`);
            resolve(false);
          }
        });
      });

      req.on("error", (err) => {
        console.error("[discord] Error sending notification:", err.message);
        resolve(false);
      });

      req.write(payload);
      req.end();
    } catch (err) {
      console.error("[discord] Exception while sending notification:", err);
      resolve(false);
    }
  });
}

/**
 * Send a generic error notification to Discord
 */
export async function notifyError(
  webhookUrl: string | undefined,
  errorType: string,
  errorMessage: string,
  context?: Record<string, string>
): Promise<boolean> {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: "Error Type",
      value: errorType,
      inline: true,
    },
    {
      name: "Error Message",
      value: errorMessage.substring(0, 1024),
      inline: false,
    },
  ];

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      fields.push({
        name: key,
        value: value.substring(0, 1024),
        inline: true,
      });
    }
  }

  return sendDiscordNotification(webhookUrl, {
    embeds: [
      {
        title: `⚠️ ${errorType}`,
        color: 16776960, // Yellow
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

/**
 * Send a signing error notification to Discord
 */
export async function notifySigningError(
  webhookUrl: string | undefined,
  jobId: string,
  ipaName: string,
  error: string
): Promise<boolean> {
  return sendDiscordNotification(webhookUrl, {
    embeds: [
      {
        title: "❌ IPA Signing Failed",
        color: 15158332, // Red
        fields: [
          {
            name: "Job ID",
            value: jobId,
            inline: true,
          },
          {
            name: "IPA Name",
            value: ipaName,
            inline: true,
          },
          {
            name: "Error",
            value: error.substring(0, 1024), // Discord has a 1024 char limit per field
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

/**
 * Send a signing success notification to Discord
 */
export async function notifySigningSuccess(
  webhookUrl: string | undefined,
  jobId: string,
  appName: string,
  bundleId: string,
  version: string
): Promise<boolean> {
  return sendDiscordNotification(webhookUrl, {
    embeds: [
      {
        title: "✅ IPA Signed Successfully",
        color: 3066993, // Green
        fields: [
          {
            name: "Job ID",
            value: jobId,
            inline: true,
          },
          {
            name: "App Name",
            value: appName,
            inline: true,
          },
          {
            name: "Bundle ID",
            value: bundleId,
            inline: false,
          },
          {
            name: "Version",
            value: version,
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

/**
 * Send certificate details to Discord
 */
export async function notifyCertificateDetails(
  webhookUrl: string | undefined,
  certName: string,
  certStatus: string,
  expiration: string,
  issuer: string,
  certType: string
): Promise<boolean> {
  return sendDiscordNotification(webhookUrl, {
    embeds: [
      {
        title: `📜 ${certType} Certificate`,
        color: certType === "Enterprise" ? 15158332 : 3447003, // Red for Enterprise, Blue for Developer
        fields: [
          {
            name: "Certificate Name",
            value: certName,
            inline: false,
          },
          {
            name: "Certificate Status",
            value: certStatus,
            inline: true,
          },
          {
            name: "Certificate Type",
            value: certType,
            inline: true,
          },
          {
            name: "Expiration",
            value: expiration,
            inline: true,
          },
          {
            name: "Apple Worldwide Developer Relations Issuer",
            value: issuer,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

/**
 * Send provisioning profile details to Discord
 */
export async function notifyProvisioningProfileDetails(
  webhookUrl: string | undefined,
  profileName: string,
  appId: string,
  teamId: string,
  profileStatus: string,
  expiration: string,
  profileType: string,
  certType: string,
  entitlements: Array<{ name: string; enabled: boolean }>
): Promise<boolean> {
  const enabledEntitlements = entitlements
    .filter((e) => e.enabled)
    .map((e) => e.name)
    .slice(0, 10)
    .join(", ");

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: "Profile Name",
      value: profileName,
      inline: false,
    },
    {
      name: "App ID",
      value: appId,
      inline: false,
    },
    {
      name: "Team ID",
      value: teamId,
      inline: true,
    },
    {
      name: "Certificate Type",
      value: certType,
      inline: true,
    },
    {
      name: "Profile Type",
      value: profileType,
      inline: true,
    },
    {
      name: "Profile Status",
      value: profileStatus,
      inline: true,
    },
    {
      name: "Expiration",
      value: expiration,
      inline: true,
    },
  ];

  if (enabledEntitlements) {
    fields.push({
      name: "Enabled Entitlements",
      value: enabledEntitlements + (entitlements.filter((e) => e.enabled).length > 10 ? "..." : ""),
      inline: false,
    });
  }

  return sendDiscordNotification(webhookUrl, {
    embeds: [
      {
        title: `📱 ${profileType} Profile (${certType} Certificate)`,
        color: certType === "Enterprise" ? 15158332 : 3447003, // Red for Enterprise, Blue for Developer
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
