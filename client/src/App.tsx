import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/language-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { LockScreen } from "@/components/lock-screen";
import Dashboard from "@/pages/dashboard";
import Investments from "@/pages/investments";
import Cashflows from "@/pages/cashflows";
import Analytics from "@/pages/analytics";
import Timeline from "@/pages/timeline";
import Alerts from "@/pages/alerts";
import Reinvestment from "@/pages/reinvestment";
import Help from "@/pages/help";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import type { UserSettings } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/investments" component={Investments} />
      <Route path="/cashflows" component={Cashflows} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/timeline" component={Timeline} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/reinvestment" component={Reinvestment} />
      <Route path="/help" component={Help} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [isLocked, setIsLocked] = useState(true);
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (!isLoading && settings) {
      const needsAuth = settings.securityEnabled === 1 && settings.pinHash;
      setIsLocked(needsAuth);
    }
  }, [settings, isLoading]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLocked && settings?.securityEnabled === 1 && settings?.pinHash) {
    return (
      <LockScreen
        pinHash={settings.pinHash}
        biometricEnabled={settings.biometricEnabled === 1}
        biometricCredentialId={settings.biometricCredentialId}
        onUnlock={() => setIsLocked(false)}
      />
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-end border-b p-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <Router />
          </main>
        </div>
        <AppSidebar />
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <LanguageProvider defaultLanguage="en">
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
