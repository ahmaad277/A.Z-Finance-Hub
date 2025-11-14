import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PortfolioHistory } from "@shared/schema";
import { Edit2, Save, X, Plus } from "lucide-react";

export function HistoricalDataTable() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === "ar";
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Fetch portfolio history (actual monthly values)
  const { data: history = [], isLoading } = useQuery<PortfolioHistory[]>({
    queryKey: ["/api/portfolio-history"],
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, totalValue, notes }: { id: string; totalValue: string; notes?: string }) => {
      return await apiRequest(`/api/portfolio-history/${id}`, "PATCH", {
        totalValue,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-history"] });
      toast({
        title: t("vision2040.success"),
        description: t("vision2040.dataUpdated"),
      });
      setEditingId(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("vision2040.error"),
        description: t("vision2040.updateFailed"),
      });
    },
  });

  const handleEdit = (item: PortfolioHistory) => {
    setEditingId(item.id);
    setEditValue(item.totalValue || "");
    setEditNotes(item.notes || "");
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({
      id,
      totalValue: editValue,
      notes: editNotes,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
    setEditNotes("");
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "-";
    const num = parseFloat(value);
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
    }).format(dateObj);
  };

  // Show only recent months (last 24 months)
  const recentHistory = history
    .filter(h => {
      const historyDate = new Date(h.month);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - historyDate.getFullYear()) * 12 + 
                         (now.getMonth() - historyDate.getMonth());
      return monthsDiff >= 0 && monthsDiff <= 24;
    })
    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="text-center text-sm text-muted-foreground">
            {t("common.loading")}...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-2 sm:p-3 font-semibold">
                  {t("vision2040.month")}
                </th>
                <th className="text-right p-2 sm:p-3 font-semibold">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    {t("vision2040.actualValue")}
                  </div>
                </th>
                <th className="text-right p-2 sm:p-3 font-semibold hidden sm:table-cell">
                  {t("vision2040.notes")}
                </th>
                <th className="text-center p-2 sm:p-3 font-semibold w-20 sm:w-24">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted-foreground">
                    {t("vision2040.noData")}
                  </td>
                </tr>
              ) : (
                recentHistory.map((item) => {
                  const isEditing = editingId === item.id;
                  
                  return (
                    <tr 
                      key={item.id} 
                      className="border-b hover:bg-muted/30"
                      data-testid={`row-history-${item.id}`}
                    >
                      <td className="p-2 sm:p-3 font-medium">
                        {formatDate(item.month)}
                      </td>
                      <td className="p-2 sm:p-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 text-xs sm:text-sm"
                            placeholder="0"
                            data-testid={`input-actual-${item.id}`}
                          />
                        ) : (
                          <span className="font-semibold text-orange-500">
                            {formatCurrency(item.totalValue)}
                          </span>
                        )}
                      </td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell">
                        {isEditing ? (
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="h-7 text-xs sm:text-sm"
                            placeholder={t("vision2040.notesPlaceholder")}
                            data-testid={`input-notes-${item.id}`}
                          />
                        ) : (
                          <span className="text-muted-foreground truncate block max-w-xs">
                            {item.notes || "-"}
                          </span>
                        )}
                      </td>
                      <td className="p-2 sm:p-3">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSave(item.id)}
                                disabled={updateMutation.isPending}
                                className="h-7 w-7"
                                data-testid={`button-save-${item.id}`}
                              >
                                <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleCancel}
                                className="h-7 w-7"
                                data-testid={`button-cancel-${item.id}`}
                              >
                                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                              className="h-7 w-7"
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
