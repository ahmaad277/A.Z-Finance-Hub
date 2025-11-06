import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { PERMISSION_KEYS } from '../helpers/permissions';
import { logAudit } from '../helpers/audit';

const router = Router();

// Request to view sensitive data (users with limited permissions)
router.post('/', requireAuth, requirePermission(PERMISSION_KEYS.REQUEST_VIEW), async (req, res) => {
  try {
    const schema = z.object({
      dataType: z.enum(['investment_amounts', 'cashflow_amounts', 'portfolio_totals']),
      reason: z.string().min(10).max(500),
      duration: z.number().min(1).max(24), // Hours
    });

    const data = schema.parse(req.body);

    const authReq = req as AuthenticatedRequest;
    const viewRequest = await storage.createViewRequest({
      requesterId: authReq.user!.effectiveUserId,
      fieldType: data.dataType,
      reason: data.reason,
    });

    await logAudit({
      req,
      action: 'view_requested',
      targetType: 'view_request',
      targetId: viewRequest.id,
      details: { dataType: data.dataType, reason: data.reason, duration: data.duration },
    });

    res.json(viewRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Create view request error:', error);
    res.status(500).json({ error: 'Failed to create view request' });
  }
});

// Get user's view requests
router.get('/my-requests', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const requests = await storage.getViewRequestsByUser(authReq.user!.effectiveUserId);
    res.json(requests);
  } catch (error) {
    console.error('Get view requests error:', error);
    res.status(500).json({ error: 'Failed to get view requests' });
  }
});

// Get all pending view requests (Admin/Owner only)
router.get('/pending', requireAuth, requirePermission(PERMISSION_KEYS.APPROVE_VIEW_REQUESTS), async (req, res) => {
  try {
    const requests = await storage.getPendingViewRequests();
    res.json(requests);
  } catch (error) {
    console.error('Get pending view requests error:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
});

// Approve view request (Admin/Owner only)
router.post('/:id/approve', requireAuth, requirePermission(PERMISSION_KEYS.APPROVE_VIEW_REQUESTS), async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      grantedDuration: z.number().min(1).max(24).optional(), // Can override requested duration
    });

    const data = schema.parse(req.body);

    const viewRequest = await storage.getViewRequest(id);
    if (!viewRequest) {
      return res.status(404).json({ error: 'View request not found' });
    }

    if (viewRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const authReq = req as AuthenticatedRequest;
    const grantedDuration = data.grantedDuration || 24; // Default 24 hours
    const expiresAt = new Date(Date.now() + grantedDuration * 60 * 60 * 1000);

    const updated = await storage.updateViewRequest(id, {
      status: 'approved',
      approvedBy: authReq.user!.id, // Real user who approved
      approvedAt: new Date(),
      expiresAt,
    });

    await logAudit({
      req,
      action: 'view_approved',
      targetType: 'view_request',
      targetId: id,
      details: { 
        requestedBy: viewRequest.requesterId, 
        dataType: viewRequest.fieldType,
        grantedDuration,
        expiresAt 
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Approve view request error:', error);
    res.status(500).json({ error: 'Failed to approve view request' });
  }
});

// Reject view request (Admin/Owner only)
router.post('/:id/reject', requireAuth, requirePermission(PERMISSION_KEYS.APPROVE_VIEW_REQUESTS), async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      rejectionReason: z.string().min(10).max(500),
    });

    const data = schema.parse(req.body);

    const viewRequest = await storage.getViewRequest(id);
    if (!viewRequest) {
      return res.status(404).json({ error: 'View request not found' });
    }

    if (viewRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const authReq = req as AuthenticatedRequest;
    const updated = await storage.updateViewRequest(id, {
      status: 'rejected',
      approvedBy: authReq.user!.id,
      approvedAt: new Date(),
      reason: data.rejectionReason, // Store rejection reason in 'reason' field
    });

    await logAudit({
      req,
      action: 'view_rejected',
      targetType: 'view_request',
      targetId: id,
      details: { 
        requestedBy: viewRequest.requesterId, 
        dataType: viewRequest.fieldType,
        reason: data.rejectionReason 
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Reject view request error:', error);
    res.status(500).json({ error: 'Failed to reject view request' });
  }
});

export default router;
