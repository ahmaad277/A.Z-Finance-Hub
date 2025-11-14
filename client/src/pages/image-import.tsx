import { useState, useRef } from "react";
import { useLanguage } from "@/lib/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, X, Check, Info, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

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

export default function ImageImport() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvestment[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [defaultPlatformId, setDefaultPlatformId] = useState<string | null>(null);

  // Fetch platforms
  const { data: platforms = [] } = useQuery<any[]>({
    queryKey: ['/api/platforms'],
  });

  // Bulk create mutation (reuse from bulk-import)
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
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: t("imageImport.extractionError"),
        description: t("imageImport.supportedFormats"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t("imageImport.extractionError"),
        description: t("imageImport.maxFileSize"),
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);

    // Extract data from image
    await extractDataFromImage(file);
  };

  const extractDataFromImage = async (file: File) => {
    setIsExtracting(true);

    try {
      // Create FormData to send image to backend
      const formData = new FormData();
      formData.append('image', file);

      // Call backend API to extract data using OpenAI Vision
      const response = await fetch('/api/investments/extract-from-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to extract data from image');
      }

      const result = await response.json();
      
      // Process extracted investments
      const extractedInvestments: ParsedInvestment[] = (result.investments || []).map((inv: any, index: number) => {
        const warnings: string[] = inv.warnings || [];
        const errors: string[] = [];

        // Validation
        if (!inv.name) {
          warnings.push(t("bulkImport.missingField") + ": Name");
        }
        if (!inv.faceValue || inv.faceValue <= 0) {
          errors.push(t("bulkImport.required") + ": Face Value (must be > 0)");
        }
        if (!inv.expectedIrr && inv.expectedIrr !== 0) {
          errors.push(t("bulkImport.required") + ": IRR");
        } else if (inv.expectedIrr < 0 || inv.expectedIrr > 100) {
          errors.push(t("bulkImport.invalidValue") + ": IRR (must be 0-100%)");
        }

        // Calculate risk score
        const riskScore = inv.expectedIrr !== null && inv.expectedIrr !== undefined
          ? Math.min(100, Math.round((inv.expectedIrr / 30) * 100))
          : 0;

        return {
          id: `temp-${index}`,
          name: inv.name || `Investment ${index + 1}`,
          platformId: null,
          faceValue: inv.faceValue || 0,
          totalExpectedProfit: inv.totalExpectedProfit || 0,
          expectedIrr: inv.expectedIrr || 0,
          riskScore,
          startDate: inv.startDate || '',
          endDate: inv.endDate || '',
          durationMonths: inv.durationMonths || 0,
          distributionFrequency: inv.distributionFrequency || 'quarterly',
          profitPaymentStructure: inv.profitPaymentStructure || 'periodic',
          status: 'pending',
          isReinvestment: 0,
          fundedFromCash: 0,
          warnings,
          errors,
        };
      });

      setParsedData(extractedInvestments);

      // Auto-select only valid rows
      const validIds = extractedInvestments.filter(d => d.errors.length === 0).map(d => d.id);
      setSelectedRows(new Set(validIds));

      toast({
        title: t("imageImport.fileSelected"),
        description: `${extractedInvestments.length} ${t("investments.title").toLowerCase()} extracted`,
      });

      // Show warnings from AI extraction if any
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning: string) => {
          toast({
            title: "Extraction Warning",
            description: warning,
            variant: "default",
          });
        });
      }
    } catch (error) {
      console.error('Error extracting data from image:', error);
      toast({
        title: t("imageImport.extractionError"),
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      
      // Clean up on error
      setSelectedFile(null);
      setImagePreviewUrl(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setParsedData([]);
    setSelectedRows(new Set());
    setDefaultPlatformId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
  };

  const toggleSelectAll = () => {
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

  const handleBulkPlatformChange = (platformId: string) => {
    setDefaultPlatformId(platformId);
    setParsedData(prev => prev.map(inv => ({ ...inv, platformId })));
    
    toast({
      title: "Platform Selected",
      description: `All investments assigned to platform`,
    });
  };

  const handleSaveSelected = async () => {
    // Prepare investments for bulk creation
    const selectedInvestments = parsedData
      .filter(inv => selectedRows.has(inv.id) && inv.errors.length === 0)
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

    // Validation: ensure all selected investments have platformId
    const invalidInvestments = selectedInvestments.filter(inv => !inv.platformId);
    if (invalidInvestments.length > 0) {
      toast({
        title: "Platform Required",
        description: `${invalidInvestments.length} investment(s) missing platform. Please select a platform.`,
        variant: "destructive",
      });
      return;
    }

    if (selectedInvestments.length === 0) {
      toast({
        title: "No Valid Investments",
        description: "Please select at least one valid investment",
        variant: "destructive",
      });
      return;
    }

    bulkCreateMutation.mutate(selectedInvestments);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-title">{t("imageImport.title")}</h1>
        <p className="text-muted-foreground mt-2" data-testid="text-subtitle">
          {t("imageImport.subtitle")}
        </p>
      </div>

      {!selectedFile ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("imageImport.dropzone")}</CardTitle>
            <CardDescription>
              {t("imageImport.supportedFormats")} • {t("imageImport.maxFileSize")}
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
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">{t("imageImport.dropzone")}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t("imageImport.supportedFormats")}
              </p>
              <Button variant="outline" data-testid="button-browse">
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
                data-testid="input-file"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>{t("imageImport.preview")}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  data-testid="button-upload-another"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("imageImport.uploadAnother")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                {/* Image */}
                <div className="flex-shrink-0">
                  {imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="max-w-full md:max-w-md max-h-96 rounded-lg border object-contain"
                      data-testid="img-preview"
                    />
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1">
                  <div className="space-y-2">
                    <p className="font-medium" data-testid="text-filename">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    
                    {isExtracting && (
                      <div className="flex items-center gap-2 text-primary mt-4" data-testid="status-extracting">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <div>
                          <p className="font-medium">{t("imageImport.analyzing")}</p>
                          <p className="text-sm text-muted-foreground">{t("imageImport.pleaseWait")}</p>
                        </div>
                      </div>
                    )}
                    
                    {!isExtracting && parsedData.length > 0 && (
                      <div className="flex items-center gap-2 text-success mt-4" data-testid="status-extracted">
                        <Check className="w-5 h-5" />
                        <p className="font-medium">
                          {parsedData.length} {t("imageImport.extracted")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Selector */}
          {parsedData.length > 0 && !isExtracting && (
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
                  This will apply to all extracted investments
                </p>
              </CardContent>
            </Card>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && !isExtracting && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>{t("bulkImport.preview")}</CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground" data-testid="text-selected-count">
                      {selectedRows.size} {t("bulkImport.selectedCount")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                      data-testid="button-toggle-select-all"
                    >
                      {selectedRows.size === parsedData.filter(d => d.errors.length === 0).length
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
                            checked={selectedRows.size === parsedData.filter(d => d.errors.length === 0).length && parsedData.length > 0}
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
                                  <div key={i} className="text-destructive" data-testid={`error-${investment.id}-${i}`}>{err}</div>
                                ))}
                                {investment.warnings.map((warn, i) => (
                                  <div key={i} className="text-warning" data-testid={`warning-${investment.id}-${i}`}>{warn}</div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2" data-testid={`faceValue-${investment.id}`}>{investment.faceValue.toLocaleString()} SAR</td>
                          <td className="p-2" data-testid={`irr-${investment.id}`}>{investment.expectedIrr.toFixed(1)}%</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs" data-testid={`risk-${investment.id}`}>
                              {investment.riskScore}/100
                            </Badge>
                          </td>
                          <td className="p-2 text-xs" data-testid={`startDate-${investment.id}`}>{investment.startDate || '—'}</td>
                          <td className="p-2 text-xs" data-testid={`endDate-${investment.id}`}>{investment.endDate || '—'}</td>
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
                    {bulkCreateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("bulkImport.saving")}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {`${t("bulkImport.saveSelected")} (${selectedRows.size})`}
                      </>
                    )}
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
