import { MonitorCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-provider";
import type { UserSettings } from "@shared/schema";

export function ViewModeToggle() {
  const { t } = useLanguage();
  
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (viewMode: "pro" | "lite") => {
      return apiRequest("PATCH", "/api/settings", { viewMode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
    },
  });

  const currentMode = settings?.viewMode || "pro";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-viewmode-toggle"
          className="hover-elevate active-elevate-2"
        >
          {currentMode === "pro" ? (
            <MonitorCheck className="h-5 w-5" />
          ) : (
            <Zap className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle view mode</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => updateSettingsMutation.mutate("pro")}
          className={currentMode === "pro" ? "bg-accent" : ""}
          data-testid="menu-item-pro"
        >
          <MonitorCheck className="mr-2 h-4 w-4" />
          {t("viewMode.pro")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSettingsMutation.mutate("lite")}
          className={currentMode === "lite" ? "bg-accent" : ""}
          data-testid="menu-item-lite"
        >
          <Zap className="mr-2 h-4 w-4" />
          {t("viewMode.lite")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
