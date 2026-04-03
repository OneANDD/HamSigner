import { useState, useRef } from "react";
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

export default function CheckCert() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [certInfo, setCertInfo] = useState<CertInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setError(null);
    setCertInfo(null);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setCertInfo(null);

    const formData = new FormData();
    formData.append("cert", file);
    if (password) formData.append("password", password);

    try {
      const apiUrl = typeof window !== "undefined" && window.location.hostname === "hamsign.vercel.app"
        ? "https://ipasigner-ghsfrzbn.manus.space/api/check-cert"
        : "/api/check-cert";
      
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to check certificate");
        return;
      }

      setCertInfo(data);
      toast.success("Certificate checked successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPassword("");
    setCertInfo(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-10">
        <div className="max-w-2xl mx-auto space-y-8">
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
              <h2 className="font-semibold text-foreground">Certificate Details</h2>
            </div>

            <form onSubmit={handleCheck} className="px-6 py-5 space-y-5">
              {/* File upload */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Certificate File</Label>
                <div
                  className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer select-none
                    ${file ? "border-success/60 bg-success/5" : "border-border hover:border-primary/60 hover:bg-accent/30"}
                  `}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files[0];
                    if (dropped) handleFileSelect(dropped);
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".p12,.pfx,.mobileprovision,application/octet-stream,application/x-pkcs12"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                  />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`shrink-0 ${file ? "text-success" : "text-muted-foreground"}`}>
                      {file ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">P12 / MobileProvision File</p>
                      {file ? (
                        <p className="text-xs text-success truncate">{file.name}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Click or drag & drop your certificate</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password (if required)
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter certificate password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Check failed</p>
                    <p className="text-xs text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={!file || loading}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Check Certificate
                    </>
                  )}
                </Button>
                {certInfo && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="border-border text-foreground hover:bg-accent"
                  >
                    Check Another
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Certificate Info */}
          {certInfo && (
            <div className="rounded-xl border border-border bg-card shadow-sm px-6 py-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Status */}
              <div className="flex items-center gap-2">
                {certInfo.isExpired ? (
                  <>
                    <XCircle className="w-5 h-5 text-destructive" />
                    <span className="font-semibold text-destructive">Certificate Expired</span>
                  </>
                ) : certInfo.daysRemaining < 30 ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-500">Expiring Soon</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="font-semibold text-success">Valid</span>
                  </>
                )}
              </div>

              {/* Certificate details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Certificate Name</p>
                  <p className="text-sm font-medium text-foreground break-words">{certInfo.name}</p>
                </div>

                {/* Issuer */}
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Issuer</p>
                  <p className="text-sm font-medium text-foreground break-words">{certInfo.issuer}</p>
                </div>

                {/* Issued Date */}
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Issued
                  </p>
                  <p className="text-sm font-medium text-foreground">{certInfo.issued}</p>
                </div>

                {/* Expiration Date */}
                <div className={`rounded-lg border p-3 ${
                  certInfo.isExpired
                    ? "bg-destructive/10 border-destructive/30"
                    : certInfo.daysRemaining < 30
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-success/10 border-success/30"
                }`}>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Expires
                  </p>
                  <p className={`text-sm font-medium ${
                    certInfo.isExpired
                      ? "text-destructive"
                      : certInfo.daysRemaining < 30
                      ? "text-yellow-500"
                      : "text-success"
                  }`}>
                    {certInfo.expires}
                  </p>
                </div>

                {/* Days Remaining */}
                <div className={`rounded-lg border p-3 ${
                  certInfo.isExpired
                    ? "bg-destructive/10 border-destructive/30"
                    : certInfo.daysRemaining < 30
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-success/10 border-success/30"
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Days Remaining</p>
                  <p className={`text-sm font-bold ${
                    certInfo.isExpired
                      ? "text-destructive"
                      : certInfo.daysRemaining < 30
                      ? "text-yellow-500"
                      : "text-success"
                  }`}>
                    {certInfo.daysRemaining} days
                  </p>
                </div>

                {/* Algorithm */}
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Algorithm</p>
                  <p className="text-sm font-medium text-foreground">{certInfo.algorithm}</p>
                </div>

                {/* Serial Number */}
                <div className="rounded-lg bg-muted/50 border border-border p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Serial Number</p>
                  <p className="text-sm font-mono text-foreground break-all">{certInfo.serialNumber}</p>
                </div>
              </div>

              {/* Warning if expiring soon */}
              {!certInfo.isExpired && certInfo.daysRemaining < 30 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-500">Certificate Expiring Soon</p>
                    <p className="text-xs text-yellow-500/80">
                      Renew your certificate before it expires to avoid signing failures.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
