import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function NotFound() {
  return <div className="flex min-h-screen flex-col bg-[#f7f4ed] text-[#173d35]">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-5 sm:px-8"><Link href="/" className="rounded-xl font-serif text-xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#587365]">Stillpoint</Link></header>
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg border-[#e8e2d7] bg-white/90 shadow-[0_20px_60px_rgba(67,73,63,0.08)]"><CardContent className="px-6 py-10 text-center sm:px-10">
        <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf5ef] text-[#315d49]"><Compass className="h-7 w-7" /></span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#825c43]">A small detour</p>
        <h1 className="mt-3 font-serif text-4xl text-[#173d35]">We couldn’t find that page.</h1>
        <p className="mx-auto mt-4 max-w-sm leading-6 text-[#46564d]">The link may be old or the page may have moved. Your Stillpoint dashboard is still one step away.</p>
        <Button asChild className="mt-7 min-h-12 rounded-xl bg-[#173d35] px-6 text-white hover:bg-[#28574b]"><Link href="/"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to Stillpoint</Link></Button>
      </CardContent></Card>
    </main>
  </div>;
}
