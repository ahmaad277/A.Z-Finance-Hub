import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, type User, type Role } from "@shared/schema";
import {
  UserPlus,
  Edit,
  Trash2,
  UserCog,
  Clock,
  Eye,
  Power,
  Shield,
  AlertTriangle,
} from "lucide-react";

// Form schema
const userFormSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UserManagement() {
  const { t, language } = useLanguage();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/v2/users"],
  });

  // Fetch roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/v2/roles"],
  });

  // Form
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      roleId: "",
      isActive: 1,
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest("/api/v2/users", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/users"] });
      toast({
        title: t("success"),
        description: t("userCreated"),
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("userCreationFailed"),
      });
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<UserFormData> }) => {
      return await apiRequest(`/api/v2/users/${data.id}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/users"] });
      toast({
        title: t("success"),
        description: t("userUpdated"),
      });
      setEditingUser(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("userUpdateFailed"),
      });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/v2/users/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/users"] });
      toast({
        title: t("success"),
        description: t("userDeleted"),
      });
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("userDeletionFailed"),
      });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async (data: { id: string; isActive: number }) => {
      return await apiRequest(`/api/v2/users/${data.id}`, "PATCH", { isActive: data.isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/users"] });
    },
  });

  // Start impersonation
  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("/api/v2/impersonation/start", "POST", { targetUserId: userId });
    },
    onSuccess: () => {
      toast({
        title: t("success"),
        description: t("impersonationStarted"),
      });
      // Refresh page to apply impersonation
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("impersonationFailed"),
      });
    },
  });

  const handleSubmit = (data: UserFormData) => {
    // Convert empty password to undefined for proper validation
    const submitData = {
      ...data,
      password: data.password?.trim() === "" ? undefined : data.password,
    };
    
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, updates: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      roleId: user.roleId,
      isActive: user.isActive,
      password: "", // Don't populate password
    });
  };

  const openAddDialog = () => {
    setEditingUser(null);
    form.reset({
      name: "",
      email: "",
      phone: "",
      password: "",
      roleId: "",
      isActive: 1,
    });
    setIsAddDialogOpen(true);
  };

  const getRoleBadgeVariant = (roleName: string) => {
    if (!roleName) return "outline";
    const lower = roleName.toLowerCase();
    if (lower.includes("owner")) return "default";
    if (lower.includes("admin")) return "destructive";
    if (lower.includes("analyst")) return "secondary";
    return "outline";
  };

  if (!hasPermission("VIEW_USERS")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t("accessDenied")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("noPermissionToViewUsers")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {t("userManagement")}
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            {t("manageUsersAndRoles")}
          </p>
        </div>
        {hasPermission("CREATE_USERS") && (
          <Button onClick={openAddDialog} data-testid="button-add-user">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("addUser")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("allUsers")}</CardTitle>
          <CardDescription>
            {t("totalUsers")}: {users.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noUsersFound")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const userRole = roles.find((r) => r.id === user.roleId);
                  const isUserActive = user.isActive === 1;
                  return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${user.id}`}>
                        {user.name}
                      </TableCell>
                      <TableCell data-testid={`text-email-${user.id}`}>
                        {user.email}
                      </TableCell>
                      <TableCell data-testid={`text-phone-${user.id}`}>
                        {user.phone || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(userRole?.displayName || "")} data-testid={`badge-role-${user.id}`}>
                          {language === "ar" ? userRole?.displayNameAr : userRole?.displayName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasPermission("EDIT_USERS") ? (
                          <Switch
                            checked={isUserActive}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: user.id, isActive: checked ? 1 : 0 })
                            }
                            data-testid={`switch-active-${user.id}`}
                          />
                        ) : (
                          <Badge variant={isUserActive ? "default" : "secondary"}>
                            {isUserActive ? t("active") : t("inactive")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission("IMPERSONATE") && isUserActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => impersonateMutation.mutate(user.id)}
                              data-testid={`button-impersonate-${user.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("EDIT_USERS") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(user)}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("DELETE_USERS") && !userRole?.name?.toLowerCase().includes("owner") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingUser(user)}
                              data-testid={`button-delete-${user.id}`}
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

      {/* Add/Edit User Dialog */}
      <Dialog open={isAddDialogOpen || editingUser !== null} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingUser(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingUser ? t("editUser") : t("addUser")}
            </DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              {editingUser ? t("editUserDescription") : t("addUserDescription")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value || ""} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUser ? t("newPassword") : t("password")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} value={field.value || ""} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("role")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder={t("selectRole")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {language === "ar" ? role.displayNameAr : role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("activeStatus")}</FormLabel>
                      <div className="text-sm text-muted-foreground">{t("activeStatusDescription")}</div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                        data-testid="switch-user-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingUser(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {createMutation.isPending || updateMutation.isPending ? t("saving") : t("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingUser !== null} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-delete-title">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("confirmDelete")}
            </DialogTitle>
            <DialogDescription data-testid="text-delete-description">
              {t("deleteUserConfirmation")} {deletingUser?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingUser(null)}
              data-testid="button-cancel-delete"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
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
