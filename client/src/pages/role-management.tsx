import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language-provider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertRoleSchema, type Role, type User, type Permission } from "@shared/schema";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Extended Role type with permissions
type RoleWithPermissions = Role & {
  permissions?: Permission[];
};

// Form schema - extend insertRoleSchema with permissions array
const roleFormSchema = insertRoleSchema.extend({
  permissions: z.array(z.string()).optional(),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

// Permission categories for organized display
const PERMISSION_CATEGORIES = {
  user: [
    "USER_MANAGE",
    "USER_CREATE",
    "USER_EDIT",
    "USER_DELETE",
    "USER_VIEW_SENSITIVE",
  ],
  role: ["ROLE_MANAGE", "ROLE_CREATE", "ROLE_EDIT", "ROLE_DELETE"],
  investment: [
    "INVESTMENT_VIEW",
    "INVESTMENT_CREATE",
    "INVESTMENT_EDIT",
    "INVESTMENT_DELETE",
    "INVESTMENT_APPROVE",
  ],
  cashflow: [
    "CASHFLOW_VIEW",
    "CASHFLOW_CREATE",
    "CASHFLOW_EDIT",
    "CASHFLOW_DELETE",
  ],
  analytics: ["ANALYTICS_VIEW", "ANALYTICS_EXPORT"],
  audit: ["AUDIT_VIEW", "AUDIT_EXPORT"],
  platform: ["PLATFORM_MANAGE"],
  settings: ["SETTINGS_MANAGE"],
  advanced: [
    "IMPERSONATE",
    "APPROVE_EXPORTS",
    "APPROVE_VIEWS",
    "TEMPORARY_ROLE_ASSIGN",
    "FIELD_MASKING_OVERRIDE",
  ],
  alerts: ["ALERT_MANAGE"],
  data: ["DATA_EXPORT"],
};

export default function RoleManagement() {
  const { t, language } = useLanguage();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleWithPermissions | null>(null);

  // Fetch roles with permissions
  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleWithPermissions[]>({
    queryKey: ["/api/v2/roles"],
  });

  // Fetch users to count users per role
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/v2/users"],
  });

  // Form
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      displayNameAr: "",
      description: "",
      permissions: [] as string[],
    },
  });

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      return await apiRequest("/api/v2/roles", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/roles"] });
      toast({
        title: t("success"),
        description: t("roleCreated"),
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("roleCreationFailed"),
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<RoleFormData> }) => {
      return await apiRequest(`/api/v2/roles/${data.id}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/roles"] });
      toast({
        title: t("success"),
        description: t("roleUpdated"),
      });
      setEditingRole(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("roleUpdateFailed"),
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/v2/roles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/roles"] });
      toast({
        title: t("success"),
        description: t("roleDeleted"),
      });
      setDeletingRole(null);
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("roleDeletionFailed"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: RoleFormData) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, updates: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (role: RoleWithPermissions) => {
    setEditingRole(role);
    form.reset({
      name: role.name,
      displayName: role.displayName,
      displayNameAr: role.displayNameAr || "",
      description: role.description || "",
      permissions: role.permissions?.map(p => p.id) || [],
    });
  };

  const openAddDialog = () => {
    setEditingRole(null);
    form.reset({
      name: "",
      displayName: "",
      displayNameAr: "",
      description: "",
      permissions: [] as string[],
    });
    setIsAddDialogOpen(true);
  };

  const getUserCountForRole = (roleId: string) => {
    return users.filter((user) => user.roleId === roleId).length;
  };

  const isOwnerRole = (roleName: string) => {
    return roleName?.toLowerCase().includes("owner");
  };

  if (!hasPermission("ROLE_MANAGE")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("accessDenied")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("noPermissionToViewRoles")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
          <Shield className="h-8 w-8 text-primary" />
          {t("roleManagement")}
        </h1>
        <p className="text-muted-foreground mt-2" data-testid="text-page-description">
          {t("manageRolesAndPermissions")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalRoles")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-roles">
              {roles.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalPermissions")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">29</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("allRoles")}</CardTitle>
              <CardDescription>{t("viewAndManageSystemRoles")}</CardDescription>
            </div>
            {hasPermission("ROLE_CREATE") && (
              <Button onClick={openAddDialog} data-testid="button-add-role">
                <Plus className="h-4 w-4 mr-2" />
                {t("addRole")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noRolesFound")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("displayName")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead>{t("permissions")}</TableHead>
                  <TableHead>{t("users")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => {
                  const userCount = getUserCountForRole(role.id);
                  const permCount = role.permissions?.length || 0;
                  const rolePermIds = role.permissions?.map(p => p.id) || [];
                  return (
                    <TableRow key={role.id} data-testid={`row-role-${role.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${role.id}`}>
                        {role.name}
                      </TableCell>
                      <TableCell data-testid={`text-display-name-${role.id}`}>
                        {language === "ar" ? role.displayNameAr : role.displayName}
                      </TableCell>
                      <TableCell data-testid={`text-description-${role.id}`}>
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-permissions-${role.id}`}>
                          {permCount} {t("permissionsCount")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-users-${role.id}`}>
                          <Users className="h-3 w-3 mr-1" />
                          {userCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission("ROLE_EDIT") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(role)}
                              data-testid={`button-edit-${role.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("ROLE_DELETE") && !isOwnerRole(role.name) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingRole(role)}
                              data-testid={`button-delete-${role.id}`}
                              disabled={userCount > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingRole} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingRole(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingRole ? t("editRole") : t("addRole")}
            </DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              {editingRole ? t("editRoleDescription") : t("addRoleDescription")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("roleName")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("displayNameEnglish")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-display-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="displayNameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("displayNameArabic")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-display-name-ar" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("description")}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="permissions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t("permissions")}</FormLabel>
                        <div className="space-y-4">
                          {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                            <div key={category} className="space-y-2">
                              <h4 className="text-sm font-semibold capitalize">{t(`permissionCategory.${category}`)}</h4>
                              <div className="grid gap-2 pl-4">
                                {perms.map((perm) => (
                                  <div key={perm} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={field.value?.includes(perm) ?? false}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, perm]);
                                        } else {
                                          field.onChange(current.filter((p: string) => p !== perm));
                                        }
                                      }}
                                      data-testid={`checkbox-${perm}`}
                                    />
                                    <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                      {t(`permission.${perm}`)}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingRole(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending ? t("saving") : t("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-delete-title">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("confirmDelete")}
            </DialogTitle>
            <DialogDescription data-testid="text-delete-description">
              {t("deleteRoleConfirmation")} {deletingRole?.displayName}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingRole(null)}
              data-testid="button-cancel-delete"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingRole && deleteMutation.mutate(deletingRole.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
