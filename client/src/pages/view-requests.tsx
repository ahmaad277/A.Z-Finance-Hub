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
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Check, X, Clock, Shield, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ViewRequest {
  id: string;
  requesterId: string;
  fieldType: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt?: string;
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

const viewRequestSchema = z.object({
  dataType: z.enum(['investment_amounts', 'cashflow_amounts', 'portfolio_totals']),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
  duration: z.number().min(1).max(24),
});

type ViewRequestForm = z.infer<typeof viewRequestSchema>;

const approveSchema = z.object({
  grantedDuration: z.number().min(1).max(24),
});

type ApproveForm = z.infer<typeof approveSchema>;

const rejectSchema = z.object({
  rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters").max(500),
});

type RejectForm = z.infer<typeof rejectSchema>;

export default function ViewRequests() {
  const { t, language } = useLanguage();
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<ViewRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<ViewRequest | null>(null);

  const canRequest = hasPermission('requests:view');
  const canApprove = hasPermission('requests:approve_view');

  // Fetch all view requests
  const { data: allRequests = [], isLoading, refetch } = useQuery<ViewRequest[]>({
    queryKey: ['/api/v2/view-requests'],
    enabled: canRequest || canApprove,
  });

  // Fetch pending requests (for approvers)
  const { data: pendingRequests = [] } = useQuery<ViewRequest[]>({
    queryKey: ['/api/v2/view-requests/pending'],
    enabled: canApprove,
  });

  // Form for creating request
  const createForm = useForm<ViewRequestForm>({
    resolver: zodResolver(viewRequestSchema),
    defaultValues: {
      dataType: 'investment_amounts',
      reason: '',
      duration: 24,
    },
  });

  // Form for approval with duration
  const approveForm = useForm<ApproveForm>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      grantedDuration: 24,
    },
  });

  // Form for rejection
  const rejectForm = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      rejectionReason: '',
    },
  });

  // Create view request mutation
  const createMutation = useMutation({
    mutationFn: async (data: ViewRequestForm) => {
      return await apiRequest('/api/v2/view-requests', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/view-requests'] });
      toast({
        title: t("success"),
        description: "View request created successfully",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || "Failed to create view request",
      });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (data: { requestId: string; grantedDuration: number }) => {
      return await apiRequest(`/api/v2/view-requests/${data.requestId}/approve`, 'POST', {
        grantedDuration: data.grantedDuration,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/view-requests'] });
      toast({
        title: t("success"),
        description: "View request approved",
      });
      setApprovingRequest(null);
      approveForm.reset();
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
      return await apiRequest(`/api/v2/view-requests/${data.requestId}/reject`, 'POST', {
        rejectionReason: data.rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/view-requests'] });
      toast({
        title: t("success"),
        description: "View request rejected",
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

  const handleCreate = (data: ViewRequestForm) => {
    createMutation.mutate(data);
  };

  const handleApprove = (data: ApproveForm) => {
    if (approvingRequest) {
      approveMutation.mutate({
        requestId: approvingRequest.id,
        grantedDuration: data.grantedDuration,
      });
    }
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

  const getDataTypeLabel = (type: string) => {
    switch (type) {
      case 'investment_amounts': return 'Investment Amounts';
      case 'cashflow_amounts': return 'Cashflow Amounts';
      case 'portfolio_totals': return 'Portfolio Totals';
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
              You don't have permission to access view requests
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
        <h1 className="text-3xl font-bold" data-testid="text-page-title">View Requests</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          Manage temporary access to sensitive data
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
                  <TableHead>Data Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.requester?.name || request.requester?.email || 'Unknown'}</TableCell>
                    <TableCell>{getDataTypeLabel(request.fieldType)}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>{format(new Date(request.createdAt), 'PPp')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setApprovingRequest(request);
                            approveForm.setValue('grantedDuration', 24);
                          }}
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
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle>All View Requests</CardTitle>
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
                  <Eye className="h-4 w-4 mr-2" />
                  Request View Access
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : allRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No view requests yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getDataTypeLabel(request.fieldType)}</TableCell>
                    <TableCell>{request.requester?.name || request.requester?.email || 'Unknown'}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>{format(new Date(request.createdAt), 'PPp')}</TableCell>
                    <TableCell>
                      {request.expiresAt ? (
                        <span className={new Date(request.expiresAt) < new Date() ? 'text-muted-foreground' : 'text-primary'}>
                          {format(new Date(request.expiresAt), 'PPp')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.approvedAt ? (
                        <div className="text-sm">
                          <div>{format(new Date(request.approvedAt), 'PPp')}</div>
                          <div className="text-muted-foreground">
                            by {request.approver?.name || request.approver?.email || 'Unknown'}
                          </div>
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

      {/* Create View Request Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request View Access</DialogTitle>
            <DialogDescription>
              Request temporary access to sensitive data fields
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="dataType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-data-type">
                          <SelectValue placeholder="Select data type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="investment_amounts">Investment Amounts</SelectItem>
                        <SelectItem value="cashflow_amounts">Cashflow Amounts</SelectItem>
                        <SelectItem value="portfolio_totals">Portfolio Totals</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Access</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why you need access to this data..."
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

      {/* Approve Dialog */}
      <Dialog open={!!approvingRequest} onOpenChange={(open) => !open && setApprovingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve View Request</DialogTitle>
            <DialogDescription>
              Grant temporary access to sensitive data
            </DialogDescription>
          </DialogHeader>
          <Form {...approveForm}>
            <form onSubmit={approveForm.handleSubmit(handleApprove)} className="space-y-4">
              <FormField
                control={approveForm.control}
                name="grantedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grant Duration (hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-granted-duration"
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
                  onClick={() => setApprovingRequest(null)}
                  data-testid="button-cancel-approve"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={approveMutation.isPending}
                  data-testid="button-confirm-approve"
                >
                  Approve Request
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
            <DialogTitle>Reject View Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this view request.
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
