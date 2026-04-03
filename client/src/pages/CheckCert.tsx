import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface CertInfo {
  name: string;
  issued: string;
  expires: string;
  daysRemaining: number;
  isExpired: boolean;
  issuer: string;
  serialNumber: string;
  algorithm: string;
}

interface ProvisioningProfileInfo {
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

interface CheckResult {
  certificate?: CertInfo;
  profile?: ProvisioningProfileInfo;
}

export default function CheckCert() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (f: File) => {
    // Validate file type
    const isP12 = f.name.endsWith(".p12");
    const isMobileProvision = f.name.endsWith(".mobileprovision");

    if (!isP12 && !isMobileProvision) {
      setError("Please select a valid P12 certificate (.p12) or provisioning profile (.mobileprovision)");
      return;
    }

    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file (P12 certificate or provisioning profile)");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    
    // Determine file type and append with correct key
    if (file.name.endsWith(".mobileprovision")) {
      formData.append("mobileprovision", file);
    } else if (file.name.endsWith(".p12")) {
      formData.append("cert", file);
      if (password) formData.append("password", password);
    }

    try {
      const apiUrl = typeof window !== "undefined" && window.location.hostname === "hamsign.vercel.app"
        ? "https://3000-ibvzjilgclojwsp9jp48v-89566439.us2.manus.computer/api/check-cert-and-profile"
        : "/api/check-cert-and-profile";
      
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to check certificate");
        return;
      }

      setResult(data);
      toast.success("Certificate and profile checked successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPassword("");
    setResult(null);
    setError(null);
  };

  const getFileDisplay = () => {
    if (!file) return "Click to select or drag & drop";
    const isP12 = file.name.endsWith(".p12");
    return `${isP12 ? "📄 P12 Certificate" : "📱 Provisioning Profile"}: ${file.name}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Check Certificate Validity</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Verify your P12 certificates and provisioning profiles. Check expiration dates, OCSP revocation status, and certificate chain validity.
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Upload File</h2>
            </div>

            <form onSubmit={handleCheck} className="px-6 py-5 space-y-5">
              {/* Unified File Upload */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Certificate or Provisioning Profile</Label>
                <div
                  className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer select-none
                    ${isDragging ? "border-primary/80 bg-primary/10" : ""}
                    ${file ? "border-success/60 bg-success/5" : "border-border hover:border-primary/60 hover:bg-accent/30"}
                  `}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".p12,.mobileprovision"
                    className="hidden"
                    disabled={loading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="text-muted-foreground"><Upload className="w-5 h-5" /></div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{getFileDisplay()}</div>
                      {!file && <div className="text-xs text-muted-foreground">Supports .p12 or .mobileprovision files</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Password - only show if P12 is selected */}
              {file && file.name.endsWith(".p12") && (
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">P12 Password (Optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter P12 password if required"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="bg-input text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">Only needed if your P12 file is password-protected</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={!file || loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Check Certificate
                    </>
                  )}
                </Button>
                {file && (
                  <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Certificate Info */}
              {result.certificate && (
                <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">💼 Certificate</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">💼 Certificate name:</span>
                      <span className="font-medium text-foreground">{result.certificate.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">💼 Certificate status:</span>
                      <span className="font-medium flex items-center gap-1">
                        {result.certificate.isExpired ? (
                          <>
                            <XCircle className="w-4 h-4 text-destructive" />
                            <span className="text-destructive">Expired 🔴</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span className="text-success">Signed 🟢</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">💼 Expiration:</span>
                      <span className="font-medium text-foreground">{result.certificate.expires}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">💼 Issuer:</span>
                      <span className="font-medium text-foreground">{result.certificate.issuer}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Provisioning Profile Info */}
              {result.profile && (
                <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">📱 Provisioning Profile</h3>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📱 Profile name:</span>
                      <span className="font-medium text-foreground">{result.profile.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📱 App ID:</span>
                      <span className="font-medium text-foreground">{result.profile.appId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📱 Team ID:</span>
                      <span className="font-medium text-foreground">{result.profile.teamId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📱 Profile status:</span>
                      <span className="font-medium flex items-center gap-1">
                        {result.profile.isExpired ? (
                          <>
                            <XCircle className="w-4 h-4 text-destructive" />
                            <span className="text-destructive">Expired 🔴</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span className="text-success">Active 🟢</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📱 Expiration:</span>
                      <span className="font-medium text-foreground">{result.profile.expires}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📱 Type:</span>
                      <span className="font-medium text-foreground">{result.profile.type}</span>
                    </div>
                  </div>

                  {/* Entitlements */}
                  {result.profile.entitlements.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <h4 className="font-medium text-foreground">📋 Entitlements</h4>
                      <div className="space-y-1">
                        {result.profile.entitlements.map((ent, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="text-lg">{ent.enabled ? "🟢" : "🔴"}</span>
                            <span className="text-muted-foreground">{ent.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
