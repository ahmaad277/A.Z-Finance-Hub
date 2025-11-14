import { useState, useRef } from "react";
import { useLanguage } from "@/lib/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import * as XLSX from 'xlsx';

interface ParsedInvestment {
  id: string;
  name: string;
  platformId: string | null;
  faceValue: number;
  totalExpectedProfit: number;
  expectedIrr: number;
  riskScore: number;
  startDate: string;
  endDate: string;
  durationMonths: number;
  distributionFrequency: string;
  profitPaymentStructure: string;
  status: string;
  isReinvestment: number;
  fundedFromCash: number;
  warnings: string[];
  errors: string[];
}

export default function BulkImport() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvestment[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [defaultPlatformId, setDefaultPlatformId] = useState<string | null>(null);

  // Fetch platforms
  const { data: platforms = [] } = useQuery<any[]>({
    queryKey: ['/api/platforms'],
  });

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (investments: any[]) => {
      const response = await apiRequest('POST', '/api/investments/bulk', { investments });
      return await response.json();
    },
    onSuccess: (result: any) => {
      const { created, errors } = result;
      
      toast({
        title: "Import Complete",
        description: `${created.length} ${t("bulkImport.successCount")}${errors.length > 0 ? `. ${errors.length} failed.` : ''}`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cashflows'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });

      // Navigate to investments page
      setLocation('/investments');
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: t("bulkImport.parseError"),
        description: t("bulkImport.supportedFormats"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("bulkImport.parseError"),
        description: t("bulkImport.maxFileSize"),
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);

    try {
      const data = await parseExcelFile(file);
      setParsedData(data);
      
      // Auto-select only rows with no errors
      const validIds = data.filter(d => d.errors.length === 0).map(d => d.id);
      setSelectedRows(new Set(validIds));

      toast({
        title: t("bulkImport.fileSelected"),
        description: `${data.length} ${t("investments.title").toLowerCase()} found`,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: t("bulkImport.parseError"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseExcelFile = async (file: File): Promise<ParsedInvestment[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false });

          if (jsonData.length === 0) {
            reject(new Error(t("bulkImport.noDataFound")));
            return;
          }

          const parsedInvestments: ParsedInvestment[] = jsonData.map((row: any, index) => {
            return parseRowData(row, index);
          });

          resolve(parsedInvestments);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Normalize column names for robust matching
  const normalizeColumnName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
      .replace(/\u0640/g, '') // Remove Arabic tatweel
      .replace(/[%_\-\s]+/g, '_') // Replace special chars and spaces with underscore
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  // Smart column mapping - supports multiple column name variations with normalization
  const findColumnValue = (row: any, possibleNames: string[]): string | null => {
    // Create normalized lookup map
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalizedRow[normalizedKey] = row[key];
    });

    // Try to find value using normalized names
    for (const name of possibleNames) {
      const normalizedName = normalizeColumnName(name);
      const value = normalizedRow[normalizedName];
      if (value !== undefined && value !== null && value !== '') {
        return String(value).trim();
      }
    }
    return null; // Return null if not found (distinguish from empty string)
  };

  const parseRowData = (row: any, index: number): ParsedInvestment => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const id = `temp-${index}`;

    // Smart column extraction with multiple name variants
    const name = findColumnValue(row, [
      'Name', 'اسم الفرصة', 'Investment Name', 'الاسم', 'اسم', 'الفرصة',
      'name', 'investment_name', 'opportunity_name'
    ]) || '';
    
    const faceValueStr = findColumnValue(row, [
      'Face Value', 'القيمة الاسمية', 'Amount', 'Principal', 'المبلغ', 'رأس المال',
      'face_value', 'principal_amount', 'amount', 'value'
    ]);
    const faceValue = faceValueStr ? parseFloat(faceValueStr.replace(/[,\s]/g, '')) : null;
    
    const irrStr = findColumnValue(row, [
      'IRR', 'Expected IRR', 'معدل العائد', 'IRR%', 'Return', 'العائد',
      'expected_irr', 'return_rate', 'irr_percent'
    ]);
    const expectedIrr = irrStr ? parseFloat(irrStr.replace(/[%\s]/g, '')) : null;
    
    const profitStr = findColumnValue(row, [
      'Profit', 'Expected Profit', 'Total Profit', 'الأرباح', 'الأرباح المتوقعة',
      'profit', 'expected_profit', 'total_profit', 'returns'
    ]);
    const totalExpectedProfit = profitStr ? parseFloat(profitStr.replace(/[,\s]/g, '')) : 0;
    
    const startDate = findColumnValue(row, [
      'Start Date', 'تاريخ البداية', 'Begin Date', 'تاريخ البدء', 'تاريخ الاستثمار',
      'start_date', 'begin_date', 'investment_date'
    ]) || '';
    
    const endDate = findColumnValue(row, [
      'End Date', 'تاريخ النهاية', 'Maturity Date', 'تاريخ الاستحقاق', 'تاريخ الانتهاء',
      'end_date', 'maturity_date', 'expiry_date'
    ]) || '';
    
    const durationStr = findColumnValue(row, [
      'Duration', 'المدة', 'Months', 'Term', 'الأشهر', 'مدة الاستثمار',
      'duration', 'months', 'term', 'period'
    ]);
    const duration = durationStr ? parseInt(durationStr.replace(/[^\d]/g, '')) : 0;

    // Validation: Required fields
    if (!name) {
      warnings.push(t("bulkImport.missingField") + ": Name");
    }
    
    if (faceValue === null || faceValue <= 0) {
      errors.push(t("bulkImport.required") + ": Face Value (must be > 0)");
    }
    
    if (expectedIrr === null) {
      errors.push(t("bulkImport.required") + ": IRR (required for risk calculation)");
    } else if (expectedIrr < 0 || expectedIrr > 100) {
      errors.push(t("bulkImport.invalidValue") + ": IRR (must be 0-100%)");
    }
    
    if (!startDate) {
      warnings.push(t("bulkImport.missingField") + ": Start Date");
    }
    if (!endDate && duration <= 0) {
      warnings.push(t("bulkImport.missingField") + ": End Date or Duration");
    }

    // Calculate risk score: (IRR / 30) × 100 (only if IRR is valid)
    const riskScore = expectedIrr !== null 
      ? Math.min(100, Math.round((expectedIrr / 30) * 100))
      : 0;

    return {
      id,
      name: name || `Investment ${index + 1}`,
      platformId: null, // Will be selected by user
      faceValue: faceValue ?? 0,
      totalExpectedProfit,
      expectedIrr: expectedIrr ?? 0,
      riskScore,
      startDate,
      endDate,
      durationMonths: duration,
      distributionFrequency: 'quarterly',
      profitPaymentStructure: 'periodic',
      status: warnings.length > 0 || errors.length > 0 ? 'pending' : 'active',
      isReinvestment: 0,
      fundedFromCash: 0,
      warnings,
      errors,
    };
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedData([]);
    setSelectedRows(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleSelectAll = () => {
    // Only toggle valid rows (no errors)
    const validIds = parsedData.filter(d => d.errors.length === 0).map(d => d.id);
    if (selectedRows.size === validIds.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(validIds));
    }
  };

  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const updateInvestment = (id: string, field: keyof ParsedInvestment, value: any) => {
    setParsedData(prev => prev.map(inv => 
      inv.id === id ? { ...inv, [field]: value } : inv
    ));
  };

  const handleBulkPlatformChange = (platformId: string) => {
    setDefaultPlatformId(platformId);
    setParsedData(prev => prev.map(inv => ({ ...inv, platformId })));
    
    toast({
      title: "Platform Selected",
      description: `All investments assigned to platform`,
    });
  };

  const handleSaveSelected = async () => {
    if (!defaultPlatformId) {
      toast({
        title: "Platform Required",
        description: "Please select a platform before saving",
        variant: "destructive",
      });
      return;
    }

    // Prepare investments for bulk creation - filter out invalid rows and rows without platformId
    const selectedInvestments = parsedData
      .filter(inv => selectedRows.has(inv.id) && inv.errors.length === 0 && inv.platformId !== null)
      .map(inv => ({
        name: inv.name,
        platformId: inv.platformId!,
        faceValue: inv.faceValue,
        totalExpectedProfit: inv.totalExpectedProfit,
        expectedIrr: inv.expectedIrr,
        riskScore: inv.riskScore,
        startDate: inv.startDate,
        endDate: inv.endDate || undefined,
        durationMonths: inv.durationMonths || undefined,
        distributionFrequency: inv.distributionFrequency,
        profitPaymentStructure: inv.profitPaymentStructure,
        status: inv.status,
        isReinvestment: inv.isReinvestment,
        fundedFromCash: inv.fundedFromCash,
      }));

    // Final validation: ensure all investments have platformId
    const invalidInvestments = selectedInvestments.filter(inv => !inv.platformId);
    if (invalidInvestments.length > 0) {
      toast({
        title: "Validation Error",
        description: "All investments must have a platform assigned",
        variant: "destructive",
      });
      return;
    }

    if (selectedInvestments.length === 0) {
      toast({
        title: "No Valid Investments",
        description: "Please select at least one valid investment with a platform assigned",
        variant: "destructive",
      });
      return;
    }

    bulkCreateMutation.mutate(selectedInvestments);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-title">{t("bulkImport.title")}</h1>
        <p className="text-muted-foreground mt-2" data-testid="text-subtitle">
          {t("bulkImport.subtitle")}
        </p>
      </div>

      {!selectedFile ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("bulkImport.dropzone")}</CardTitle>
            <CardDescription>
              {t("bulkImport.supportedFormats")} • {t("bulkImport.maxFileSize")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-all hover-elevate active-elevate-2
                ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
              `}
              data-testid="dropzone-upload"
            >
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">{t("bulkImport.dropzone")}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t("bulkImport.supportedFormats")}
              </p>
              <Button variant="outline" data-testid="button-browse">
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
                data-testid="input-file"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* File Info */}
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB • {parsedData.length} investments found
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  data-testid="button-upload-another"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("bulkImport.uploadAnother")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Platform Selector */}
          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Platform</CardTitle>
                <CardDescription>
                  Choose which platform these investments belong to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select 
                  value={defaultPlatformId ?? ''} 
                  onValueChange={handleBulkPlatformChange}
                >
                  <SelectTrigger className="w-full max-w-md" data-testid="select-platform">
                    <SelectValue placeholder="Select platform for all investments" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform: any) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  <Info className="inline w-3 h-3 mr-1" />
                  This will apply to all imported investments
                </p>
              </CardContent>
            </Card>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>{t("bulkImport.preview")}</CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {selectedRows.size} {t("bulkImport.selectedCount")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                      data-testid="button-toggle-select-all"
                    >
                      {selectedRows.size === parsedData.length
                        ? t("bulkImport.deselectAll")
                        : t("bulkImport.selectAll")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start p-2 font-medium w-12">
                          <input
                            type="checkbox"
                            checked={selectedRows.size === parsedData.length}
                            onChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </th>
                        <th className="text-start p-2 font-medium w-16"></th>
                        <th className="text-start p-2 font-medium">Name</th>
                        <th className="text-start p-2 font-medium">Face Value</th>
                        <th className="text-start p-2 font-medium">IRR %</th>
                        <th className="text-start p-2 font-medium">Risk</th>
                        <th className="text-start p-2 font-medium">Start</th>
                        <th className="text-start p-2 font-medium">End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((investment) => (
                        <tr
                          key={investment.id}
                          className="border-b hover-elevate"
                          data-testid={`row-investment-${investment.id}`}
                        >
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(investment.id)}
                              onChange={() => toggleRowSelection(investment.id)}
                              data-testid={`checkbox-row-${investment.id}`}
                              disabled={investment.errors.length > 0}
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              {investment.errors.length > 0 ? (
                                <Badge variant="destructive" className="text-xs px-1 py-0">
                                  Error
                                </Badge>
                              ) : investment.warnings.length > 0 ? (
                                <Badge variant="outline" className="text-xs px-1 py-0 border-warning text-warning">
                                  Warn
                                </Badge>
                              ) : (
                                <Check className="w-4 h-4 text-success" />
                              )}
                            </div>
                          </td>
                          <td className="p-2 font-medium max-w-[200px] truncate">
                            {investment.name}
                            {(investment.errors.length > 0 || investment.warnings.length > 0) && (
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                {investment.errors.map((err, i) => (
                                  <div key={i} className="text-destructive">{err}</div>
                                ))}
                                {investment.warnings.map((warn, i) => (
                                  <div key={i} className="text-warning">{warn}</div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2">{investment.faceValue.toLocaleString()} SAR</td>
                          <td className="p-2">{investment.expectedIrr.toFixed(1)}%</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {investment.riskScore}/100
                            </Badge>
                          </td>
                          <td className="p-2 text-xs">{investment.startDate || '—'}</td>
                          <td className="p-2 text-xs">{investment.endDate || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-between items-center flex-wrap gap-3">
                  <div className="text-sm text-muted-foreground">
                    <Info className="inline w-4 h-4 mr-1" />
                    {t("bulkImport.riskCalculated")}
                  </div>
                  <Button
                    size="lg"
                    disabled={selectedRows.size === 0 || !defaultPlatformId || bulkCreateMutation.isPending}
                    onClick={handleSaveSelected}
                    data-testid="button-save-selected"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {bulkCreateMutation.isPending 
                      ? t("bulkImport.saving") 
                      : `${t("bulkImport.saveSelected")} (${selectedRows.size})`
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
