import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

export default function CertPass() {
  const [file, setFile] = useState<File | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setError(null);
    setSuccess(false);
    setDownloadUrl(null);
  };

  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a P12 file");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match or are empty");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append("p12", file);
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);

    try {
      const apiUrl = typeof window !== "undefined" && window.location.hostname === "hamsign.vercel.app"
        ? "https://3000-ibvzjilgclojwsp9jp48v-89566439.us2.manus.computer/api/change-cert-password"
        : "/api/change-cert-password";
      
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }

      setSuccess(true);
      setDownloadUrl(data.downloadUrl);
      toast.success("Certificate password changed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(false);
    setDownloadUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Hero */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Change Certificate Password</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Update the password for your P12 certificate files. Securely change or remove the password protection on your signing certificates.
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Password Configuration</h2>
            </div>

            <form onSubmit={handleChange} className="px-6 py-5 space-y-5">
              {/* File upload */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">P12 Certificate File</Label>
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
                    accept=".p12,.pfx,application/x-pkcs12,application/octet-stream"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                  />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`shrink-0 ${file ? "text-success" : "text-muted-foreground"}`}>
                      {file ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">P12 File</p>
                      {file ? (
                        <p className="text-xs text-success truncate">{file.name}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Click or drag & drop your P12 file</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Password */}
              <div className="space-y-1.5">
                <Label htmlFor="current" className="text-sm font-medium text-foreground">
                  Current Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="current"
                    type={showPasswords.current ? "text" : "password"}
                    placeholder="Enter current P12 password (leave blank if none)"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={loading}
                    className="pl-9 pr-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new" className="text-sm font-medium text-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new"
                    type={showPasswords.new ? "text" : "password"}
                    placeholder="Enter new password (leave blank to remove password)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="pl-9 pr-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type={showPasswords.confirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className={`pl-9 pr-9 bg-input border-border text-foreground placeholder:text-muted-foreground ${
                      confirmPassword && !passwordsMatch ? "border-destructive" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              {/* Info */}
              <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Leave the new password blank to remove password protection.</p>
                  <p>The modified P12 file will be downloaded to your device.</p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Change failed</p>
                    <p className="text-xs text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={!file || !passwordsMatch || loading}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing…
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
                {success && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="border-border text-foreground hover:bg-accent"
                  >
                    Change Another
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Success */}
          {success && downloadUrl && (
            <div className="rounded-xl border border-success/30 bg-card shadow-sm px-6 py-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Password changed successfully</span>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your P12 certificate with the new password is ready to download.
                </p>
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Modified P12
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
