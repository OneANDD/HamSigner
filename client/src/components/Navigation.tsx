import { Link } from "wouter";
import { ShieldCheck, FileKey, Lock, Package } from "lucide-react";

export function Navigation() {
  const navItems = [
    { href: "/", label: "Home", icon: null },
    { href: "/apps", label: "Apps", icon: Package },
    { href: "/signipa", label: "Sign IPA", icon: ShieldCheck },
    { href: "/checkcert", label: "Check Pass", icon: FileKey },
    { href: "/certpass", label: "Change Pass", icon: Lock },
  ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="container flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="font-semibold text-foreground tracking-tight hidden sm:inline">
            IPA Signer
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                {Icon && <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
