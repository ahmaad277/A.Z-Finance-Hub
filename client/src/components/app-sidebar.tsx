import { LayoutDashboard, TrendingUp, Wallet, BarChart3, Sparkles, Bell, Clock, RefreshCw, BookOpen, Settings2, Users, Shield, FileText, FileDown, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/lib/language-provider";
import { useAuth } from "@/hooks/use-auth";

const menuItems = [
  {
    key: "dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    key: "investments",
    url: "/investments",
    icon: Wallet,
  },
  {
    key: "cashflows",
    url: "/cashflows",
    icon: TrendingUp,
  },
  {
    key: "analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    key: "aiInsights",
    url: "/ai-insights",
    icon: Sparkles,
  },
  {
    key: "reinvestment",
    url: "/reinvestment",
    icon: RefreshCw,
  },
  {
    key: "timeline",
    url: "/timeline",
    icon: Clock,
  },
  {
    key: "alerts",
    url: "/alerts",
    icon: Bell,
  },
  {
    key: "help",
    url: "/help",
    icon: BookOpen,
  },
  {
    key: "settings",
    url: "/settings",
    icon: Settings2,
  },
];

const adminItems = [
  {
    key: "users",
    url: "/admin/users",
    icon: Users,
    permission: "VIEW_USERS|CREATE_USERS|EDIT_USERS",
  },
  {
    key: "roles",
    url: "/admin/roles",
    icon: Shield,
    permission: "VIEW_ROLES|CREATE_ROLES|EDIT_ROLES",
  },
  {
    key: "audit",
    url: "/admin/audit",
    icon: FileText,
    permission: "VIEW_USERS|VIEW_ROLES",
  },
  {
    key: "exportRequests",
    url: "/admin/export-requests",
    icon: FileDown,
    permission: "REQUEST_EXPORT|APPROVE_EXPORT",
  },
  {
    key: "viewRequests",
    url: "/admin/view-requests",
    icon: Eye,
    permission: "REQUEST_VIEW|APPROVE_VIEW",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { setOpenMobile } = useSidebar();
  const { hasPermission } = useAuth();

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  // Helper to check OR permissions (separated by |)
  const checkPermission = (permission: string) => {
    const permissions = permission.split('|');
    return permissions.some(p => hasPermission(p.trim()));
  };

  return (
    <Sidebar side="right">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">{t("app.name")}</span>
            <span className="text-xs text-muted-foreground">{t("app.subtitle")}</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`link-${item.key}`}
                      className="hover-elevate active-elevate-2"
                    >
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{t(`nav.${item.key}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {adminItems.some(item => checkPermission(item.permission)) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  if (!checkPermission(item.permission)) return null;
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`link-admin-${item.key}`}
                        className="hover-elevate active-elevate-2"
                      >
                        <Link href={item.url} onClick={handleNavClick}>
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{t(`admin.${item.key}`)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="text-xs text-muted-foreground text-center">
          <div>{t("app.copyright")}</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
