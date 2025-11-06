import { Router, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../helpers/audit';
import { PERMISSION_KEYS } from '../helpers/permissions';

const router = Router();

// All routes require authentication and MANAGE_ROLES permission
router.use(requireAuth);
router.use(requirePermission(PERMISSION_KEYS.MANAGE_ROLES));

// Get all roles
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await storage.getRoles();
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get role with permissions
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const role = await storage.getRole(id);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Get all permissions
router.get('/permissions/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permissions = await storage.getPermissions();
    res.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Assign permission to role
router.post('/:id/permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      return res.status(400).json({ error: 'Permission ID required' });
    }

    const rolePermission = await storage.assignPermissionToRole(id, permissionId);

    await logAudit({
      req,
      action: 'assign_permission',
      targetType: 'role',
      targetId: id,
      details: { permissionId },
    });

    res.status(201).json(rolePermission);
  } catch (error) {
    console.error('Assign permission error:', error);
    res.status(500).json({ error: 'Failed to assign permission' });
  }
});

// Remove permission from role
router.delete('/:id/permissions/:permissionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, permissionId } = req.params;

    const success = await storage.removePermissionFromRole(id, permissionId);
    
    if (!success) {
      return res.status(404).json({ error: 'Permission assignment not found' });
    }

    await logAudit({
      req,
      action: 'revoke_permission',
      targetType: 'role',
      targetId: id,
      details: { permissionId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove permission error:', error);
    res.status(500).json({ error: 'Failed to remove permission' });
  }
});

export default router;
