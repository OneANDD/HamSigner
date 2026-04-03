import { Link } from "wouter";
import { ShieldCheck, FileKey, Lock, ArrowRight, Zap, Lock as LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const features = [
    {
      href: "/signipa",
      icon: ShieldCheck,
      title: "Sign IPA",
      description: "Re-sign your iOS IPA files with your own P12 certificate and MobileProvision profile. Generate ITMS over-the-air installation links for direct device deployment.",
      color: "from-blue-600 to-blue-400",
    },
    {
      href: "/checkcert",
      icon: FileKey,
      title: "Check Pass",
      description: "Verify your P12 certificates and provisioning profiles. Check expiration dates, OCSP revocation status, and certificate chain validity.",
      color: "from-cyan-600 to-cyan-400",
    },
    {
      href: "/certpass",
      icon: Lock,
      title: "Change Pass",
      description: "Update the password for your P12 certificate files. Securely change or remove the password protection on your signing certificates.",
      color: "from-indigo-600 to-indigo-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />

        <div className="container relative z-10 space-y-8 max-w-3xl mx-auto text-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">iOS Developer Tools</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              iOS App Signing & Certificate Management
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Professional tools for signing iOS applications, validating certificates, and managing provisioning profiles. Built for developers who need speed and reliability.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/signipa">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Start Signing
              </Button>
            </Link>
            <Link href="/checkcert">
              <Button variant="outline" className="border-border text-foreground hover:bg-accent">
                <FileKey className="w-4 h-4 mr-2" />
                Check Certificate
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24 border-t border-border">
        <div className="container space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold">All-in-One iOS Toolkit</h2>
            <p className="text-muted-foreground">
              Everything you need to sign, validate, and manage iOS certificates and provisioning profiles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href} className="group relative block">
                    <div className="relative rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 h-full hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                      {/* Gradient accent */}
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`} />

                      <div className="relative space-y-4">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} p-2.5 flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>

                        {/* Arrow */}
                        <div className="flex items-center gap-2 text-primary font-medium text-sm pt-2 group-hover:gap-3 transition-all">
                          <span>Get Started</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 sm:py-24 border-t border-border bg-card/30">
        <div className="container max-w-2xl mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <LockIcon className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Privacy & Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            All files are processed securely on our servers and deleted immediately after processing. Your certificates and provisioning profiles are never stored or logged.
          </p>
        </div>
      </section>

      {/* Credits Section */}
      <section className="py-16 sm:py-24 border-t border-border">
        <div className="container space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">Made By</h2>
            <p className="text-muted-foreground">Built with passion by talented developers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Ham Card */}
            <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-2xl">
                  H
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Ham</h3>
                  <p className="text-sm text-muted-foreground">Product Vision & Design</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Conceptualized and designed the IPA Signer platform, defining the user experience and feature set for iOS developers.
                </p>
              </div>
            </div>

            {/* Manus Card */}
            <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl">
                  M
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Manus</h3>
                  <p className="text-sm text-muted-foreground">Full-Stack Development</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Built the complete web application, backend signing service, certificate utilities, and integrated zsign for iOS app re-signing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card/30">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Built for iOS developers. Fast, secure, and reliable.</p>
        </div>
      </footer>
    </div>
  );
}
