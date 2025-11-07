import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileDown, Download, Check, X, Clock, Shield, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ExportRequest {
  id: string;
  requesterId: string;
  exportType: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  requester?: {
    id: string;
    email: string;
    name: string;
  };
  approver?: {
    id: string;
    email: string;
    name: string;
  };
}

const exportRequestSchema = z.object({
  exportType: z.enum(['investments', 'cashflows', 'full_portfolio', 'analytics']),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
});

type ExportRequestForm = z.infer<typeof exportRequestSchema>;

const rejectSchema = z.object({
  rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters").max(500),
});

type RejectForm = z.infer<typeof rejectSchema>;

export default function ExportRequests() {
  const { t, language } = useLanguage();
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<ExportRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<ExportRequest | null>(null);

  const canRequest = hasPermission('requests:export');
  const canApprove = hasPermission('requests:approve_exports');

  // Fetch all export requests
  const { data: allRequests = [], isLoading, refetch } = useQuery<ExportRequest[]>({
    queryKey: ['/api/v2/export-requests'],
    enabled: canRequest || canApprove,
  });

  // Fetch pending requests (for approvers)
  const { data: pendingRequests = [] } = useQuery<ExportRequest[]>({
    queryKey: ['/api/v2/export-requests/pending'],
    enabled: canApprove,
  });

  // Form for creating request
  const createForm = useForm<ExportRequestForm>({
    resolver: zodResolver(exportRequestSchema),
    defaultValues: {
      exportType: 'investments',
      reason: '',
    },
  });

  // Form for rejection
  const rejectForm = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      rejectionReason: '',
    },
  });

  // Create export request mutation
  const createMutation = useMutation({
    mutationFn: async (data: ExportRequestForm) => {
      return await apiRequest('/api/v2/export-requests', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/export-requests'] });
      toast({
        title: t("success"),
        description: "Export request created successfully",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || "Failed to create export request",
      });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest(`/api/v2/export-requests/${requestId}/approve`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/export-requests'] });
      toast({
        title: t("success"),
        description: "Export request approved",
      });
      setApprovingRequest(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || "Failed to approve request",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (data: { requestId: string; rejectionReason: string }) => {
      return await apiRequest(`/api/v2/export-requests/${data.requestId}/reject`, 'POST', {
        rejectionReason: data.rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/export-requests'] });
      toast({
        title: t("success"),
        description: "Export request rejected",
      });
      setRejectingRequest(null);
      rejectForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || "Failed to reject request",
      });
    },
  });

  const handleCreate = (data: ExportRequestForm) => {
    createMutation.mutate(data);
  };

  const handleApprove = (request: ExportRequest) => {
    approveMutation.mutate(request.id);
  };

  const handleReject = (data: RejectForm) => {
    if (rejectingRequest) {
      rejectMutation.mutate({
        requestId: rejectingRequest.id,
        rejectionReason: data.rejectionReason,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getExportTypeLabel = (type: string) => {
    switch (type) {
      case 'investments': return 'Investments';
      case 'cashflows': return 'Cashflows';
      case 'full_portfolio': return 'Full Portfolio';
      case 'analytics': return 'Analytics';
      default: return type;
    }
  };

  if (!canRequest && !canApprove) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="text-center">No Permission</CardTitle>
            <CardDescription className="text-center">
              You don't have permission to access export requests
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Export Requests</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          Manage data export approval workflow
        </p>
      </div>

      {/* Pending Requests (for approvers) */}
      {canApprove && pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Pending Approvals</CardTitle>
              </div>
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </div>
            <CardDescription>Requests waiting for your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Export Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.requester?.name || request.requester?.email || 'Unknown'}</TableCell>
                    <TableCell>{getExportTypeLabel(request.exportType)}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>{format(new Date(request.createdAt), 'PPp')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(request)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${request.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectingRequest(request)}
                          data-testid={`button-reject-${request.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-primary" />
              <CardTitle>All Export Requests</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {canRequest && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  data-testid="button-create-request"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Request Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : allRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No export requests yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Export Type</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getExportTypeLabel(request.exportType)}</TableCell>
                    <TableCell>{request.requester?.name || request.requester?.email || 'Unknown'}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>{format(new Date(request.createdAt), 'PPp')}</TableCell>
                    <TableCell>
                      {request.approvedAt ? (
                        <div className="text-sm">
                          <div>{format(new Date(request.approvedAt), 'PPp')}</div>
                          <div className="text-muted-foreground">
                            by {request.approver?.name || request.approver?.email || 'Unknown'}
                          </div>
                          {request.rejectionReason && (
                            <div className="text-destructive mt-1">
                              Reason: {request.rejectionReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Export Request Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Data Export</DialogTitle>
            <DialogDescription>
              Submit a request to export data. An administrator will review your request.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="exportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Export Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-export-type">
                          <SelectValue placeholder="Select export type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="investments">Investments</SelectItem>
                        <SelectItem value="cashflows">Cashflows</SelectItem>
                        <SelectItem value="full_portfolio">Full Portfolio</SelectItem>
                        <SelectItem value="analytics">Analytics</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Export</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why you need this export..."
                        {...field}
                        data-testid="input-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-request"
                >
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingRequest} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Export Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this export request.
            </DialogDescription>
          </DialogHeader>
          <Form {...rejectForm}>
            <form onSubmit={rejectForm.handleSubmit(handleReject)} className="space-y-4">
              <FormField
                control={rejectForm.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why this request is being rejected..."
                        {...field}
                        data-testid="input-rejection-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingRequest(null)}
                  data-testid="button-cancel-reject"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={rejectMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  Reject Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
