import { Router, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../helpers/audit';
import { PERMISSION_KEYS } from '../helpers/permissions';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all permissions (must be before /:id route)
router.get('/permissions/all', requirePermission(PERMISSION_KEYS.MANAGE_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permissions = await storage.getPermissions();
    res.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Get all roles with permissions
router.get('/', requirePermission(PERMISSION_KEYS.MANAGE_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await storage.getRoles();
    // Fetch permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const roleWithPerms = await storage.getRole(role.id);
        return roleWithPerms;
      })
    );
    res.json(rolesWithPermissions);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get role with permissions
router.get('/:id', requirePermission(PERMISSION_KEYS.MANAGE_ROLES), async (req: AuthenticatedRequest, res: Response) => {
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

// Assign permission to role
router.post('/:id/permissions', requirePermission(PERMISSION_KEYS.EDIT_ROLES), async (req: AuthenticatedRequest, res: Response) => {
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
router.delete('/:id/permissions/:permissionId', requirePermission(PERMISSION_KEYS.EDIT_ROLES), async (req: AuthenticatedRequest, res: Response) => {
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

// Create role with permissions
router.post('/', requirePermission(PERMISSION_KEYS.CREATE_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { permissions, ...roleData } = req.body;
    
    // Create role with permissions atomically
    const role = await storage.createRoleWithPermissions(roleData, permissions || []);
    
    await logAudit({
      req,
      action: 'create',
      targetType: 'role',
      targetId: role.id,
      details: { name: role.name, permissionCount: permissions?.length || 0 },
    });
    
    res.status(201).json(role);
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role with permissions
router.patch('/:id', requirePermission(PERMISSION_KEYS.EDIT_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions, ...roleData } = req.body;
    
    // Update role with permissions atomically
    const role = await storage.updateRoleWithPermissions(id, roleData, permissions);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    await logAudit({
      req,
      action: 'update',
      targetType: 'role',
      targetId: id,
      details: { name: role.name, permissionCount: role.permissions?.length || 0 },
    });
    
    res.json(role);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
router.delete('/:id', requirePermission(PERMISSION_KEYS.DELETE_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await storage.deleteRole(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    await logAudit({
      req,
      action: 'delete',
      targetType: 'role',
      targetId: id,
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;
