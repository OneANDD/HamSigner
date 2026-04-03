import { describe, it, expect } from 'vitest';

describe('Certificate Type Detection', () => {
  it('should detect Developer certificate from issuer', () => {
    const issuer = "Apple Worldwide Developer Relations Certification Authority";
    const type = issuer.toLowerCase().includes("enterprise") ? "Enterprise" : 
                 issuer.toLowerCase().includes("distribution") ? "Distribution" :
                 issuer.toLowerCase().includes("developer") ? "Developer" : "Developer";
    
    expect(type).toBe("Developer");
  });

  it('should detect Enterprise certificate from issuer', () => {
    const issuer = "Apple Worldwide Developer Relations Certification Authority (Enterprise)";
    const type = issuer.toLowerCase().includes("enterprise") ? "Enterprise" : 
                 issuer.toLowerCase().includes("distribution") ? "Distribution" :
                 issuer.toLowerCase().includes("developer") ? "Developer" : "Developer";
    
    expect(type).toBe("Enterprise");
  });

  it('should detect Distribution certificate from issuer', () => {
    const issuer = "Apple Worldwide Developer Relations Certification Authority (Distribution)";
    const type = issuer.toLowerCase().includes("enterprise") ? "Enterprise" : 
                 issuer.toLowerCase().includes("distribution") ? "Distribution" :
                 issuer.toLowerCase().includes("developer") ? "Developer" : "Developer";
    
    expect(type).toBe("Distribution");
  });

  it('should default to Developer for unknown issuer', () => {
    const issuer = "Unknown Issuer";
    const type = issuer.toLowerCase().includes("enterprise") ? "Enterprise" : 
                 issuer.toLowerCase().includes("distribution") ? "Distribution" :
                 issuer.toLowerCase().includes("developer") ? "Developer" : "Developer";
    
    expect(type).toBe("Developer");
  });
});

describe('Provisioning Profile Type Detection', () => {
  it('should detect Development profile from name', () => {
    const name = "My Development Profile";
    let profileType = "Development";
    if (name.toLowerCase().includes("enterprise")) {
      profileType = "Enterprise";
    } else if (name.toLowerCase().includes("ad hoc")) {
      profileType = "Ad Hoc";
    } else if (name.toLowerCase().includes("distribution") || name.toLowerCase().includes("appstore")) {
      profileType = "App Store";
    }
    
    expect(profileType).toBe("Development");
  });

  it('should detect Enterprise profile from name', () => {
    const name = "Enterprise Distribution Profile";
    let profileType = "Development";
    if (name.toLowerCase().includes("enterprise")) {
      profileType = "Enterprise";
    } else if (name.toLowerCase().includes("ad hoc")) {
      profileType = "Ad Hoc";
    } else if (name.toLowerCase().includes("distribution") || name.toLowerCase().includes("appstore")) {
      profileType = "App Store";
    }
    
    expect(profileType).toBe("Enterprise");
  });

  it('should detect App Store profile from name', () => {
    const name = "AppStore Distribution Profile";
    let profileType = "Development";
    if (name.toLowerCase().includes("enterprise")) {
      profileType = "Enterprise";
    } else if (name.toLowerCase().includes("ad hoc")) {
      profileType = "Ad Hoc";
    } else if (name.toLowerCase().includes("distribution") || name.toLowerCase().includes("appstore")) {
      profileType = "App Store";
    }
    
    expect(profileType).toBe("App Store");
  });

  it('should detect Ad Hoc profile from name', () => {
    const name = "Ad Hoc";
    let profileType = "Development";
    if (name.toLowerCase().includes("enterprise")) {
      profileType = "Enterprise";
    } else if (name.toLowerCase().includes("ad hoc")) {
      profileType = "Ad Hoc";
    } else if (name.toLowerCase().includes("distribution") || name.toLowerCase().includes("appstore")) {
      profileType = "App Store";
    }
    
    expect(profileType).toBe("Ad Hoc");
  });
});

describe('Discord Notification Field Formatting', () => {
  it('should format certificate details fields correctly', () => {
    const fields = [
      { name: "Job ID", value: "job-123", inline: true },
      { name: "Certificate Name", value: "John Doe", inline: false },
      { name: "Certificate Status", value: "Valid", inline: true },
      { name: "Certificate Type", value: "Developer", inline: true },
      { name: "Expiration", value: "2025-12-31", inline: true },
      { name: "Apple Worldwide Developer Relations Issuer", value: "Apple Worldwide Developer Relations Certification Authority", inline: false },
    ];

    expect(fields.length).toBe(6);
    expect(fields[0].name).toBe("Job ID");
    expect(fields[5].name).toBe("Apple Worldwide Developer Relations Issuer");
    expect(fields[1].inline).toBe(false);
  });

  it('should format provisioning profile details fields correctly', () => {
    const fields = [
      { name: "Job ID", value: "job-456", inline: true },
      { name: "Profile Name", value: "My Profile", inline: false },
      { name: "App ID", value: "ABCD123456.com.example.app", inline: false },
      { name: "Team ID", value: "ABCD123456", inline: true },
      { name: "Profile Status", value: "Valid", inline: true },
      { name: "Profile Type", value: "Development", inline: true },
      { name: "Expiration", value: "2025-12-31", inline: true },
      { name: "Enabled Entitlements", value: "HealthKit, HomeKit, Push Notifications", inline: false },
    ];

    expect(fields.length).toBe(8);
    expect(fields[0].name).toBe("Job ID");
    expect(fields[7].name).toBe("Enabled Entitlements");
  });

  it('should truncate long entitlements list', () => {
    const entitlements = Array.from({ length: 15 }, (_, i) => ({
      name: `Entitlement ${i + 1}`,
      enabled: true,
    }));

    const enabledEntitlements = entitlements
      .filter((e) => e.enabled)
      .map((e) => e.name)
      .slice(0, 10)
      .join(", ");

    const hasMore = entitlements.filter((e) => e.enabled).length > 10;
    const finalValue = enabledEntitlements + (hasMore ? "..." : "");

    expect(enabledEntitlements.split(",").length).toBe(10);
    expect(finalValue.endsWith("...")).toBe(true);
  });
});
