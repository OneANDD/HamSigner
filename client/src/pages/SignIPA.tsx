import { useRef, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileKey,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Download,
  Smartphone,
  ChevronRight,
  Loader2,
  Lock,
  FileCode2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// ---- Types ----
type Stage = "idle" | "uploading" | "signing" | "done" | "error";

interface SignResult {
  jobId: string;
  signedIpaUrl: string;
  manifestUrl: string;
  itmsUrl: string;
  appName: string;
  bundleId: string;
  appVersion: string;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

// S3 IPA URLs for pre-configured apps
const APP_IPA_URLS: Record<string, string> = {
  ksign: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663509354432/GHSFrzbn2jY59GbmfA8ZAd/ksign_16d3548a.ipa',
  esign: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663509354432/GHSFrzbn2jY59GbmfA8ZAd/esign_638a4ba5.ipa',
  feather: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663509354432/GHSFrzbn2jY59GbmfA8ZAd/feather_bd0e8b29.ipa',
  scarlet: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663509354432/GHSFrzbn2jY59GbmfA8ZAd/scarlet_ad02e03f.ipa',
};

// ---- FileDropZone ----
interface FileDropZoneProps {
  label: string;
  accept: string;
  icon: React.ReactNode;
  file: File | null;
  onFile: (f: File) => void;
  disabled?: boolean;
  hint?: string;
  maxSize?: number;
}

function FileDropZone({ label, accept, icon, file, onFile, disabled, hint, maxSize }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sizeWarning, setSizeWarning] = useState(false);

  const handleFile = (f: File) => {
    if (maxSize && f.size > maxSize) {
      setSizeWarning(true);
      setTimeout(() => setSizeWarning(false), 5000);
      return;
    }
    setSizeWarning(false);
    onFile(f);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [disabled]
  );

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer select-none
          ${dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-accent/30"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${file ? "border-success/60 bg-success/5" : ""}
        `}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          disabled={disabled}
        />
        <div className="px-6 py-8 text-center">
          <div className="flex justify-center mb-3 text-muted-foreground">
            {file ? <CheckCircle2 className="w-8 h-8 text-success" /> : icon}
          </div>
          <p className="font-medium text-foreground text-sm">{file ? file.name : label}</p>
          {!file && hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          {sizeWarning && <p className="text-xs text-destructive mt-2">File too large (max {maxSize ? (maxSize / 1024 / 1024).toFixed(0) : '?'} MB)</p>}
        </div>
      </div>
    </div>
  );
}

// ---- CopyButton ----
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded hover:bg-muted transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}

// ---- ResultView ----
function ResultView({ result }: { result: SignResult }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg border border-success/40 bg-success/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Signing Complete
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">App Name</span>
          <span className="font-medium font-mono text-foreground">{result.appName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Bundle ID</span>
          <span className="font-medium font-mono text-foreground">{result.bundleId}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Version</span>
          <span className="font-medium font-mono text-foreground">{result.appVersion}</span>
        </div>
      </div>

      {/* Download signed IPA */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Download className="w-4 h-4 text-primary" />
          Download Signed IPA
        </div>
        <div className="flex items-center gap-2 bg-muted rounded px-3 py-2">
          <span className="flex-1 text-xs font-mono text-muted-foreground truncate">{result.signedIpaUrl}</span>
          <CopyButton text={result.signedIpaUrl} />
        </div>
        <a
          href={result.signedIpaUrl}
          download
          className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" /> Install Signed IPA to iPhone/iPad
        </a>
      </div>

      {/* ITMS Install Link */}
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Smartphone className="w-4 h-4 text-primary" />
          OTA Installation Link (ITMS)
        </div>
        <p className="text-xs text-muted-foreground">
          Open this link on your iOS device to install the app over-the-air.
        </p>
        <div className="flex items-center gap-2 bg-muted rounded px-3 py-2">
          <span className="flex-1 text-xs font-mono text-foreground break-all">{result.itmsUrl}</span>
          <CopyButton text={result.itmsUrl} />
        </div>
        <a
          href={result.itmsUrl}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" /> Install on Device
        </a>
      </div>

      {/* Manifest URL */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileCode2 className="w-4 h-4 text-muted-foreground" />
          Manifest Plist URL
        </div>
        <div className="flex items-center gap-2 bg-muted rounded px-3 py-2">
          <span className="flex-1 text-xs font-mono text-muted-foreground truncate">{result.manifestUrl}</span>
          <CopyButton text={result.manifestUrl} />
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function SignIPA() {
  const [location] = useLocation();
  const [ipaFile, setIpaFile] = useState<File | null>(null);
  const [ipaUrl, setIpaUrl] = useState("");
  const [p12File, setP12File] = useState<File | null>(null);
  const [provFile, setProvFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [bundleIdOverride, setBundleIdOverride] = useState("");
  const [appNameOverride, setAppNameOverride] = useState("");
  const [entitlements, setEntitlements] = useState("");
  const [codeSigningIdentity, setCodeSigningIdentity] = useState("auto");
  const [outputFileName, setOutputFileName] = useState("");
  const [signingAlgorithm, setSigningAlgorithm] = useState("sha256");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<SignResult | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  useEffect(() => {
    if (location.includes("?")) {
      const params = new URLSearchParams(location.split("?")[1]);
      const appName = params.get("name");
      const bundleId = params.get("bundleId");
      if (appName) setAppNameOverride(appName);
      if (bundleId) setBundleIdOverride(bundleId);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!p12File || !provFile || !password) {
      toast.error("P12 certificate, provisioning profile, and password are required");
      return;
    }

    if (!ipaFile && !ipaUrl && !selectedApp) {
      toast.error("Please select an IPA file, paste an IPA URL, or select a pre-configured app");
      return;
    }

    setStage("uploading");
    setErrorMsg(null);
    setResult(null);

    const formData = new FormData();
    
    if (ipaFile) {
      formData.append("ipa", ipaFile);
    } else if (ipaUrl) {
      formData.append("ipaUrl", ipaUrl);
    } else if (selectedApp) {
      formData.append("ipaUrl", APP_IPA_URLS[selectedApp]);
    }

    formData.append("p12", p12File);
    formData.append("mobileprovision", provFile);
    formData.append("password", password);
    if (bundleIdOverride) formData.append("bundleIdOverride", bundleIdOverride);
    if (appNameOverride) formData.append("appNameOverride", appNameOverride);
    if (entitlements) formData.append("entitlements", entitlements);
    if (codeSigningIdentity !== "auto") formData.append("codeSigningIdentity", codeSigningIdentity);
    if (outputFileName) formData.append("outputFileName", outputFileName);
    formData.append("signingAlgorithm", signingAlgorithm);

    try {
      const signingTimer = setTimeout(() => setStage("signing"), 1500);
      
      const apiUrl = typeof window !== "undefined" && window.location.hostname === "hamsign.vercel.app"
        ? "https://3000-ibvzjilgclojwsp9jp48v-89566439.us2.manus.computer/api/sign"
        : "/api/sign";

      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      clearTimeout(signingTimer);

      const data = await res.json();

      if (!res.ok) {
        setStage("error");
        setErrorMsg(data.error ?? "Signing failed. Please check your files and try again.");
        return;
      }

      setStage("done");
      setResult(data as SignResult);
      toast.success("IPA signed successfully!");
    } catch (err: unknown) {
      setStage("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error. Please try again.");
    }
  };

  const isProcessing = stage === "uploading" || stage === "signing";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Hero */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign your iOS IPA</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Upload your IPA, P12 certificate, and MobileProvision file. We'll re-sign the app and
              generate an ITMS over-the-air installation link you can open directly on your device.
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Signing Configuration</h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* App Selection */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Select App (Optional)</Label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onChange={(e) => {
                    if (e.target.value) {
                      const apps = [
                        { id: 'ksign', name: 'KSign', bundleId: 'nya.asami.ksign' },
                        { id: 'esign', name: 'ESign', bundleId: 'com.khoindvn.esign' },
                        { id: 'feather', name: 'Feather', bundleId: 'me.xfsnow.feather' },
                        { id: 'scarlet', name: 'Scarlet', bundleId: 'com.foxfort.scarlet' },
                      ];
                      const app = apps.find(a => a.id === e.target.value);
                      if (app) {
                        setSelectedApp(e.target.value);
                        setAppNameOverride(app.name);
                        setBundleIdOverride(app.bundleId);
                        setIpaFile(null);
                        setIpaUrl("");
                      }
                    } else {
                      setSelectedApp(null);
                      setAppNameOverride('');
                      setBundleIdOverride('');
                    }
                  }}
                >
                  <option value="">-- Custom IPA (No app selected) --</option>
                  <option value="ksign">KSign</option>
                  <option value="esign">ESign</option>
                  <option value="feather">Feather</option>
                  <option value="scarlet">Scarlet</option>
                </select>
                <p className="text-xs text-muted-foreground">Select a pre-configured app or leave blank for custom IPA signing</p>
              </div>

              {/* IPA */}
              {!selectedApp && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">IPA File</Label>
                    <FileDropZone
                      label="iOS Application (.ipa)"
                      accept=".ipa,application/octet-stream"
                      icon={<Upload className="w-5 h-5" />}
                      file={ipaFile}
                      onFile={(f) => { setIpaFile(f); setIpaUrl(""); }}
                      disabled={isProcessing || !!ipaUrl}
                      hint="Drag & drop or click to select your .ipa file"
                      maxSize={MAX_FILE_SIZE}
                    />
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="px-2 bg-card text-muted-foreground">Or</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">IPA URL</Label>
                    <Input
                      type="text"
                      placeholder="https://example.com/app.ipa"
                      className="w-full"
                      disabled={isProcessing || !!ipaFile}
                      value={ipaUrl}
                      onChange={(e) => {
                        setIpaUrl(e.target.value);
                        if (e.target.value) setIpaFile(null);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Paste a direct link to an .ipa file</p>
                  </div>
                </div>
              )}
              {selectedApp && (
                <div className="rounded-lg border border-success/40 bg-success/5 p-3">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="font-medium">Using pre-configured {selectedApp.toUpperCase()} IPA</span>
                  </div>
                </div>
              )}

              {/* P12 */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">P12 File</Label>
                <FileDropZone
                  label="Certificate (.p12)"
                  accept=".p12,application/x-pkcs12,application/octet-stream"
                  icon={<FileKey className="w-5 h-5" />}
                  file={p12File}
                  onFile={setP12File}
                  disabled={isProcessing}
                  hint="Drag & drop or click to select your .p12 certificate"
                  maxSize={MAX_FILE_SIZE}
                />
              </div>

              {/* Provisioning Profile */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Provisioning Profile</Label>
                <FileDropZone
                  label="Mobile Provision (.mobileprovision)"
                  accept=".mobileprovision,application/octet-stream"
                  icon={<ShieldCheck className="w-5 h-5" />}
                  file={provFile}
                  onFile={setProvFile}
                  disabled={isProcessing}
                  hint="Drag & drop or click to select your .mobileprovision file"
                  maxSize={MAX_FILE_SIZE}
                />
              </div>

              {/* P12 Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">P12 Password</Label>
                <Input
                  type="password"
                  placeholder="Enter P12 certificate password"
                  className="w-full"
                  disabled={isProcessing}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Advanced Options */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                {showAdvanced ? "Hide" : "Show"} Advanced Options
                <ChevronRight className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">App Name Override</Label>
                    <Input
                      placeholder="Leave blank to auto-detect"
                      className="w-full"
                      disabled={isProcessing}
                      value={appNameOverride}
                      onChange={(e) => setAppNameOverride(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">Bundle ID Override</Label>
                    <Input
                      placeholder="Leave blank to auto-detect"
                      className="w-full"
                      disabled={isProcessing}
                      value={bundleIdOverride}
                      onChange={(e) => setBundleIdOverride(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-destructive">{errorMsg}</div>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isProcessing || (!ipaFile && !ipaUrl && !selectedApp) || !p12File || !provFile || !password}
                className="w-full"
              >
                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {stage === "uploading" ? "Uploading..." : stage === "signing" ? "Signing..." : "Sign IPA"}
              </Button>
            </form>
          </div>

          {/* Result */}
          {result && <ResultView result={result} />}
        </div>
      </main>
    </div>
  );
}
