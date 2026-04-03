import { useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useEffect } from "react";
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
  gbox: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663509354432/GHSFrzbn2jY59GbmfA8ZAd/gbox_7bf3e7e5.ipa',
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
          disabled={disabled}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="text-muted-foreground">{icon}</div>
          <div className="text-left">
            <div className="text-sm font-medium text-foreground">{file?.name || label}</div>
            {!file && <div className="text-xs text-muted-foreground">{hint}</div>}
          </div>
        </div>
      </div>
      {sizeWarning && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">
            This IPA is too big. I recommend installing these by another IPA signer or maybe try a smaller file?
          </p>
        </div>
      )}
    </div>
  );
}

// ---- StepIndicator ----
interface StepIndicatorProps {
  steps: string[];
  current: number;
}

function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              i < current
                ? "bg-success text-success-foreground"
                : i === current
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < current ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`text-sm ${i <= current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {step}
          </span>
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

// ---- CopyButton ----
interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 hover:bg-muted rounded transition-colors"
    >
      {copied ? (
        <Check className="w-4 h-4 text-success" />
      ) : (
        <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
      )}
    </button>
  );
}

// ---- ResultsPanel ----
interface ResultsPanelProps {
  result: SignResult;
}

function ResultsPanel({ result }: ResultsPanelProps) {
  return (
    <div className="space-y-4">
      {/* App info */}
      <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 space-y-1">
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
          <Download className="w-4 h-4" /> Download to Computer
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

  const canSubmit =
    (ipaFile !== null || selectedApp !== null) && p12File !== null && provFile !== null && stage === "idle";

  const handleReset = () => {
    setIpaFile(null);
    setP12File(null);
    setProvFile(null);
    setPassword("");
    setBundleIdOverride("");
    setAppNameOverride("");
    setEntitlements("");
    setCodeSigningIdentity("auto");
    setOutputFileName("");
    setSigningAlgorithm("sha256");
    setStage("idle");
    setErrorMsg(null);
    setResult(null);
    setSelectedApp(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStage("uploading");
    setErrorMsg(null);
    setResult(null);

    const formData = new FormData();
    if (selectedApp) {
      formData.append("ipaUrl", APP_IPA_URLS[selectedApp]);
    } else {
      formData.append("ipa", ipaFile!);
    }
    formData.append("p12", p12File!);
    formData.append("mobileprovision", provFile!);
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
                        { id: 'feather', name: 'Feather', bundleId: 'thewonderofyou.Feather' },
                        { id: 'gbox', name: 'GBox', bundleId: 'com.ncs.gbox' },
                        { id: 'scarlet', name: 'Scarlet', bundleId: 'com.DebianArch.ScarletPersonalXYZ' },
                      ];
                      const selected = apps.find(a => a.id === e.target.value);
                      if (selected) {
                        setSelectedApp(selected.id);
                        setAppNameOverride(selected.name);
                        setBundleIdOverride(selected.bundleId);
                        setIpaFile(null);
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
                  <option value="gbox">GBox</option>
                  <option value="scarlet">Scarlet</option>
                </select>
                <p className="text-xs text-muted-foreground">Select a pre-configured app or leave blank for custom IPA signing</p>
              </div>

              {/* IPA */}
              {!selectedApp && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">IPA File</Label>
                  <FileDropZone
                    label="iOS Application (.ipa)"
                    accept=".ipa,application/octet-stream"
                    icon={<Upload className="w-5 h-5" />}
                    file={ipaFile}
                    onFile={setIpaFile}
                    disabled={isProcessing}
                    hint="Drag & drop or click to select your .ipa file"
                    maxSize={MAX_FILE_SIZE}
                  />
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
                  hint="Your Apple distribution or developer certificate"
                />
              </div>

              {/* MobileProvision */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">MobileProvision File</Label>
                <FileDropZone
                  label="Provisioning Profile (.mobileprovision)"
                  accept=".mobileprovision,application/octet-stream"
                  icon={<ShieldCheck className="w-5 h-5" />}
                  file={provFile}
                  onFile={setProvFile}
                  disabled={isProcessing}
                  hint="Your provisioning profile matching the certificate"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Certificate Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="password"
                    placeholder="Enter your P12 certificate password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isProcessing}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Advanced Options */}
              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
                  Advanced Options
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    {/* Bundle ID Override */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">Bundle ID Override</Label>
                      <Input
                        placeholder="e.g., com.example.myapp"
                        value={bundleIdOverride}
                        onChange={(e) => setBundleIdOverride(e.target.value)}
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground">Leave blank to keep original bundle ID</p>
                    </div>

                    {/* App Name Override */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">App Name Override</Label>
                      <Input
                        placeholder="e.g., My Awesome App"
                        value={appNameOverride}
                        onChange={(e) => setAppNameOverride(e.target.value)}
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground">Leave blank to keep original app name</p>
                    </div>

                    {/* Entitlements */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">Entitlements (XML)</Label>
                      <textarea
                        placeholder="Paste custom entitlements XML here..."
                        value={entitlements}
                        onChange={(e) => setEntitlements(e.target.value)}
                        disabled={isProcessing}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs resize-none"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">Modify app capabilities (push notifications, app groups, etc.)</p>
                    </div>

                    {/* Code Signing Identity */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">Code Signing Identity</Label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={codeSigningIdentity}
                        onChange={(e) => setCodeSigningIdentity(e.target.value)}
                        disabled={isProcessing}
                      >
                        <option value="auto">Auto-detect</option>
                        <option value="distribution">Distribution</option>
                        <option value="development">Development</option>
                      </select>
                    </div>

                    {/* Output File Name */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">Output File Name</Label>
                      <Input
                        placeholder="e.g., signed-app"
                        value={outputFileName}
                        onChange={(e) => setOutputFileName(e.target.value)}
                        disabled={isProcessing}
                      />
                      <p className="text-xs text-muted-foreground">Leave blank for default naming</p>
                    </div>

                    {/* Signing Algorithm */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground">Signing Algorithm</Label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={signingAlgorithm}
                        onChange={(e) => setSigningAlgorithm(e.target.value)}
                        disabled={isProcessing}
                      >
                        <option value="sha256">SHA-256 (Recommended)</option>
                        <option value="sha1">SHA-1 (Legacy)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <XCircle className="w-4 h-4" />
                    Signing Failed
                  </div>
                  <p className="text-xs text-destructive/80">{errorMsg}</p>
                </div>
              )}

              {/* Progress */}
              {isProcessing && (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
                  <StepIndicator steps={["Upload", "Sign", "Complete"]} current={stage === "signing" ? 1 : 0} />
                  <Progress value={stage === "signing" ? 66 : 33} />
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!canSubmit || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {stage === "uploading" ? "Uploading..." : "Signing..."}
                  </>
                ) : (
                  "Sign IPA"
                )}
              </Button>
            </form>
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="px-6 py-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <h2 className="font-semibold text-foreground">Signing Complete</h2>
                </div>
              </div>
              <div className="px-6 py-5">
                <ResultsPanel result={result} />
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full mt-4"
                >
                  Sign Another IPA
                </Button>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="font-semibold text-foreground">How it works</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Upload Files</h3>
                  <p className="text-sm text-muted-foreground">
                    Select or upload your IPA file, P12 certificate, and provisioning profile.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Signs the IPA with your certificate on the server</h3>
                  <p className="text-sm text-muted-foreground">
                    Our server re-signs the IPA with your certificate and provisioning profile.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Install on Your Device</h3>
                  <p className="text-sm text-muted-foreground">
                    Open the ITMS link on your iOS device to install the signed app over-the-air.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
