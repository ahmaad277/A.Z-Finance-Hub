import { Switch, Route } from "wouter";
import { queryClient, clearCache } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/language-provider";
import { PlatformFilterProvider } from "@/lib/platform-filter-context";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SaveCheckpointButton } from "@/components/save-checkpoint-button";
import { PlatformFilterButton } from "@/components/platform-filter-button";
import { ShareDataEntryButton } from "@/components/share-data-entry-button";
import { lazy, Suspense, useEffect } from "react";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Investments = lazy(() => import("@/pages/investments"));
const CashflowsUnified = lazy(() => import("@/pages/cashflows-unified"));
const Reports = lazy(() => import("@/pages/reports"));
const Alerts = lazy(() => import("@/pages/alerts"));
const Help = lazy(() => import("@/pages/help"));
const Settings = lazy(() => import("@/pages/settings"));
const PlatformDetails = lazy(() => import("@/pages/platform-details"));
const Vision2040 = lazy(() => import("@/pages/vision-2040"));
const DataEntry = lazy(() => import("@/pages/data-entry"));
const NotFound = lazy(() => import("@/pages/not-found"));

// App version - increment to force cache clear
const APP_VERSION = "6";
const VERSION_KEY = "azfinance-app-version";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/investments" component={Investments} />
        <Route path="/cashflows" component={CashflowsUnified} />
        <Route path="/reports" component={Reports} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/vision-2040" component={Vision2040} />
        <Route path="/help" component={Help} />
        <Route path="/settings" component={Settings} />
        <Route path="/platform/:id" component={PlatformDetails} />
        <Route path="/data-entry/:token" component={DataEntry} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function MainContent() {
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  // Enable swipe gesture to open sidebar on mobile
  useSwipeGesture({
    onSwipeLeft: () => {
      if (isMobile) {
        setOpenMobile(true);
      }
    },
    enabled: isMobile,
    edgeThreshold: 50,
    minSwipeDistance: 50,
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b px-3 sm:px-4 py-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </div>
        <div className="flex items-center gap-1">
          <ShareDataEntryButton />
          <PlatformFilterButton />
          <SaveCheckpointButton />
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
        <Router />
      </main>
    </div>
  );
}

function AppContent() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={false}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <MainContent />
      </div>
    </SidebarProvider>
  );
}

function App() {
  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== APP_VERSION) {
      clearCache();
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <LanguageProvider defaultLanguage="en">
            <PlatformFilterProvider>
              <TooltipProvider>
                <AppContent />
                <Toaster />
              </TooltipProvider>
          </PlatformFilterProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
