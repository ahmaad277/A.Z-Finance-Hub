import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings2, Plus, Palette, Globe, TrendingUp, Shield, Fingerprint, Edit, Trash2, Bell, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useLanguage } from "@/lib/language-provider";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserSettings, Platform } from "@shared/schema";
import { checkBiometricSupport, registerBiometric } from "@/lib/biometric-auth";
import { CheckpointsManager } from "@/components/checkpoints-manager";

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformType, setNewPlatformType] = useState<string>("sukuk");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<Platform | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");

  // Local settings state for Save/Cancel/Reset functionality
  const [localSettings, setLocalSettings] = useState<Partial<UserSettings>>({});
  const [localTheme, setLocalTheme] = useState<string>("dark");
  const [localLanguage, setLocalLanguage] = useState<string>("en");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: platforms, isLoading: platformsLoading } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  // Initialize local settings from server settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        fontSize: settings.fontSize,
        viewMode: settings.viewMode,
        theme: settings.theme,
        language: settings.language,
        targetCapital2040: settings.targetCapital2040,
        autoReinvest: settings.autoReinvest,
        alertsEnabled: settings.alertsEnabled,
        alertDaysBefore: settings.alertDaysBefore,
        latePaymentAlertsEnabled: settings.latePaymentAlertsEnabled,
        securityEnabled: settings.securityEnabled,
      });
      setLocalTheme(settings.theme || "dark");
      setLocalLanguage(settings.language || "en");
      setHasChanges(false);
    }
  }, [settings]);

  // Sync localTheme with global theme context
  useEffect(() => {
    setLocalTheme(theme);
    // Also update localSettings.theme to ensure Save persists the correct value
    setLocalSettings(prev => ({ ...prev, theme }));
  }, [theme]);

  // Sync localLanguage with global language context
  useEffect(() => {
    setLocalLanguage(language);
    // Also update localSettings.language to ensure Save persists the correct value
    setLocalSettings(prev => ({ ...prev, language }));
  }, [language]);

  // Apply fontSize from local settings
  useEffect(() => {
    if (localSettings.fontSize) {
      document.documentElement.style.fontSize =
        localSettings.fontSize === "small" ? "14px" : localSettings.fontSize === "large" ? "18px" : "16px";
    }
  }, [localSettings.fontSize]);

  // Check biometric support on load
  useEffect(() => {
    async function check() {
      const support = await checkBiometricSupport();
      setBiometricAvailable(support.platformAuthenticator);
    }
    check();
  }, []);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: t("settings.saved"),
        description: t("settings.savedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("settings.saveError"),
        variant: "destructive",
      });
    },
  });

  const addPlatformMutation = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      return apiRequest("POST", "/api/platforms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      setNewPlatformName("");
      toast({
        title: t("settings.platformAdded"),
        description: t("settings.platformAddedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("settings.platformAddError"),
        variant: "destructive",
      });
    },
  });


  const deletePlatformMutation = useMutation({
    mutationFn: async (platformId: string) => {
      return apiRequest("DELETE", `/api/platforms/${platformId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setPlatformToDelete(null);
      toast({
        title: t("settings.platformDeleted"),
        description: t("settings.platformDeletedDesc"),
      });
    },
    onError: (error: any) => {
      setPlatformToDelete(null);
      const errorMessage = error.message || error.error || t("settings.platformDeleteError");
      toast({
        title: t("dialog.error"),
        description: errorMessage.includes("investment") 
          ? t("settings.platformHasInvestments")
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Reset Portfolio Mutation
  const resetPortfolioMutation = useMutation({
    mutationFn: async (confirmation: string) => {
      // Send user-provided confirmation to backend for validation
      return apiRequest("POST", "/api/portfolio/reset", {
        confirm: confirmation
      });
    },
    onSuccess: () => {
      // Invalidate all portfolio-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      setShowResetDialog(false);
      setResetConfirmation("");
      
      toast({
        title: language === "ar" ? "تم تنظيف المحفظة" : "Portfolio Reset",
        description: language === "ar" 
          ? "تم حذف جميع بيانات المحفظة بنجاح" 
          : "All portfolio data has been successfully deleted",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.error || "Failed to reset portfolio";
      toast({
        title: t("dialog.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleResetPortfolio = () => {
    if (resetConfirmation === "DELETE_ALL_DATA") {
      resetPortfolioMutation.mutate(resetConfirmation);
    }
  };

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/alerts/generate", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: t("settings.alertsGenerated"),
        description: `${data.generatedCount} ${t("settings.alertsGeneratedDesc")}`,
      });
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("settings.alertsGenerateError"),
        variant: "destructive",
      });
    },
  });

  const handleFontSizeChange = (fontSize: string) => {
    setLocalSettings(prev => ({ ...prev, fontSize }));
    setHasChanges(true);
  };

  const handleViewModeChange = (viewMode: string) => {
    setLocalSettings(prev => ({ ...prev, viewMode }));
    setHasChanges(true);
  };

  const handleThemeChange = (newTheme: string) => {
    setLocalTheme(newTheme);
    setTheme(newTheme as "light" | "dark");
    setLocalSettings(prev => ({ ...prev, theme: newTheme }));
    setHasChanges(true);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLocalLanguage(newLanguage);
    setLanguage(newLanguage as "en" | "ar");
    setLocalSettings(prev => ({ ...prev, language: newLanguage }));
    setHasChanges(true);
  };

  const handleTargetCapitalChange = (value: string) => {
    setLocalSettings(prev => ({ ...prev, targetCapital2040: value }));
    setHasChanges(true);
  };

  const handleAutoReinvestChange = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, autoReinvest: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleAlertsEnabledChange = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, alertsEnabled: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleAlertDaysBeforeChange = (value: number) => {
    setLocalSettings(prev => ({ ...prev, alertDaysBefore: value }));
    setHasChanges(true);
  };

  const handleLatePaymentAlertsChange = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, latePaymentAlertsEnabled: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleSecurityEnabledChange = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, securityEnabled: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(localSettings, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  const handleCancelChanges = () => {
    if (settings) {
      setLocalSettings({
        fontSize: settings.fontSize,
        viewMode: settings.viewMode,
        theme: settings.theme,
        language: settings.language,
        targetCapital2040: settings.targetCapital2040,
        autoReinvest: settings.autoReinvest,
        alertsEnabled: settings.alertsEnabled,
        alertDaysBefore: settings.alertDaysBefore,
        latePaymentAlertsEnabled: settings.latePaymentAlertsEnabled,
        securityEnabled: settings.securityEnabled,
      });
      setLocalTheme(settings.theme || "dark");
      setLocalLanguage(settings.language || "en");
      setTheme((settings.theme || "dark") as "light" | "dark");
      setLanguage((settings.language || "en") as "en" | "ar");
      setHasChanges(false);
      toast({
        title: language === "ar" ? "تم الإلغاء" : "Cancelled",
        description: language === "ar" ? "تم إلغاء التغييرات" : "Changes have been cancelled",
      });
    }
  };

  const handleResetToDefaults = () => {
    const defaults = {
      fontSize: "medium",
      viewMode: "pro",
      theme: "dark",
      language: "en",
      targetCapital2040: "1000000",
      autoReinvest: 0,
      alertsEnabled: 1,
      alertDaysBefore: 7,
      latePaymentAlertsEnabled: 1,
      securityEnabled: 0,
    };
    setLocalSettings(defaults);
    setLocalTheme("dark");
    setLocalLanguage("en");
    setTheme("dark");
    setLanguage("en");
    setHasChanges(true);
    toast({
      title: language === "ar" ? "تم إعادة التعيين" : "Reset",
      description: language === "ar" ? "تم إعادة الإعدادات إلى القيم الافتراضية" : "Settings have been reset to defaults",
    });
  };

  const handleAddPlatform = () => {
    if (!newPlatformName.trim()) {
      toast({
        title: t("dialog.error"),
        description: t("settings.platformNameRequired"),
        variant: "destructive",
      });
      return;
    }
    addPlatformMutation.mutate({ name: newPlatformName, type: newPlatformType });
  };

  const handleSetPIN = async () => {
    if (newPin.length < 4) {
      toast({
        variant: "destructive",
        title: t("dialog.error"),
        description: t("settings.pinTooShort"),
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        variant: "destructive",
        title: t("dialog.error"),
        description: t("settings.pinMismatch"),
      });
      return;
    }

    // Send plain PIN to backend - it will be hashed server-side
    updateSettingsMutation.mutate(
      { 
        pinHash: newPin, // Server expects this field and will hash it
        securityEnabled: 1,
      },
      {
        onSuccess: () => {
          setNewPin("");
          setConfirmPin("");
          toast({
            title: t("settings.pinSet"),
            description: t("settings.pinSetDesc"),
          });
        },
      }
    );
  };

  const handleRegisterBiometric = async () => {
    setIsRegisteringBiometric(true);
    try {
      const credentialId = await registerBiometric(settings?.id || "user");
      if (credentialId) {
        updateSettingsMutation.mutate(
          {
            biometricCredentialId: credentialId,
            biometricEnabled: 1,
          },
          {
            onSuccess: () => {
              toast({
                title: t("settings.biometricRegistered"),
                description: t("settings.biometricRegisteredDesc"),
              });
            },
          }
        );
      } else {
        toast({
          variant: "destructive",
          title: t("dialog.error"),
          description: t("settings.biometricRegisterError"),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("dialog.error"),
        description: t("settings.biometricRegisterError"),
      });
    } finally {
      setIsRegisteringBiometric(false);
    }
  };


  if (settingsLoading || platformsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        gradient
      />

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 items-start auto-rows-max">
        {/* Appearance Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Theme Toggle */}
            <div className="space-y-1.5">
              <Label>{t("settings.theme")}</Label>
              <Select value={localTheme} onValueChange={handleThemeChange}>
                <SelectTrigger data-testid="select-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("settings.light")}</SelectItem>
                  <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.fontSize")}</Label>
              <Select value={localSettings.fontSize || "medium"} onValueChange={handleFontSizeChange}>
                <SelectTrigger data-testid="select-font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t("settings.small")}</SelectItem>
                  <SelectItem value="medium">{t("settings.medium")}</SelectItem>
                  <SelectItem value="large">{t("settings.large")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.viewMode")}</Label>
              <Select value={localSettings.viewMode || "pro"} onValueChange={handleViewModeChange}>
                <SelectTrigger data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">{t("settings.proMode")}</SelectItem>
                  <SelectItem value="lite">{t("settings.liteMode")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.languageRegion")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Language */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.language")}</Label>
              <Select value={localLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.currency")}</Label>
              <Input
                value={settings?.currency || "SAR"}
                disabled
                data-testid="input-currency"
              />
            </div>
          </CardContent>
        </Card>

        {/* Investment Goals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.investmentGoals")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Target Capital 2040 */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.targetCapital2040")}</Label>
              <Input
                type="number"
                step="1000"
                min="0"
                value={localSettings.targetCapital2040 || ""}
                onChange={(e) => handleTargetCapitalChange(e.target.value)}
                placeholder="1000000"
                data-testid="input-target-capital"
              />
            </div>

            {/* Auto Reinvest */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("settings.autoReinvest")}</Label>
              <Switch
                checked={localSettings.autoReinvest === 1}
                onCheckedChange={handleAutoReinvestChange}
                data-testid="switch-auto-reinvest"
              />
            </div>
          </CardContent>
        </Card>

        {/* Alert Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.alertSettings")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Enable Alerts */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("settings.enableAlerts")}</Label>
              <Switch
                checked={localSettings.alertsEnabled === 1}
                onCheckedChange={handleAlertsEnabledChange}
                data-testid="switch-alerts-enabled"
              />
            </div>

            {/* Days Before Alert */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.alertDaysBefore")}</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={localSettings.alertDaysBefore || 7}
                onChange={(e) => handleAlertDaysBeforeChange(parseInt(e.target.value) || 7)}
                disabled={localSettings.alertsEnabled === 0}
                data-testid="input-alert-days-before"
              />
            </div>

            {/* Late Payment Alerts */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("settings.latePaymentAlerts")}</Label>
              <Switch
                checked={localSettings.latePaymentAlertsEnabled === 1}
                onCheckedChange={handleLatePaymentAlertsChange}
                disabled={localSettings.alertsEnabled === 0}
                data-testid="switch-late-payment-alerts"
              />
            </div>

            {/* Generate Alerts Button */}
            <Button
              onClick={() => generateAlertsMutation.mutate()}
              disabled={localSettings.alertsEnabled === 0 || generateAlertsMutation.isPending}
              className="w-full"
              data-testid="button-generate-alerts"
            >
              <Bell className="h-4 w-4 mr-2" />
              {generateAlertsMutation.isPending 
                ? t("settings.generatingAlerts") 
                : t("settings.generateAlerts")}
            </Button>
          </CardContent>
        </Card>

        {/* Platform Management */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.platforms")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Existing Platforms */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.existingPlatforms")}</Label>
              <div className="space-y-1.5">
                {platforms?.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 border hover-elevate"
                    data-testid={`platform-${platform.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                        {platform.logoUrl ? (
                          <img src={platform.logoUrl} alt={platform.name} className="h-full w-full object-cover rounded-md" />
                        ) : (
                          <span className="text-sm font-bold text-primary">{platform.name[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{platform.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{platform.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        data-testid={`button-edit-platform-${platform.id}`}
                        onClick={() => {
                          // Edit platform functionality will be added
                          toast({
                            title: t("settings.editPlatform"),
                            description: t("settings.editPlatformComingSoon"),
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        data-testid={`button-delete-platform-${platform.id}`}
                        onClick={() => setPlatformToDelete(platform)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Platform */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.addNewPlatform")}</Label>
              <div className="space-y-1.5">
                <Input
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  placeholder={t("settings.platformNamePlaceholder")}
                  data-testid="input-new-platform-name"
                />
                <Select value={newPlatformType} onValueChange={setNewPlatformType}>
                  <SelectTrigger data-testid="select-platform-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sukuk">Sukuk</SelectItem>
                    <SelectItem value="manfaa">Manfa'a</SelectItem>
                    <SelectItem value="lendo">Lendo</SelectItem>
                    <SelectItem value="other">{t("settings.other")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddPlatform}
                  disabled={addPlatformMutation.isPending}
                  className="w-full"
                  data-testid="button-add-platform"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addPlatformMutation.isPending ? t("dialog.saving") : t("settings.addPlatform")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Privacy */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.security")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {/* Enable Security */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("settings.enableSecurity")}</Label>
              <Switch
                checked={localSettings.securityEnabled === 1}
                onCheckedChange={handleSecurityEnabledChange}
                data-testid="switch-security-enabled"
              />
            </div>

            {/* PIN Setup */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.setupPIN")}</Label>
              <div className="grid md:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pin" className="text-sm">{t("settings.enterPIN")}</Label>
                  <Input
                    id="new-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    data-testid="input-new-pin"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pin" className="text-sm">{t("settings.confirmPIN")}</Label>
                  <Input
                    id="confirm-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    data-testid="input-confirm-pin"
                  />
                </div>
              </div>
              <Button
                onClick={handleSetPIN}
                disabled={newPin.length < 4 || confirmPin.length < 4 || updateSettingsMutation.isPending}
                data-testid="button-set-pin"
              >
                {updateSettingsMutation.isPending ? t("dialog.saving") : t("settings.setPIN")}
              </Button>
              {settings?.securityEnabled === 1 && (
                <p className="text-sm text-muted-foreground">
                  ✓ PIN configured
                </p>
              )}
            </div>

            {/* Biometric Authentication */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.biometric")}</Label>
              
              {!biometricAvailable ? (
                <p className="text-sm text-muted-foreground">{t("settings.biometricNotSupported")}</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t("settings.enableBiometric")}</Label>
                    <Switch
                      checked={settings?.biometricEnabled === 1}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ biometricEnabled: checked ? 1 : 0 })
                      }
                      disabled={settings?.biometricEnabled !== 1}
                      data-testid="switch-biometric-enabled"
                    />
                  </div>
                  
                  {settings?.securityEnabled === 1 && !settings?.biometricEnabled && (
                    <Button
                      onClick={handleRegisterBiometric}
                      disabled={isRegisteringBiometric}
                      variant="outline"
                      data-testid="button-register-biometric"
                    >
                      <Fingerprint className="w-4 h-4 mr-2" />
                      {isRegisteringBiometric ? t("dialog.saving") : t("settings.registerBiometric")}
                    </Button>
                  )}
                  
                  {settings?.biometricEnabled === 1 && (
                    <p className="text-sm text-muted-foreground">
                      ✓ Biometric registered
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Save/Cancel/Reset Buttons */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
              data-testid="button-reset-settings"
            >
              {language === "ar" ? "إعادة تعيين إلى الافتراضي" : "Reset to Defaults"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelChanges}
              disabled={!hasChanges}
              data-testid="button-cancel-settings"
            >
              {language === "ar" ? "إلغاء التغييرات" : "Cancel Changes"}
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={!hasChanges || updateSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateSettingsMutation.isPending 
                ? (language === "ar" ? "جاري الحفظ..." : "Saving...") 
                : (language === "ar" ? "حفظ الإعدادات" : "Save Settings")}
            </Button>
          </div>
          {hasChanges && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {language === "ar" 
                ? "لديك تغييرات غير محفوظة" 
                : "You have unsaved changes"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Checkpoints */}
      <CheckpointsManager />

      {/* Danger Zone - Reset Portfolio */}
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {language === "ar" ? "منطقة الخطر" : "Danger Zone"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border border-destructive/30 rounded-lg bg-destructive/5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {language === "ar" ? "تنظيف المحفظة بالكامل" : "Reset All Portfolio Data"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "ar" 
                  ? "حذف جميع الاستثمارات والتدفقات النقدية والمعاملات بشكل دائم" 
                  : "Permanently delete all investments, cashflows, and transactions"}
              </p>
            </div>
            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  data-testid="button-reset-portfolio"
                >
                  {language === "ar" ? "تنظيف المحفظة" : "Reset Portfolio"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <AlertDialogTitle>
                      {language === "ar" ? "تأكيد تنظيف المحفظة" : "Confirm Portfolio Reset"}
                    </AlertDialogTitle>
                  </div>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p className="text-destructive font-semibold">
                        {language === "ar" 
                          ? "⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!" 
                          : "⚠️ WARNING: This action cannot be undone!"}
                      </p>
                      <p>
                        {language === "ar" 
                          ? "سيتم حذف جميع البيانات التالية بشكل دائم:" 
                          : "The following data will be permanently deleted:"}
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>{language === "ar" ? "جميع الاستثمارات" : "All investments"}</li>
                        <li>{language === "ar" ? "جميع التدفقات النقدية" : "All cashflows"}</li>
                        <li>{language === "ar" ? "جميع المعاملات النقدية" : "All cash transactions"}</li>
                        <li>{language === "ar" ? "جميع التنبيهات" : "All alerts"}</li>
                        <li>{language === "ar" ? "جميع الجداول المخصصة" : "All custom distributions"}</li>
                      </ul>
                      <p className="text-sm text-muted-foreground">
                        {language === "ar" 
                          ? "سيتم الاحتفاظ بالمنصات والإعدادات" 
                          : "Platforms and settings will be preserved"}
                      </p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {language === "ar" 
                            ? 'اكتب "DELETE_ALL_DATA" للتأكيد:' 
                            : 'Type "DELETE_ALL_DATA" to confirm:'}
                        </label>
                        <Input
                          value={resetConfirmation}
                          onChange={(e) => setResetConfirmation(e.target.value)}
                          placeholder="DELETE_ALL_DATA"
                          data-testid="input-reset-confirmation"
                        />
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel 
                    onClick={() => setResetConfirmation("")}
                    data-testid="button-cancel-reset"
                  >
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetPortfolio}
                    disabled={resetConfirmation !== "DELETE_ALL_DATA" || resetPortfolioMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-reset"
                  >
                    {resetPortfolioMutation.isPending 
                      ? (language === "ar" ? "جاري الحذف..." : "Deleting...") 
                      : (language === "ar" ? "تنظيف المحفظة نهائياً" : "Reset Portfolio")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Delete Platform Confirmation Dialog */}
      <AlertDialog open={!!platformToDelete} onOpenChange={(open) => !open && setPlatformToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>{t("settings.deletePlatform")}</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{t("settings.deletePlatformConfirm")}</p>
                {platformToDelete && (
                  <p className="font-semibold text-foreground">
                    {platformToDelete.name}
                  </p>
                )}
                <p className="text-destructive">{t("settings.deletePlatformWarning")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-platform">
              {t("dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => platformToDelete && deletePlatformMutation.mutate(platformToDelete.id)}
              disabled={deletePlatformMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-platform"
            >
              {deletePlatformMutation.isPending ? t("dialog.deleting") : t("dialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
