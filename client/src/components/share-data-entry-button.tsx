import { useState } from "react";
import { Share2, Copy, RotateCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { UserSettings } from "@shared/schema";

export function ShareDataEntryButton() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        "/api/settings/generate-data-entry-token",
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: language === "ar" ? "تم التوليد" : "Generated",
        description:
          language === "ar"
            ? "تم توليد رابط مشاركة جديد بنجاح"
            : "New sharing link generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description:
          error.message ||
          (language === "ar"
            ? "فشل توليد الرابط"
            : "Failed to generate link"),
        variant: "destructive",
      });
    },
  });

  const shareUrl = settings?.dataEntryToken
    ? `${window.location.origin}/data-entry/${settings.dataEntryToken}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: language === "ar" ? "تم النسخ" : "Copied",
        description:
          language === "ar"
            ? "تم نسخ الرابط إلى الحافظة"
            : "Link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description:
          language === "ar"
            ? "فشل نسخ الرابط"
            : "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        data-testid="button-share-data-entry"
        title={language === "ar" ? "مشاركة إدخال البيانات" : "Share Data Entry"}
      >
        <Share2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {language === "ar"
                ? "مشاركة رابط إدخال البيانات"
                : "Share Data Entry Link"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar"
                ? "شارك هذا الرابط مع مدخل البيانات. سيتمكن من إضافة وتعديل الاستثمارات فقط، دون الوصول إلى أي معلومات مالية أخرى."
                : "Share this link with your data entry person. They will be able to add and edit investments only, without access to any other financial information."}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !settings?.dataEntryToken ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === "ar"
                  ? "لم يتم إنشاء رابط مشاركة بعد. اضغط الزر أدناه لتوليد رابط جديد."
                  : "No sharing link has been created yet. Click the button below to generate a new link."}
              </p>
              <Button
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                className="w-full"
                data-testid="button-generate-link"
              >
                {generateTokenMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === "ar" ? "جاري التوليد..." : "Generating..."}
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    {language === "ar" ? "توليد رابط مشاركة" : "Generate Sharing Link"}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-link">
                  {language === "ar" ? "رابط المشاركة" : "Sharing Link"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                    data-testid="input-share-link"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopy}
                    data-testid="button-copy-link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateTokenMutation.mutate()}
                  disabled={generateTokenMutation.isPending}
                  className="flex-1"
                  data-testid="button-regenerate-link"
                >
                  {generateTokenMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {language === "ar" ? "جاري التجديد..." : "Regenerating..."}
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4" />
                      {language === "ar" ? "تجديد الرابط" : "Regenerate Link"}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {language === "ar"
                  ? "تجديد الرابط سيجعل الرابط القديم غير صالح."
                  : "Regenerating the link will invalidate the old link."}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
