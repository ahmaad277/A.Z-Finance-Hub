import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSION_KEYS } from '../helpers/permissions';
import { logAudit } from '../helpers/audit';
import { insertRoleSchema } from '@shared/schema';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/v2/roles - Get all roles with their permissions
router.get('/', requirePermission(PERMISSION_KEYS.VIEW_ROLES), async (req, res) => {
  try {
    const roles = await storage.getRoles();
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /api/v2/roles/:id - Get role by ID
router.get('/:id', requirePermission(PERMISSION_KEYS.VIEW_ROLES), async (req, res) => {
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

// POST /api/v2/roles - Create new role (Owner only)
router.post('/', requirePermission(PERMISSION_KEYS.CREATE_ROLES), async (req: AuthenticatedRequest, res) => {
  try {
    const data = insertRoleSchema.parse(req.body);
    
    const role = await storage.createRole(data);
    
    await logAudit({
      req,
      action: 'create',
      targetType: 'role',
      targetId: role.id,
      details: { name: role.name },
    });
    
    res.status(201).json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid role data', details: error.errors });
    }
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PATCH /api/v2/roles/:id - Update role
router.patch('/:id', requirePermission(PERMISSION_KEYS.EDIT_ROLES), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const role = await storage.getRole(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (role.isSystem === 1) {
      return res.status(403).json({ error: 'Cannot modify system roles' });
    }
    
    const data = insertRoleSchema.partial().parse(req.body);
    const updatedRole = await storage.updateRole(id, data);
    
    await logAudit({
      req,
      action: 'update',
      targetType: 'role',
      targetId: id,
      details: { changes: data },
    });
    
    res.json(updatedRole);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid role data', details: error.errors });
    }
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/v2/roles/:id - Delete custom role
router.delete('/:id', requirePermission(PERMISSION_KEYS.DELETE_ROLES), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const role = await storage.getRole(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (role.isSystem === 1) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }
    
    await storage.deleteRole(id);
    
    await logAudit({
      req,
      action: 'delete',
      targetType: 'role',
      targetId: id,
      details: { name: role.name },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// POST /api/v2/roles/:id/permissions - Assign permission to role
router.post('/:id/permissions', requirePermission(PERMISSION_KEYS.EDIT_ROLES), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { permissionId } = req.body;
    
    if (!permissionId) {
      return res.status(400).json({ error: 'permissionId is required' });
    }
    
    await storage.assignPermissionToRole(id, permissionId);
    
    await logAudit({
      req,
      action: 'assign_permission',
      targetType: 'role',
      targetId: id,
      details: { permissionId },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Assign permission error:', error);
    res.status(500).json({ error: 'Failed to assign permission' });
  }
});

// DELETE /api/v2/roles/:id/permissions/:permissionId - Remove permission from role
router.delete('/:id/permissions/:permissionId', requirePermission(PERMISSION_KEYS.EDIT_ROLES), async (req: AuthenticatedRequest, res) => {
  try {
    const { id, permissionId } = req.params;
    
    await storage.removePermissionFromRole(id, permissionId);
    
    await logAudit({
      req,
      action: 'remove_permission',
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

// GET /api/v2/roles/permissions/all - Get all available permissions
router.get('/permissions/all', requirePermission(PERMISSION_KEYS.VIEW_ROLES), async (req, res) => {
  try {
    const permissions = await storage.getPermissions();
    res.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

export default router;
