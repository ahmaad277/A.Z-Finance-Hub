import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSION_KEYS } from '../helpers/permissions';
import { logAudit } from '../helpers/audit';

const router = Router();

// Grant temporary role (Admin/Owner only)
router.post('/', requireAuth, requirePermission(PERMISSION_KEYS.MANAGE_TEMPORARY_ROLES), async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      roleId: z.string().uuid(),
      reason: z.string().min(10).max(500),
      duration: z.number().min(1).max(168), // Max 1 week in hours
    });

    const data = schema.parse(req.body);

    // Verify user exists and is active
    const user = await storage.getUser(data.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(400).json({ error: 'Cannot grant role to inactive user' });
    }

    // Verify role exists
    const role = await storage.getRole(data.roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const authReq = req as AuthenticatedRequest;
    const expiresAt = new Date(Date.now() + data.duration * 60 * 60 * 1000);

    const temporaryRole = await storage.createTemporaryRole({
      userId: data.userId,
      roleId: data.roleId,
      createdBy: authReq.user!.id, // Real user who granted
      reason: data.reason,
      expiresAt,
    });

    await logAudit({
      req,
      action: 'temporary_role_granted',
      targetType: 'temporary_role',
      targetId: temporaryRole.id,
      details: {
        userId: data.userId,
        userName: user.name,
        roleId: data.roleId,
        roleName: role.name,
        reason: data.reason,
        duration: data.duration,
        expiresAt,
      },
    });

    res.json(temporaryRole);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Create temporary role error:', error);
    res.status(500).json({ error: 'Failed to create temporary role' });
  }
});

// Get all active temporary roles (Admin/Owner only)
router.get('/active', requireAuth, requirePermission(PERMISSION_KEYS.VIEW_USERS), async (req, res) => {
  try {
    const temporaryRoles = await storage.getActiveTemporaryRoles();
    res.json(temporaryRoles);
  } catch (error) {
    console.error('Get active temporary roles error:', error);
    res.status(500).json({ error: 'Failed to get temporary roles' });
  }
});

// Get user's temporary roles
router.get('/user/:userId', requireAuth, requirePermission(PERMISSION_KEYS.VIEW_USERS), async (req, res) => {
  try {
    const { userId } = req.params;
    const temporaryRoles = await storage.getTemporaryRolesByUser(userId);
    res.json(temporaryRoles);
  } catch (error) {
    console.error('Get user temporary roles error:', error);
    res.status(500).json({ error: 'Failed to get user temporary roles' });
  }
});

// Revoke temporary role early (Admin/Owner only)
router.delete('/:id', requireAuth, requirePermission(PERMISSION_KEYS.MANAGE_TEMPORARY_ROLES), async (req, res) => {
  try {
    const { id } = req.params;

    const temporaryRole = await storage.getTemporaryRole(id);
    if (!temporaryRole) {
      return res.status(404).json({ error: 'Temporary role not found' });
    }

    if (!temporaryRole.isActive) {
      return res.status(400).json({ error: 'Temporary role already revoked or expired' });
    }

    await storage.revokeTemporaryRole(id);

    await logAudit({
      req,
      action: 'temporary_role_revoked',
      targetType: 'temporary_role',
      targetId: id,
      details: {
        userId: temporaryRole.userId,
        roleId: temporaryRole.roleId,
        originalExpiry: temporaryRole.expiresAt,
      },
    });

    res.json({ success: true, message: 'Temporary role revoked' });
  } catch (error) {
    console.error('Revoke temporary role error:', error);
    res.status(500).json({ error: 'Failed to revoke temporary role' });
  }
});

// Extend temporary role duration (Admin/Owner only)
router.post('/:id/extend', requireAuth, requirePermission(PERMISSION_KEYS.MANAGE_TEMPORARY_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      additionalHours: z.number().min(1).max(168),
      reason: z.string().min(10).max(500),
    });

    const data = schema.parse(req.body);

    const temporaryRole = await storage.getTemporaryRole(id);
    if (!temporaryRole) {
      return res.status(404).json({ error: 'Temporary role not found' });
    }

    if (!temporaryRole.isActive) {
      return res.status(400).json({ error: 'Cannot extend inactive temporary role' });
    }

    const newExpiresAt = new Date(temporaryRole.expiresAt.getTime() + data.additionalHours * 60 * 60 * 1000);

    await storage.extendTemporaryRole(id, newExpiresAt);

    await logAudit({
      req,
      action: 'temporary_role_extended',
      targetType: 'temporary_role',
      targetId: id,
      details: {
        userId: temporaryRole.userId,
        roleId: temporaryRole.roleId,
        oldExpiry: temporaryRole.expiresAt,
        newExpiry: newExpiresAt,
        additionalHours: data.additionalHours,
        reason: data.reason,
      },
    });

    res.json({ success: true, newExpiresAt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Extend temporary role error:', error);
    res.status(500).json({ error: 'Failed to extend temporary role' });
  }
});

export default router;
