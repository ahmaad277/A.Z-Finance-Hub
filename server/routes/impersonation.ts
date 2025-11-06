import { Router, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requireOwner, AuthenticatedRequest } from '../middleware/auth';
import { logImpersonation } from '../helpers/audit';
import { canImpersonate } from '../helpers/permissions';

const router = Router();

// All routes require authentication
router.use(requireAuth);

const startImpersonationSchema = z.object({
  targetUserId: z.string(),
  reason: z.string(),
});

// Start impersonation
router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!canImpersonate(req)) {
      return res.status(403).json({ error: 'Insufficient permissions to impersonate' });
    }

    const { targetUserId, reason } = startImpersonationSchema.parse(req.body);

    // Cannot impersonate yourself
    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot impersonate yourself' });
    }

    // Check if target user exists
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // End any existing impersonation session
    const existingSession = await storage.getActiveImpersonation(req.user!.id);
    if (existingSession) {
      await storage.endImpersonation(existingSession.id);
    }

    // Create new impersonation session
    const session = await storage.startImpersonation({
      ownerId: req.user!.id,
      targetUserId,
    });

    // Set impersonated user in session
    req.session.impersonatedUserId = targetUserId;

    await logImpersonation(req, 'impersonate_start', targetUserId, {
      reason,
      sessionId: session.id,
    });

    res.json({
      success: true,
      session: {
        id: session.id,
        targetUserId,
        targetUserName: targetUser.name,
        startedAt: session.startedAt,
      },
    });
  } catch (error) {
    console.error('Start impersonation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    res.status(500).json({ error: 'Failed to start impersonation' });
  }
});

// End impersonation
router.post('/end', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.isImpersonating) {
      return res.status(400).json({ error: 'Not currently impersonating' });
    }

    const session = await storage.getActiveImpersonation(req.session.userId!);
    if (session) {
      await storage.endImpersonation(session.id);
      await logImpersonation(req, 'impersonate_end', session.targetUserId, {
        sessionId: session.id,
        duration: Date.now() - new Date(session.startedAt).getTime(),
      });
    }

    // Remove impersonated user from session
    delete req.session.impersonatedUserId;

    res.json({ success: true });
  } catch (error) {
    console.error('End impersonation error:', error);
    res.status(500).json({ error: 'Failed to end impersonation' });
  }
});

// Get active impersonation status
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.isImpersonating) {
      return res.json({ isImpersonating: false });
    }

    const session = await storage.getActiveImpersonation(req.session.userId!);
    
    if (!session) {
      return res.json({ isImpersonating: false });
    }

    const targetUser = await storage.getUser(session.targetUserId);

    res.json({
      isImpersonating: true,
      session: {
        id: session.id,
        ownerId: session.ownerId,
        targetUserId: session.targetUserId,
        targetUserName: targetUser?.name,
        startedAt: session.startedAt,
      },
    });
  } catch (error) {
    console.error('Get impersonation status error:', error);
    res.status(500).json({ error: 'Failed to get impersonation status' });
  }
});

export default router;
