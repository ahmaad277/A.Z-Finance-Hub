import { Switch, Route } from "wouter";
import { queryClient, clearCache } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/language-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { LogoutButton } from "@/components/logout-button";
import { UserProfile } from "@/components/user-profile";
import { ProtectedRoute } from "@/lib/protected-route";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Investments from "@/pages/investments";
import Cashflows from "@/pages/cashflows";
import Analytics from "@/pages/analytics";
import Reports from "@/pages/reports";
import Alerts from "@/pages/alerts";
import Reinvestment from "@/pages/reinvestment";
import Help from "@/pages/help";
import Settings from "@/pages/settings";
import PlatformDetails from "@/pages/platform-details";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

// App version - increment to force cache clear
const APP_VERSION = "4";
const VERSION_KEY = "azfinance-app-version";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/investments" component={Investments} />
      <ProtectedRoute path="/cashflows" component={Cashflows} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/alerts" component={Alerts} />
      <ProtectedRoute path="/reinvestment" component={Reinvestment} />
      <ProtectedRoute path="/help" component={Help} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/platform/:id" component={PlatformDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 border-b px-3 sm:px-4 py-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <div className="flex items-center gap-2">
              <UserProfile />
              <ThemeToggle />
              <LanguageToggle />
              <LogoutButton />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== APP_VERSION) {
      console.log('[App] Version mismatch - clearing cache');
      clearCache();
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <LanguageProvider defaultLanguage="en">
          <AuthProvider>
            <TooltipProvider>
              <AppContent />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
