import { Router } from 'express';
import { getDashboardStats, getRevenueStats } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, authorize('admin'), getDashboardStats);
router.get('/revenue', authenticate, authorize('admin'), getRevenueStats);

export default router;