import { Request } from 'express';
import { storage } from '../storage';
import { AuthenticatedRequest } from '../middleware/auth';

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'login'
  | 'logout'
  | 'impersonate_start'
  | 'impersonate_end'
  | 'approve'
  | 'reject'
  | 'assign_permission'
  | 'revoke_permission'
  | 'assign_role'
  | 'suspend'
  | 'activate'
  | 'export_requested'
  | 'export_approved'
  | 'export_rejected'
  | 'view_requested'
  | 'view_approved'
  | 'view_rejected'
  | 'temporary_role_granted'
  | 'temporary_role_revoked'
  | 'temporary_role_extended';

export type AuditTarget = 
  | 'user'
  | 'role'
  | 'permission'
  | 'investment'
  | 'cashflow'
  | 'platform'
  | 'alert'
  | 'export_request'
  | 'view_request'
  | 'temporary_role'
  | 'settings'
  | 'cash_transaction';

export interface AuditLogParams {
  req: Request;
  action: AuditAction;
  targetType: AuditTarget;
  targetId?: string;
  details?: Record<string, any>;
}

export async function logAudit({
  req,
  action,
  targetType,
  targetId,
  details,
}: AuditLogParams): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    // CRITICAL: Use req.user.id (real session user), NOT effectiveUserId
    const actorId = authReq.user?.id || null;
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;

    // Enhance details with impersonation context if applicable
    const enrichedDetails = { ...details };
    if (authReq.user?.isImpersonating) {
      enrichedDetails.impersonatedAs = authReq.user.effectiveUserId;
      enrichedDetails.impersonatedUserName = authReq.user.impersonatedUserName;
    }

    await storage.logAudit({
      actorId, // Real user who performed the action
      actionType: action,
      targetType,
      targetId: targetId || null,
      details: enrichedDetails ? JSON.stringify(enrichedDetails) : null,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

export async function logUserAction(
  req: Request,
  action: AuditAction,
  userId: string,
  details?: Record<string, any>
): Promise<void> {
  return logAudit({
    req,
    action,
    targetType: 'user',
    targetId: userId,
    details,
  });
}

export async function logInvestmentAction(
  req: Request,
  action: AuditAction,
  investmentId: string,
  details?: Record<string, any>
): Promise<void> {
  return logAudit({
    req,
    action,
    targetType: 'investment',
    targetId: investmentId,
    details,
  });
}

export async function logCashflowAction(
  req: Request,
  action: AuditAction,
  cashflowId: string,
  details?: Record<string, any>
): Promise<void> {
  return logAudit({
    req,
    action,
    targetType: 'cashflow',
    targetId: cashflowId,
    details,
  });
}

export async function logExportRequest(
  req: Request,
  exportId: string,
  details?: Record<string, any>
): Promise<void> {
  return logAudit({
    req,
    action: 'create',
    targetType: 'export_request',
    targetId: exportId,
    details,
  });
}

export async function logViewRequest(
  req: Request,
  viewId: string,
  details?: Record<string, any>
): Promise<void> {
  return logAudit({
    req,
    action: 'create',
    targetType: 'view_request',
    targetId: viewId,
    details,
  });
}

export async function logImpersonation(
  req: Request,
  action: 'impersonate_start' | 'impersonate_end',
  targetUserId: string,
  details?: Record<string, any>
): Promise<void> {
  return logAudit({
    req,
    action,
    targetType: 'user',
    targetId: targetUserId,
    details,
  });
}
