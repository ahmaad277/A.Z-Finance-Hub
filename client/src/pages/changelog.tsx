import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useLanguage } from "@/lib/language-provider";
import { History, Sparkles, Zap, Bug } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: Date;
  features?: string[];
  improvements?: string[];
  bugFixes?: string[];
}

export default function Changelog() {
  const { t, language } = useLanguage();

  const changelog: ChangelogEntry[] = [
    {
      version: "1.0.1",
      date: new Date(2025, 10, 22), // November 22, 2025
      features: [
        "changelog.v101.feature1",
        "changelog.v101.feature2"
      ],
      improvements: [
        "changelog.v101.improvement1",
        "changelog.v101.improvement2"
      ],
      bugFixes: [
        "changelog.v101.bugFix1"
      ]
    },
    {
      version: "1.0.0",
      date: new Date(2025, 10, 15), // November 15, 2025
      features: [
        "changelog.v100.feature1",
        "changelog.v100.feature2",
        "changelog.v100.feature3",
        "changelog.v100.feature4",
        "changelog.v100.feature5",
        "changelog.v100.feature6",
        "changelog.v100.feature7",
        "changelog.v100.feature8",
        "changelog.v100.feature9"
      ]
    }
  ];

  // Format date using Intl.DateTimeFormat based on current language
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title={t("changelog.title")}
        description={t("changelog.subtitle")}
        data-testid="header-changelog"
      />

      <div className="space-y-6">
        {changelog.map((entry, index) => (
          <Card key={entry.version} data-testid={`changelog-entry-${entry.version}`}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-base px-3 py-1" data-testid={`badge-version-${entry.version}`}>
                    {t("changelog.version")} {entry.version}
                  </Badge>
                  {index === 0 && (
                    <Badge variant="secondary" className="px-2 py-0.5" data-testid="badge-latest">
                      {t("changelog.latest")}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground" data-testid={`text-date-${entry.version}`}>
                  {t("changelog.releaseDate")}: {formatDate(entry.date)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {entry.features && entry.features.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">{t("changelog.features")}</h3>
                  </div>
                  <ul className="space-y-2">
                    {entry.features.map((featureKey, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`feature-${entry.version}-${idx}`}>
                        <span className="text-primary mt-1">•</span>
                        <span>{t(featureKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.improvements && entry.improvements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold">{t("changelog.improvements")}</h3>
                  </div>
                  <ul className="space-y-2">
                    {entry.improvements.map((improvementKey, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`improvement-${entry.version}-${idx}`}>
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{t(improvementKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.bugFixes && entry.bugFixes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Bug className="w-4 h-4 text-green-500" />
                    <h3 className="font-semibold">{t("changelog.bugFixes")}</h3>
                  </div>
                  <ul className="space-y-2">
                    {entry.bugFixes.map((fixKey, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`bugfix-${entry.version}-${idx}`}>
                        <span className="text-green-500 mt-1">•</span>
                        <span>{t(fixKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
