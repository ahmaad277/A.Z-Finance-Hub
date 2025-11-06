import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/language-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { AppSidebar } from "@/components/app-sidebar";
import { LockScreen } from "@/components/lock-screen";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { ProtectedRoute } from "@/lib/protected-route";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Investments from "@/pages/investments";
import Cashflows from "@/pages/cashflows";
import Analytics from "@/pages/analytics";
import AIInsights from "@/pages/ai-insights";
import Timeline from "@/pages/timeline";
import Alerts from "@/pages/alerts";
import Reinvestment from "@/pages/reinvestment";
import Help from "@/pages/help";
import Settings from "@/pages/settings";
import PlatformDetails from "@/pages/platform-details";
import UserManagement from "@/pages/user-management";
import RoleManagement from "@/pages/role-management";
import AuditLog from "@/pages/audit-log";
import NotFound from "@/pages/not-found";
import type { UserSettings } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/investments" component={Investments} />
      <ProtectedRoute path="/cashflows" component={Cashflows} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/ai-insights" component={AIInsights} />
      <ProtectedRoute path="/timeline" component={Timeline} />
      <ProtectedRoute path="/alerts" component={Alerts} />
      <ProtectedRoute path="/reinvestment" component={Reinvestment} />
      <ProtectedRoute path="/help" component={Help} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/platform/:id" component={PlatformDetails} />
      <ProtectedRoute path="/admin/users" component={UserManagement} />
      <ProtectedRoute path="/admin/roles" component={RoleManagement} />
      <ProtectedRoute path="/admin/audit" component={AuditLog} />
      <Route component={NotFound} />
    </Switch>
  );
}

interface AuthStatus {
  isAuthenticated: boolean;
  securityEnabled: boolean;
  biometricEnabled: boolean;
  hasPIN: boolean;
  biometricCredentialId?: string;
}

function AppContent() {
  const [isLocked, setIsLocked] = useState(true);
  const { data: authStatus, isLoading } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
  });

  useEffect(() => {
    if (!isLoading && authStatus) {
      const needsAuth = authStatus.securityEnabled && authStatus.hasPIN && !authStatus.isAuthenticated;
      setIsLocked(needsAuth);
    }
  }, [authStatus, isLoading]);

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

  if (isLocked && authStatus?.securityEnabled && authStatus?.hasPIN) {
    return (
      <LockScreen
        biometricEnabled={authStatus.biometricEnabled}
        biometricCredentialId={authStatus.biometricCredentialId}
        onUnlock={() => setIsLocked(false)}
      />
    );
  }

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
              <ThemeToggle />
              <LanguageToggle />
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
