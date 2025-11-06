import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSION_KEYS } from '../helpers/permissions';
import { logAudit } from '../helpers/audit';

const router = Router();

// Request data export (any user with export permission)
router.post('/', requireAuth, requirePermission(PERMISSION_KEYS.REQUEST_EXPORT), async (req, res) => {
  try {
    const schema = z.object({
      exportType: z.enum(['investments', 'cashflows', 'full_portfolio', 'analytics']),
      reason: z.string().min(10).max(500),
    });

    const data = schema.parse(req.body);

    const authReq = req as AuthenticatedRequest;
    const exportRequest = await storage.createExportRequest({
      requesterId: authReq.user!.effectiveUserId,
      exportType: data.exportType,
      reason: data.reason,
    });

    await logAudit({
      req,
      action: 'export_requested',
      targetType: 'export_request',
      targetId: exportRequest.id,
      details: { exportType: data.exportType, reason: data.reason },
    });

    res.json(exportRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Create export request error:', error);
    res.status(500).json({ error: 'Failed to create export request' });
  }
});

// Get user's export requests
router.get('/my-requests', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const requests = await storage.getExportRequestsByUser(authReq.user!.effectiveUserId);
    res.json(requests);
  } catch (error) {
    console.error('Get export requests error:', error);
    res.status(500).json({ error: 'Failed to get export requests' });
  }
});

// Get all pending export requests (Admin/Owner only)
router.get('/pending', requireAuth, requirePermission(PERMISSION_KEYS.APPROVE_EXPORTS), async (req, res) => {
  try {
    const requests = await storage.getPendingExportRequests();
    res.json(requests);
  } catch (error) {
    console.error('Get pending export requests error:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
});

// Approve export request (Admin/Owner only)
router.post('/:id/approve', requireAuth, requirePermission(PERMISSION_KEYS.APPROVE_EXPORTS), async (req, res) => {
  try {
    const { id } = req.params;

    const exportRequest = await storage.getExportRequest(id);
    if (!exportRequest) {
      return res.status(404).json({ error: 'Export request not found' });
    }

    if (exportRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const authReq = req as AuthenticatedRequest;
    const updated = await storage.updateExportRequest(id, {
      status: 'approved',
      approvedBy: authReq.user!.id, // Real user who approved
      approvedAt: new Date(),
    });

    await logAudit({
      req,
      action: 'export_approved',
      targetType: 'export_request',
      targetId: id,
      details: { requestedBy: exportRequest.requesterId, exportType: exportRequest.exportType },
    });

    res.json(updated);
  } catch (error) {
    console.error('Approve export request error:', error);
    res.status(500).json({ error: 'Failed to approve export request' });
  }
});

// Reject export request (Admin/Owner only)
router.post('/:id/reject', requireAuth, requirePermission(PERMISSION_KEYS.APPROVE_EXPORTS), async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      rejectionReason: z.string().min(10).max(500),
    });

    const data = schema.parse(req.body);

    const exportRequest = await storage.getExportRequest(id);
    if (!exportRequest) {
      return res.status(404).json({ error: 'Export request not found' });
    }

    if (exportRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const authReq = req as AuthenticatedRequest;
    const updated = await storage.updateExportRequest(id, {
      status: 'rejected',
      approvedBy: authReq.user!.id, // Real user who rejected
      approvedAt: new Date(),
      rejectionReason: data.rejectionReason,
    });

    await logAudit({
      req,
      action: 'export_rejected',
      targetType: 'export_request',
      targetId: id,
      details: { 
        requestedBy: exportRequest.requesterId, 
        exportType: exportRequest.exportType,
        reason: data.rejectionReason 
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Reject export request error:', error);
    res.status(500).json({ error: 'Failed to reject export request' });
  }
});

export default router;
