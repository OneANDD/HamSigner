import { useState, useRef, useCallback } from "react";
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
          <div className={`shrink-0 ${file ? "text-success" : "text-muted-foreground"}`}>
            {file ? <CheckCircle2 className="w-5 h-5" /> : icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{label}</p>
            {file ? (
              <p className="text-xs text-success truncate">{file.name} ({formatBytes(file.size)})</p>
            ) : (
              <p className="text-xs text-muted-foreground">{hint ?? "Click or drag & drop"}</p>
            )}
          </div>
          {!file && (
            <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </div>
      {sizeWarning && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs text-destructive">
            <p className="font-medium">File too large</p>
            <p>Maximum size is {formatBytes(maxSize || MAX_FILE_SIZE)}. Try a smaller IPA or remove unnecessary assets.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- Progress Steps ----
const STEPS = [
  { id: "uploading", label: "Uploading files" },
  { id: "signing", label: "Signing IPA" },
  { id: "done", label: "Complete" },
];

function StepIndicator({ stage }: { stage: Stage }) {
  const activeIdx = STEPS.findIndex((s) => s.id === stage);
  const progressVal = stage === "uploading" ? 33 : stage === "signing" ? 66 : stage === "done" ? 100 : 0;

  return (
    <div className="space-y-3">
      <Progress value={progressVal} className="h-1.5" />
      <div className="flex justify-between">
        {STEPS.map((step, i) => {
          const isActive = i === activeIdx;
          const isDone = activeIdx > i || stage === "done";
          return (
            <div key={step.id} className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${isDone ? "bg-success text-success-foreground" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {isDone ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-xs ${isActive ? "text-foreground font-medium" : isDone ? "text-success" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground ml-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Copy Button ----
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

// ---- Results Panel ----
function ResultsPanel({ result }: { result: SignResult }) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-semibold">Signing complete</span>
      </div>

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
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Download className="w-4 h-4 text-primary" />
          Signed IPA Download
        </div>
        <div className="flex items-center gap-2 bg-muted rounded px-3 py-2">
          <span className="flex-1 text-xs font-mono text-muted-foreground truncate">{result.signedIpaUrl}</span>
          <CopyButton text={result.signedIpaUrl} />
        </div>
        <a
          href={result.signedIpaUrl}
          download
          className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <Download className="w-3.5 h-3.5" /> Download signed IPA
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

  const canSubmit =
    ipaFile !== null && p12File !== null && provFile !== null && stage === "idle";

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStage("uploading");
    setErrorMsg(null);
    setResult(null);

    const formData = new FormData();
    formData.append("ipa", ipaFile!);
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

      const res = await fetch("/api/sign", {
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
              {/* IPA */}
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
                  hint="Your Apple provisioning profile"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Certificate Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter P12 password (leave blank if none)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isProcessing}
                    className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <div
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors border border-border"
              >
                <span className="text-sm font-medium text-foreground">{showAdvanced ? "▼" : "▶"} Advanced Options</span>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                  {/* Bundle ID Override */}
                  <div className="space-y-1.5">
                    <Label htmlFor="bundleId" className="text-sm font-medium text-foreground">
                      Bundle ID Override (Optional)
                    </Label>
                    <Input
                      id="bundleId"
                      type="text"
                      placeholder="e.g., com.example.myapp"
                      value={bundleIdOverride}
                      onChange={(e) => setBundleIdOverride(e.target.value)}
                      disabled={isProcessing}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to keep original bundle ID</p>
                  </div>

                  {/* App Name Override */}
                  <div className="space-y-1.5">
                    <Label htmlFor="appName" className="text-sm font-medium text-foreground">
                      App Name Override (Optional)
                    </Label>
                    <Input
                      id="appName"
                      type="text"
                      placeholder="e.g., My Awesome App"
                      value={appNameOverride}
                      onChange={(e) => setAppNameOverride(e.target.value)}
                      disabled={isProcessing}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to keep original app name</p>
                  </div>

                  {/* Entitlements */}
                  <div className="space-y-1.5">
                    <Label htmlFor="entitlements" className="text-sm font-medium text-foreground">
                      Entitlements (Optional)
                    </Label>
                    <textarea
                      id="entitlements"
                      placeholder="Paste XML entitlements here to modify app capabilities"
                      value={entitlements}
                      onChange={(e) => setEntitlements(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs font-mono resize-none h-20"
                    />
                    <p className="text-xs text-muted-foreground">Advanced: Modify app capabilities and entitlements</p>
                  </div>

                  {/* Code Signing Identity */}
                  <div className="space-y-1.5">
                    <Label htmlFor="codeSigningId" className="text-sm font-medium text-foreground">
                      Code Signing Identity
                    </Label>
                    <select
                      id="codeSigningId"
                      value={codeSigningIdentity}
                      onChange={(e) => setCodeSigningIdentity(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm"
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="distribution">Distribution</option>
                      <option value="development">Development</option>
                    </select>
                  </div>

                  {/* Output File Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="outputName" className="text-sm font-medium text-foreground">
                      Output File Name (Optional)
                    </Label>
                    <Input
                      id="outputName"
                      type="text"
                      placeholder="e.g., signed-app"
                      value={outputFileName}
                      onChange={(e) => setOutputFileName(e.target.value)}
                      disabled={isProcessing}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank for default naming</p>
                  </div>

                  {/* Signing Algorithm */}
                  <div className="space-y-1.5">
                    <Label htmlFor="algorithm" className="text-sm font-medium text-foreground">
                      Signing Algorithm
                    </Label>
                    <select
                      id="algorithm"
                      value={signingAlgorithm}
                      onChange={(e) => setSigningAlgorithm(e.target.value)}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm"
                    >
                      <option value="sha256">SHA-256 (Recommended)</option>
                      <option value="sha1">SHA-1 (Legacy)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Progress */}
              {(isProcessing || stage === "done") && (
                <div className="pt-1">
                  <StepIndicator stage={stage} />
                  {isProcessing && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {stage === "uploading" ? "Uploading files to signing server…" : "Running zsign — this may take 30–60 seconds…"}
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {stage === "error" && errorMsg && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Signing failed</p>
                    <p className="text-xs text-destructive/80">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                {stage === "idle" || stage === "error" ? (
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Sign IPA
                  </Button>
                ) : isProcessing ? (
                  <Button type="button" disabled className="flex-1">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {stage === "uploading" ? "Uploading…" : "Signing…"}
                  </Button>
                ) : null}

                {(stage === "done" || stage === "error") && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="border-border text-foreground hover:bg-accent"
                  >
                    Sign Another
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Results */}
          {stage === "done" && result && (
            <div className="rounded-xl border border-success/30 bg-card shadow-sm px-6 py-5">
              <ResultsPanel result={result} />
            </div>
          )}

          {/* Info footer */}
          <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: <Upload className="w-4 h-4" />, title: "1. Upload", desc: "Provide your IPA, P12 certificate, and MobileProvision file." },
                { icon: <ShieldCheck className="w-4 h-4" />, title: "2. Sign", desc: "Signs the IPA with your certificate on the server." },
                { icon: <Smartphone className="w-4 h-4" />, title: "3. Install", desc: "Use the ITMS link to install directly on your iOS device." },
              ].map((item) => (
                <div key={item.title} className="flex gap-2.5">
                  <div className="shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
