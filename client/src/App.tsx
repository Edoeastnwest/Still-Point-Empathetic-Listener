import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Admin = lazy(() => import("./pages/Admin"));

function RouteLoading() {
  return <div className="min-h-screen bg-[#f7f4ed] text-[#173d35]"><a href="#main-content" className="skip-link">Skip to main content</a><header className="mx-auto max-w-6xl px-4 py-5 font-serif text-xl font-semibold sm:px-8">Stillpoint</header><main id="main-content" tabIndex={-1} role="status" aria-live="polite" className="mx-auto flex min-h-[45vh] max-w-6xl items-center justify-center px-4 text-sm text-[#536057]">Loading your Stillpoint page…</main></div>;
}

function Router() {
  return <Suspense fallback={<RouteLoading />}><Switch>
    <Route path="/" component={Home} />
    <Route path="/admin" component={Admin} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
