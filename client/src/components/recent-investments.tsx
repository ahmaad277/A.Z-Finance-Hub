import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPercentage, formatInvestmentDisplayName } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Wallet } from "lucide-react";
import type { InvestmentWithPlatform } from "@shared/schema";

export function RecentInvestments() {
  const { t } = useLanguage();
  const { data: investments } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const recent = investments
    ?.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 5);

  if (!recent || recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="empty-state-recent-investments">
        <div className="rounded-full bg-muted p-3 mb-3">
          <Wallet className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("investments.noInvestmentsYet")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">{t("investments.title")}</th>
            <th className="pb-3 font-medium">{t("dialog.platform")}</th>
            <th className="pb-3 font-medium">{t("investments.amount")}</th>
            <th className="pb-3 font-medium">{t("investments.irr")}</th>
            <th className="pb-3 font-medium">{t("investments.startDate")}</th>
            <th className="pb-3 font-medium">{t("investments.status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {recent.map((investment) => (
            <tr
              key={investment.id}
              className="hover-elevate transition-colors"
              data-testid={`recent-investment-${investment.id}`}
            >
              <td className="py-3">
                <div className="font-medium line-clamp-1">{formatInvestmentDisplayName(investment, "")}</div>
              </td>
              <td className="py-3">
                <Badge variant="outline" className="text-xs">
                  {investment.platform.name}
                </Badge>
              </td>
              <td className="py-3 font-semibold">
                {formatCurrency(investment.faceValue)}
              </td>
              <td className="py-3 text-chart-1 font-medium">
                {formatPercentage(investment.expectedIrr)}
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {formatDate(investment.startDate)}
              </td>
              <td className="py-3">
                <Badge
                  variant="outline"
                  className={`capitalize ${
                    investment.status === "active"
                      ? "bg-chart-2/10 text-chart-2"
                      : "bg-muted"
                  }`}
                  data-testid={`badge-status-${investment.status}`}
                >
                  {t(`investments.${investment.status}`)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
