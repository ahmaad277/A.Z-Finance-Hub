import { Router, Response } from 'express';
import { storage } from '../storage';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSION_KEYS } from '../helpers/permissions';

const router = Router();

// All routes require authentication and VIEW_AUDIT_LOG permission
router.use(requireAuth);
router.use(requirePermission(PERMISSION_KEYS.VIEW_AUDIT_LOG));

// Get audit logs with filters
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { actorId, actionType, targetType, limit } = req.query;

    const filters = {
      actorId: actorId as string | undefined,
      actionType: actionType as string | undefined,
      targetType: targetType as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const logs = await storage.getAuditLogs(filters);
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
