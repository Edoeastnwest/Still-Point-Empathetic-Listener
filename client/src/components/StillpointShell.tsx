import { useState } from "react";
import { Link } from "wouter";
import { HeartHandshake, LogOut, Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationCenter from "@/components/NotificationCenter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StillpointShellProps = {
  children: React.ReactNode;
  variant?: "client" | "admin";
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSigningOut?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  onSignOut?: () => void;
};

function BrandMark() {
  return <Link href="/" className="inline-flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#587365] focus-visible:ring-offset-2">
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#173d35] text-[#f6f1e8] shadow-[0_8px_24px_rgba(23,61,53,0.18)]"><HeartHandshake className="h-5 w-5" strokeWidth={1.8} /></span>
    <span className="min-w-0"><span className="block truncate font-serif text-lg font-semibold leading-none tracking-tight text-[#173d35]">Stillpoint</span><span className="mt-1 block truncate text-[10px] font-medium uppercase tracking-[0.22em] text-[#69726a]">Empathetic listening</span></span>
  </Link>;
}

export default function StillpointShell({
  children,
  variant = "client",
  isAuthenticated,
  isAdmin,
  isSigningOut = false,
  userName,
  userEmail,
  onSignOut,
}: StillpointShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const adminHref = variant === "admin" ? "/" : "/admin";
  const adminLabel = variant === "admin" ? "Client dashboard" : "Admin inbox";

  const signOut = () => {
    setMenuOpen(false);
    onSignOut?.();
  };

  return <div className="flex min-h-screen flex-col bg-[#f7f4ed] text-[#173d35]">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-6">
      <BrandMark />
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {isAuthenticated ? <NotificationCenter /> : null}
        <Badge className="hidden border-[#d8e4dd] bg-[#f0f6f1] px-3 py-1.5 text-[#3c6b5b] md:inline-flex">Demo environment</Badge>
        {isAuthenticated && isAdmin ? <nav aria-label="Primary" className="hidden sm:block"><Link href={adminHref} aria-current={variant === "admin" ? "page" : undefined} className="rounded-lg px-3 py-2 text-sm font-medium text-[#53665b] underline-offset-4 hover:text-[#173d35] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#587365]">{adminLabel}</Link></nav> : null}
        {isAuthenticated && userEmail ? <span className="hidden max-w-48 truncate text-xs text-[#536057] lg:inline" title={userEmail}>{userName || userEmail}</span> : null}
        {isAuthenticated ? <Button variant="ghost" size="sm" onClick={signOut} disabled={isSigningOut} className="hidden min-h-10 text-[#536057] hover:bg-[#f0ece3] hover:text-[#173d35] sm:inline-flex" aria-label="Sign out">{isSigningOut ? <span role="status">Signing out…</span> : <><LogOut aria-hidden="true" className="h-4 w-4" /><span>Sign out</span></>}</Button> : null}
        {isAuthenticated ? <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation menu" aria-expanded={menuOpen} className="min-h-11 min-w-11 rounded-xl sm:hidden"><Menu aria-hidden="true" className="h-5 w-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-[#e6e0d5] bg-[#fffdfa] text-[#34483e]">
            {userEmail ? <div className="px-2 py-2"><p className="truncate text-xs font-medium text-[#34483e]">{userName || userEmail}</p><p className="truncate text-xs text-[#69726a]">{userEmail}</p></div> : null}
            {isAdmin ? <><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href={adminHref} aria-current={variant === "admin" ? "page" : undefined} className="flex w-full items-center gap-2">{variant === "admin" ? <HeartHandshake aria-hidden="true" className="h-4 w-4" /> : <ShieldCheck aria-hidden="true" className="h-4 w-4" />}{adminLabel}</Link></DropdownMenuItem></> : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); signOut(); }} disabled={isSigningOut} className="min-h-11 text-[#8a5d46] focus:text-[#8a5d46]">{isSigningOut ? "Signing out…" : <><LogOut aria-hidden="true" className="mr-2 h-4 w-4" />Sign out</>}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> : null}
      </div>
    </header>
    {children}
    <footer className="mx-auto mt-auto flex w-full max-w-6xl flex-col gap-2 border-t border-[#e6e0d5] px-4 py-5 text-xs leading-5 text-[#58645b] sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <span>Stillpoint · empathetic listening prototype</span>
      <span>{isAuthenticated ? `Signed in as ${userEmail || userName || "client"}` : "Demo access · no live payment processing"}</span>
    </footer>
  </div>;
}
