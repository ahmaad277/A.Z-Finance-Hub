import { AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';

export const PERMISSION_KEYS = {
  // System Management
  MANAGE_USERS: 'system:manage_users',
  MANAGE_ROLES: 'system:manage_roles',
  VIEW_AUDIT_LOG: 'system:view_audit_log',
  EXPORT_AUDIT_LOG: 'system:export_audit_log',
  MANAGE_PLATFORMS: 'system:manage_platforms',

  // Data Access
  VIEW_ALL_DATA: 'data:view_all',
  VIEW_ABSOLUTE_AMOUNTS: 'data:view_absolute_amounts',
  VIEW_PERCENTAGES: 'data:view_percentages',
  VIEW_SENSITIVE: 'data:view_sensitive',

  // Investment Management
  CREATE_INVESTMENTS: 'investments:create',
  EDIT_INVESTMENTS: 'investments:edit',
  DELETE_INVESTMENTS: 'investments:delete',
  VIEW_INVESTMENTS: 'investments:view',

  // Cashflow Management
  MARK_CASHFLOW_RECEIVED: 'cashflows:mark_received',
  EDIT_CASHFLOWS: 'cashflows:edit',
  VIEW_CASHFLOWS: 'cashflows:view',

  // Cash Management
  MANAGE_CASH: 'cash:manage',
  VIEW_CASH: 'cash:view',

  // Analytics
  VIEW_ANALYTICS: 'analytics:view',
  EXPORT_DATA: 'analytics:export',

  // User Management
  VIEW_USERS: 'users:view',
  VIEW_USER_DETAILS: 'users:view_details',
  IMPERSONATE_USERS: 'users:impersonate',
  APPROVE_REQUESTS: 'users:approve_requests',
  ASSIGN_TEMP_ROLES: 'users:assign_temp_roles',

  // Export & View Requests
  REQUEST_EXPORT: 'requests:export',
  APPROVE_EXPORTS: 'requests:approve_exports',
  REQUEST_VIEW: 'requests:view',
  APPROVE_VIEW_REQUESTS: 'requests:approve_view',
  
  // Temporary Roles
  MANAGE_TEMPORARY_ROLES: 'roles:manage_temporary',
} as const;

export type PermissionKey = typeof PERMISSION_KEYS[keyof typeof PERMISSION_KEYS];

export function hasPermission(req: AuthenticatedRequest, permission: PermissionKey): boolean {
  return req.user?.permissions.includes(permission) || false;
}

export function hasAnyPermission(req: AuthenticatedRequest, permissions: PermissionKey[]): boolean {
  if (!req.user) return false;
  return permissions.some(p => req.user!.permissions.includes(p));
}

export function hasAllPermissions(req: AuthenticatedRequest, permissions: PermissionKey[]): boolean {
  if (!req.user) return false;
  return permissions.every(p => req.user!.permissions.includes(p));
}

export async function canAccessInvestment(
  req: AuthenticatedRequest,
  investmentId: string
): Promise<boolean> {
  if (!req.user) return false;

  // If user has VIEW_ALL_DATA permission, allow access
  if (hasPermission(req, PERMISSION_KEYS.VIEW_ALL_DATA)) {
    return true;
  }

  // Check if investment belongs to a platform the user has access to
  const investment = await storage.getInvestment(investmentId);
  if (!investment) return false;

  const userPlatforms = await storage.getUserPlatforms(req.user.effectiveUserId);
  const platformIds = userPlatforms.map(up => up.platformId);

  return platformIds.includes(investment.platformId);
}

export async function canAccessPlatform(
  req: AuthenticatedRequest,
  platformId: string
): Promise<boolean> {
  if (!req.user) return false;

  // If user has VIEW_ALL_DATA or MANAGE_PLATFORMS permission, allow access
  if (hasAnyPermission(req, [
    PERMISSION_KEYS.VIEW_ALL_DATA,
    PERMISSION_KEYS.MANAGE_PLATFORMS,
  ])) {
    return true;
  }

  // Check if platform is in user's assigned platforms
  const userPlatforms = await storage.getUserPlatforms(req.user.effectiveUserId);
  const platformIds = userPlatforms.map(up => up.platformId);

  return platformIds.includes(platformId);
}

export function isOwner(req: AuthenticatedRequest): boolean {
  return hasPermission(req, PERMISSION_KEYS.MANAGE_USERS);
}

export function isAdmin(req: AuthenticatedRequest): boolean {
  return hasPermission(req, PERMISSION_KEYS.MANAGE_ROLES);
}

export function canManageUser(req: AuthenticatedRequest, targetUserId: string): boolean {
  if (!req.user) return false;

  // Owners can manage anyone
  if (isOwner(req)) return true;

  // Users cannot manage themselves through user management routes
  if (req.user.effectiveUserId === targetUserId) return false;

  return false;
}

export function canImpersonate(req: AuthenticatedRequest): boolean {
  if (!req.user) return false;
  
  // Cannot impersonate if already impersonating
  if (req.user.isImpersonating) return false;

  return hasPermission(req, PERMISSION_KEYS.IMPERSONATE_USERS);
}

export function canApproveRequests(req: AuthenticatedRequest): boolean {
  return hasPermission(req, PERMISSION_KEYS.APPROVE_REQUESTS);
}

export function canExportData(req: AuthenticatedRequest): boolean {
  return hasPermission(req, PERMISSION_KEYS.EXPORT_DATA);
}

export function canViewAuditLog(req: AuthenticatedRequest): boolean {
  return hasPermission(req, PERMISSION_KEYS.VIEW_AUDIT_LOG);
}

export async function getEffectivePermissions(userId: string): Promise<PermissionKey[]> {
  const permissions = await storage.getUserPermissions(userId);
  return permissions.map(p => p.key as PermissionKey);
}

export function getPermissionsByCategory(permissions: PermissionKey[]): Record<string, PermissionKey[]> {
  const categories: Record<string, PermissionKey[]> = {};

  for (const permission of permissions) {
    const [category] = permission.split(':');
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(permission);
  }

  return categories;
}
