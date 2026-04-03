import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileKey,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Shield,
  Loader2,
  Clock,
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
  const [certFile, setCertFile] = useState<File | null>(null);
  const [provFile, setProvFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const provInputRef = useRef<HTMLInputElement>(null);

  const handleCertFileSelect = (f: File) => {
    setCertFile(f);
    setError(null);
    setResult(null);
  };

  const handleProvFileSelect = (f: File) => {
    setProvFile(f);
    setError(null);
    setResult(null);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile || !provFile) {
      setError("Both P12 certificate and provisioning profile are required");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("cert", certFile);
    formData.append("mobileprovision", provFile);
    if (password) formData.append("password", password);

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
    setCertFile(null);
    setProvFile(null);
    setPassword("");
    setResult(null);
    setError(null);
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
              <h2 className="font-semibold text-foreground">Upload Files</h2>
            </div>

            <form onSubmit={handleCheck} className="px-6 py-5 space-y-5">
              {/* P12 Certificate */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">P12 Certificate</Label>
                <div
                  className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer select-none
                    ${certFile ? "border-success/60 bg-success/5" : "border-border hover:border-primary/60 hover:bg-accent/30"}
                  `}
                  onClick={() => certInputRef.current?.click()}
                >
                  <input
                    ref={certInputRef}
                    type="file"
                    accept=".p12,.pfx"
                    className="hidden"
                    disabled={loading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCertFileSelect(f);
                    }}
                  />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="text-muted-foreground"><FileKey className="w-5 h-5" /></div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{certFile?.name || "Click to select P12 file"}</div>
                      {!certFile && <div className="text-xs text-muted-foreground">Drag & drop or click to select</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Provisioning Profile */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Provisioning Profile</Label>
                <div
                  className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer select-none
                    ${provFile ? "border-success/60 bg-success/5" : "border-border hover:border-primary/60 hover:bg-accent/30"}
                  `}
                  onClick={() => provInputRef.current?.click()}
                >
                  <input
                    ref={provInputRef}
                    type="file"
                    accept=".mobileprovision"
                    className="hidden"
                    disabled={loading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleProvFileSelect(f);
                    }}
                  />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="text-muted-foreground"><Upload className="w-5 h-5" /></div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{provFile?.name || "Click to select provisioning profile"}</div>
                      {!provFile && <div className="text-xs text-muted-foreground">Drag & drop or click to select</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Password - only show if needed */}
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
                  disabled={!certFile || !provFile || loading}
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
                {(certFile || provFile || password) && (
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
                    <h3 className="font-semibold text-foreground">💼 Certificate 1</h3>
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

              {/* Provisioning Profile */}
              {result.profile && (
                <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">📋 Provisioning Profile</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📋 Provision Name:</span>
                      <span className="font-medium text-foreground">{result.profile.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📋 App ID:</span>
                      <span className="font-medium text-foreground">{result.profile.appId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📋 Enterprise:</span>
                      <span className="font-medium text-foreground">{result.profile.type} 🔴</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📋 Status:</span>
                      <span className="font-medium flex items-center gap-1">
                        {result.profile.isExpired ? (
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
                      <span className="text-muted-foreground">📋 Expiration:</span>
                      <span className="font-medium text-foreground">{result.profile.expires}</span>
                    </div>
                  </div>

                  {/* Entitlements */}
                  {result.profile.entitlements && result.profile.entitlements.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-medium text-foreground mb-3">📋 Entitlements ↓</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {result.profile.entitlements.map((ent, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={ent.enabled ? "text-success" : "text-destructive"}>
                              {ent.enabled ? "🟢" : "🔴"}
                            </span>
                            <span className="text-foreground">{ent.name}</span>
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
