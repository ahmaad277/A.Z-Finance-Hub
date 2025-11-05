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
import { Settings2, Plus, Palette, Globe, TrendingUp, Shield, Fingerprint } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserSettings, Platform } from "@shared/schema";
import { checkBiometricSupport, registerBiometric, hashPIN } from "@/lib/biometric-auth";

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

  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: platforms, isLoading: platformsLoading } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  // Apply fontSize from settings on initial load
  useEffect(() => {
    if (settings?.fontSize) {
      document.documentElement.style.fontSize =
        settings.fontSize === "small" ? "14px" : settings.fontSize === "large" ? "18px" : "16px";
    }
  }, [settings?.fontSize]);

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

  const handleFontSizeChange = (fontSize: string) => {
    updateSettingsMutation.mutate({ fontSize });
    document.documentElement.style.fontSize =
      fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : "16px";
  };

  const handleViewModeChange = (viewMode: string) => {
    updateSettingsMutation.mutate({ viewMode });
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as "light" | "dark");
    updateSettingsMutation.mutate({ theme: newTheme });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as "en" | "ar");
    updateSettingsMutation.mutate({ language: newLanguage });
  };

  const handleTargetCapitalChange = (value: string) => {
    const numericValue = parseFloat(value) || 0;
    updateSettingsMutation.mutate({ targetCapital2040: numericValue.toString() });
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

    const pinHashValue = await hashPIN(newPin);
    updateSettingsMutation.mutate(
      { 
        pinHash: pinHashValue,
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-settings-title">
            {t("settings.title")}
          </h1>
          <p className="text-muted-foreground">{t("settings.description")}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle>{t("settings.appearance")}</CardTitle>
            </div>
            <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Toggle */}
            <div className="space-y-2">
              <Label>{t("settings.theme")}</Label>
              <Select value={theme} onValueChange={handleThemeChange}>
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
            <div className="space-y-2">
              <Label>{t("settings.fontSize")}</Label>
              <Select value={settings?.fontSize || "medium"} onValueChange={handleFontSizeChange}>
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
            <div className="space-y-2">
              <Label>{t("settings.viewMode")}</Label>
              <Select value={settings?.viewMode || "pro"} onValueChange={handleViewModeChange}>
                <SelectTrigger data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">{t("settings.proMode")}</SelectItem>
                  <SelectItem value="lite">{t("settings.liteMode")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {settings?.viewMode === "pro" ? t("settings.proModeDesc") : t("settings.liteModeDesc")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <CardTitle>{t("settings.languageRegion")}</CardTitle>
            </div>
            <CardDescription>{t("settings.languageRegionDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language */}
            <div className="space-y-2">
              <Label>{t("settings.language")}</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
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
            <div className="space-y-2">
              <Label>{t("settings.currency")}</Label>
              <Input
                value={settings?.currency || "SAR"}
                disabled
                data-testid="input-currency"
              />
              <p className="text-sm text-muted-foreground">{t("settings.currencyNote")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Investment Goals */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>{t("settings.investmentGoals")}</CardTitle>
            </div>
            <CardDescription>{t("settings.investmentGoalsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Capital 2040 */}
            <div className="space-y-2">
              <Label>{t("settings.targetCapital2040")}</Label>
              <Input
                type="number"
                step="1000"
                min="0"
                value={settings?.targetCapital2040 || ""}
                onChange={(e) => handleTargetCapitalChange(e.target.value)}
                placeholder="1000000"
                data-testid="input-target-capital"
              />
              <p className="text-sm text-muted-foreground">{t("settings.targetCapitalDesc")}</p>
            </div>

            {/* Auto Reinvest */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.autoReinvest")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.autoReinvestDesc")}</p>
              </div>
              <Switch
                checked={settings?.autoReinvest === 1}
                onCheckedChange={(checked) => 
                  updateSettingsMutation.mutate({ autoReinvest: checked ? 1 : 0 })
                }
                data-testid="switch-auto-reinvest"
              />
            </div>
          </CardContent>
        </Card>

        {/* Platform Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <CardTitle>{t("settings.platforms")}</CardTitle>
            </div>
            <CardDescription>{t("settings.platformsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Platforms */}
            <div className="space-y-2">
              <Label>{t("settings.existingPlatforms")}</Label>
              <div className="space-y-2">
                {platforms?.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted"
                    data-testid={`platform-${platform.id}`}
                  >
                    <span className="font-medium">{platform.name}</span>
                    <span className="text-sm text-muted-foreground capitalize">{platform.type}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Add New Platform */}
            <div className="space-y-4">
              <Label>{t("settings.addNewPlatform")}</Label>
              <div className="space-y-2">
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
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>{t("settings.security")}</CardTitle>
            </div>
            <CardDescription>{t("settings.securityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable Security */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.enableSecurity")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.enableSecurityDesc")}</p>
              </div>
              <Switch
                checked={settings?.securityEnabled === 1}
                onCheckedChange={(checked) => 
                  updateSettingsMutation.mutate({ securityEnabled: checked ? 1 : 0 })
                }
                data-testid="switch-security-enabled"
              />
            </div>

            <Separator />

            {/* PIN Setup */}
            <div className="space-y-4">
              <div className="space-y-0.5">
                <Label>{t("settings.setupPIN")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.setupPINDesc")}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pin">{t("settings.enterPIN")}</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="confirm-pin">{t("settings.confirmPIN")}</Label>
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
              {settings?.pinHash && (
                <p className="text-sm text-muted-foreground">
                  ✓ PIN configured
                </p>
              )}
            </div>

            <Separator />

            {/* Biometric Authentication */}
            <div className="space-y-4">
              <div className="space-y-0.5">
                <Label>{t("settings.biometric")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.biometricDesc")}</p>
              </div>
              
              {!biometricAvailable ? (
                <p className="text-sm text-muted-foreground">{t("settings.biometricNotSupported")}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.enableBiometric")}</Label>
                    </div>
                    <Switch
                      checked={settings?.biometricEnabled === 1}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ biometricEnabled: checked ? 1 : 0 })
                      }
                      disabled={!settings?.biometricCredentialId}
                      data-testid="switch-biometric-enabled"
                    />
                  </div>
                  
                  {!settings?.biometricCredentialId && (
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
                  
                  {settings?.biometricCredentialId && (
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
    </div>
  );
}
