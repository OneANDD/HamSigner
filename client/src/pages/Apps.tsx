import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";

interface App {
  id: string;
  name: string;
  description: string;
  bundleId: string;
  icon: string;
  color: string;
}

const AVAILABLE_APPS: App[] = [
  {
    id: "ksign",
    name: "KSign",
    description: "Professional iOS app signing tool with advanced certificate management",
    bundleId: "com.ksign.app",
    icon: "K",
    color: "from-blue-600 to-blue-400",
  },
  {
    id: "esign",
    name: "ESign",
    description: "Easy-to-use IPA signer for iOS developers and testers",
    bundleId: "com.esign.app",
    icon: "E",
    color: "from-purple-600 to-purple-400",
  },
  {
    id: "feather",
    name: "Feather",
    description: "Lightweight and fast iOS app signing solution",
    bundleId: "com.feather.app",
    icon: "F",
    color: "from-cyan-600 to-cyan-400",
  },
  {
    id: "gbox",
    name: "GBox",
    description: "Comprehensive app signing and certificate validation platform",
    bundleId: "com.gbox.app",
    icon: "G",
    color: "from-green-600 to-green-400",
  },
  {
    id: "scarlet",
    name: "Scarlet",
    description: "Advanced iOS app signing with real-time certificate verification",
    bundleId: "com.scarlet.app",
    icon: "S",
    color: "from-red-600 to-red-400",
  },
];

export default function Apps() {
  const [, setLocation] = useLocation();

  const handleSignApp = (app: App) => {
    // Navigate to Sign IPA page with app info pre-filled
    setLocation(`/signipa?app=${app.id}&name=${encodeURIComponent(app.name)}&bundleId=${app.bundleId}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Hero */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Available Apps</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Browse and sign popular iOS apps. Select an app below to get started with signing.
            </p>
          </div>

          {/* Apps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AVAILABLE_APPS.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col"
              >
                {/* App Icon */}
                <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center text-white font-bold text-2xl mb-4`}>
                  {app.icon}
                </div>

                {/* App Info */}
                <div className="flex-1 space-y-2 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{app.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{app.description}</p>
                  <p className="text-xs text-muted-foreground font-mono">{app.bundleId}</p>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => handleSignApp(app)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Sign App
                </Button>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="rounded-lg border border-border bg-card/30 p-6 space-y-3">
            <h3 className="font-semibold text-foreground">How to Sign an App</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Select an app from the list above</li>
              <li>Upload your IPA file, P12 certificate, and provisioning profile</li>
              <li>Enter your certificate password and configure signing options</li>
              <li>Click "Sign IPA" to start the signing process</li>
              <li>Download the signed IPA or use the ITMS link for OTA installation</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
