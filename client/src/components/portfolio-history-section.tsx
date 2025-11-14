import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { format } from "date-fns";
import type { PortfolioHistory } from "@shared/schema";

export function PortfolioHistorySection({ currentPortfolioValue }: { currentPortfolioValue: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ value: string; notes: string }>({ value: "", notes: "" });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEntry, setNewEntry] = useState({ month: "", value: "", notes: "" });
  const { toast } = useToast();

  // Fetch portfolio history data
  const { data: historyData = [], isLoading } = useQuery<PortfolioHistory[]>({
    queryKey: ['/api/portfolio-history'],
    refetchOnMount: true,
  });

  // Upsert mutation (handles both create and update)
  const upsertMutation = useMutation({
    mutationFn: async (entry: { month: Date; totalValue: number; notes?: string; isUpdate?: boolean }) => {
      // Use PUT for updates, POST for new entries
      const method = entry.isUpdate ? 'PUT' : 'POST';
      return apiRequest(method, '/api/portfolio-history', {
        month: entry.month,
        totalValue: entry.totalValue,
        notes: entry.notes || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio-history'] });
      toast({
        title: "Success",
        description: "Portfolio history updated successfully",
      });
      setIsAddingNew(false);
      setEditingId(null);
      setNewEntry({ month: "", value: "", notes: "" });
      setEditingValues({ value: "", notes: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update portfolio history",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/portfolio-history/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio-history'] });
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  // Prepare data for chart
  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    // Sort by month and format for chart
    const sortedData = [...historyData].sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );

    return sortedData.map((entry, index) => {
      const prevValue = index > 0 ? parseFloat(sortedData[index - 1].totalValue) : parseFloat(entry.totalValue);
      const currentValue = parseFloat(entry.totalValue);
      const change = currentValue - prevValue;
      const changePercent = prevValue ? ((change / prevValue) * 100) : 0;

      return {
        month: format(new Date(entry.month), 'MMM yyyy'),
        value: currentValue,
        change: change,
        changePercent: changePercent,
        source: entry.source,
      };
    });
  }, [historyData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const values = chartData.map(d => d.value);
    const lastValue = values[values.length - 1];
    const firstValue = values[0];
    const totalGrowth = lastValue - firstValue;
    const growthPercent = firstValue ? ((totalGrowth / firstValue) * 100) : 0;
    const avgMonthlyGrowth = chartData.length > 1 ? totalGrowth / (chartData.length - 1) : 0;

    return {
      currentValue: lastValue,
      totalGrowth,
      growthPercent,
      avgMonthlyGrowth,
      monthsTracked: chartData.length,
    };
  }, [chartData]);

  const handleSaveEdit = (entry: PortfolioHistory) => {
    const firstDayOfMonth = new Date(entry.month);
    firstDayOfMonth.setDate(1);
    
    upsertMutation.mutate({
      month: firstDayOfMonth,
      totalValue: parseFloat(editingValues.value),
      notes: editingValues.notes,
      isUpdate: true, // This is an update of an existing entry
    });
  };

  const handleAddNew = () => {
    if (!newEntry.month || !newEntry.value) {
      toast({
        title: "Error",
        description: "Please fill in month and value",
        variant: "destructive",
      });
      return;
    }

    const date = new Date(newEntry.month + "-01");
    if (isNaN(date.getTime())) {
      toast({
        title: "Error",
        description: "Invalid month format. Use YYYY-MM",
        variant: "destructive",
      });
      return;
    }

    upsertMutation.mutate({
      month: date,
      totalValue: parseFloat(newEntry.value),
      notes: newEntry.notes,
      isUpdate: false, // This is a new entry
    });
  };

  const handleAddCurrentMonth = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    upsertMutation.mutate({
      month: firstDayOfMonth,
      totalValue: currentPortfolioValue,
      notes: "Auto-filled from current portfolio value",
      isUpdate: false, // Could be either, but we'll let the backend handle it
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle data-testid="text-portfolio-history-title">📈 Portfolio History Tracker</CardTitle>
                <CardDescription data-testid="text-portfolio-history-description">
                  Track and visualize your portfolio value over time
                </CardDescription>
                {stats && (
                  <div className="flex gap-4 mt-2">
                    <Badge variant="outline" data-testid="badge-months-tracked">
                      {stats.monthsTracked} months
                    </Badge>
                    <Badge 
                      variant={stats.growthPercent > 0 ? "default" : "secondary"}
                      data-testid="badge-total-growth"
                    >
                      {stats.growthPercent > 0 ? "+" : ""}{stats.growthPercent.toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Chart */}
            {chartData.length > 0 && (
              <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === "Portfolio Value") return formatCurrency(value);
                        if (name === "Monthly Change") return formatCurrency(value);
                        return value;
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="value"
                      fill="hsl(var(--primary) / 0.2)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Portfolio Value"
                    />
                    <Line
                      type="monotone"
                      dataKey="change"
                      stroke="hsl(var(--success))"
                      strokeWidth={1.5}
                      name="Monthly Change"
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleAddCurrentMonth}
                variant="default"
                size="sm"
                data-testid="button-add-current-month"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Current Month ({formatCurrency(currentPortfolioValue)})
              </Button>
              <Button
                onClick={() => setIsAddingNew(true)}
                variant="outline"
                size="sm"
                disabled={isAddingNew}
                data-testid="button-add-custom-month"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Custom Month
              </Button>
            </div>

            {/* Data Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Portfolio Value</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Add new entry row */}
                  {isAddingNew && (
                    <TableRow>
                      <TableCell>
                        <Input
                          type="month"
                          value={newEntry.month}
                          onChange={(e) => setNewEntry({ ...newEntry, month: e.target.value })}
                          placeholder="YYYY-MM"
                          className="w-32"
                          data-testid="input-new-month"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={newEntry.value}
                          onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                          placeholder="Value"
                          className="w-32"
                          data-testid="input-new-value"
                        />
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <Input
                          value={newEntry.notes}
                          onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                          placeholder="Notes (optional)"
                          className="w-full"
                          data-testid="input-new-notes"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">manual</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleAddNew}
                            disabled={upsertMutation.isPending}
                            data-testid="button-save-new"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setIsAddingNew(false);
                              setNewEntry({ month: "", value: "", notes: "" });
                            }}
                            data-testid="button-cancel-new"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Existing entries */}
                  {historyData
                    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
                    .map((entry, index) => {
                      const isEditing = editingId === entry.id;
                      const prevEntry = historyData[index + 1];
                      const change = prevEntry 
                        ? parseFloat(entry.totalValue) - parseFloat(prevEntry.totalValue)
                        : 0;
                      const changePercent = prevEntry && parseFloat(prevEntry.totalValue) > 0
                        ? (change / parseFloat(prevEntry.totalValue)) * 100
                        : 0;

                      return (
                        <TableRow key={entry.id} data-testid={`row-history-${entry.id}`}>
                          <TableCell className="font-medium">
                            {format(new Date(entry.month), 'MMMM yyyy')}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editingValues.value}
                                onChange={(e) => setEditingValues({ ...editingValues, value: e.target.value })}
                                className="w-32"
                                data-testid={`input-edit-value-${entry.id}`}
                              />
                            ) : (
                              <span className="font-semibold">{formatCurrency(parseFloat(entry.totalValue))}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {prevEntry && (
                              <div className="flex items-center gap-1">
                                <span className={change >= 0 ? "text-success" : "text-destructive"}>
                                  {change >= 0 ? "+" : ""}{formatCurrency(change)}
                                </span>
                                <Badge 
                                  variant={change >= 0 ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Textarea
                                value={editingValues.notes}
                                onChange={(e) => setEditingValues({ ...editingValues, notes: e.target.value })}
                                className="w-full min-h-[60px]"
                                placeholder="Notes (optional)"
                                data-testid={`input-edit-notes-${entry.id}`}
                              />
                            ) : (
                              <span className="text-sm text-muted-foreground">{entry.notes || "-"}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.source}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleSaveEdit(entry)}
                                  disabled={upsertMutation.isPending}
                                  data-testid={`button-save-edit-${entry.id}`}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingValues({ value: "", notes: "" });
                                  }}
                                  data-testid={`button-cancel-edit-${entry.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingId(entry.id);
                                    setEditingValues({
                                      value: entry.totalValue,
                                      notes: entry.notes || "",
                                    });
                                  }}
                                  data-testid={`button-edit-${entry.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(entry.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${entry.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  
                  {historyData.length === 0 && !isAddingNew && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No portfolio history data yet. Click "Add Current Month" to start tracking!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary Statistics */}
            {stats && chartData.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Latest Value</p>
                      <p className="text-xl font-bold">{formatCurrency(stats.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Growth</p>
                      <p className="text-xl font-bold text-success">
                        {stats.totalGrowth >= 0 ? "+" : ""}{formatCurrency(stats.totalGrowth)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Growth Rate</p>
                      <p className="text-xl font-bold">
                        {stats.growthPercent >= 0 ? "+" : ""}{stats.growthPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Monthly</p>
                      <p className="text-xl font-bold">
                        {stats.avgMonthlyGrowth >= 0 ? "+" : ""}{formatCurrency(stats.avgMonthlyGrowth)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}