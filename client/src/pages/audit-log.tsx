import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw, Filter, X, Shield } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  actorId: string | null;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
  actor?: {
    id: string;
    email: string;
    fullName: string;
  };
}

export default function AuditLog() {
  const { t, language } = useLanguage();
  const { hasPermission } = useAuth();
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch } = useQuery<AuditLog[]>({
    queryKey: ['/api/v2/audit'],
    enabled: hasPermission('system:view_audit_log'),
  });

  // Check permission
  if (!hasPermission('system:view_audit_log')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="text-center">{t('noPermissionToViewRoles')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get unique actors and targets for filters
  const uniqueActors = Array.from(
    new Set(logs.map(log => log.actor?.email || (log.actorId ? 'Unknown' : 'System')))
  );
  const uniqueActions = Array.from(new Set(logs.map(log => log.actionType)));
  const uniqueTargets = Array.from(new Set(logs.map(log => log.targetType).filter(Boolean)));

  // Apply filters
  const filteredLogs = logs.filter(log => {
    if (actionFilter !== "all" && log.actionType !== actionFilter) return false;
    if (actorFilter !== "all") {
      const actorEmail = log.actor?.email || (log.actorId ? 'Unknown' : 'System');
      if (actorEmail !== actorFilter) return false;
    }
    if (targetFilter !== "all" && log.targetType !== targetFilter) return false;
    return true;
  });

  const hasActiveFilters = actionFilter !== "all" || actorFilter !== "all" || targetFilter !== "all";

  const clearFilters = () => {
    setActionFilter("all");
    setActorFilter("all");
    setTargetFilter("all");
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" => {
    switch (action) {
      case 'create': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('audit.title')}</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          {t('audit.subtitle')}
        </p>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>{t('audit.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-refresh-logs"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('audit.refreshLog')}
              </Button>
              {hasPermission('system:export_audit_log') && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-export-logs"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t('audit.exportLog')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger data-testid="select-action-filter">
                  <SelectValue placeholder={t('audit.filterByAction')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.allActions')}</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {t(`audit.action.${action}`) || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger data-testid="select-actor-filter">
                  <SelectValue placeholder={t('audit.filterByActor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.allActors')}</SelectItem>
                  {uniqueActors.map(actor => (
                    <SelectItem key={actor} value={actor}>
                      {actor === 'System' ? t('audit.system') : actor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Select value={targetFilter} onValueChange={setTargetFilter}>
                <SelectTrigger data-testid="select-target-filter">
                  <SelectValue placeholder={t('audit.filterByTarget')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audit.allTargets')}</SelectItem>
                  {uniqueTargets.map(target => (
                    <SelectItem key={target} value={target!}>
                      {t(`audit.target.${target}`) || target}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                {t('audit.clearFilters')}
              </Button>
            )}
          </div>

          {/* Logs Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('audit.noLogs')}</h3>
              <p className="text-muted-foreground">{t('audit.noLogsDesc')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('audit.timestamp')}</TableHead>
                    <TableHead>{t('audit.actor')}</TableHead>
                    <TableHead>{t('audit.action')}</TableHead>
                    <TableHead>{t('audit.target')}</TableHead>
                    <TableHead>{t('audit.details')}</TableHead>
                    <TableHead>{t('audit.ipAddress')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {log.actor ? (
                          <div>
                            <div className="font-medium">{log.actor.fullName}</div>
                            <div className="text-xs text-muted-foreground">{log.actor.email}</div>
                          </div>
                        ) : (
                          <Badge variant="outline">{t('audit.system')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.actionType)}>
                          {t(`audit.action.${log.actionType}`) || log.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.targetType ? (
                          <div>
                            <div className="font-medium">
                              {t(`audit.target.${log.targetType}`) || log.targetType}
                            </div>
                            {log.targetId && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {log.targetId.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {log.details ? (
                          <div className="text-xs text-muted-foreground truncate" title={log.details}>
                            {log.details}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ipAddress || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Results Count */}
          {!isLoading && filteredLogs.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'record' : 'records'}
              {hasActiveFilters && ` (${logs.length} total)`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
