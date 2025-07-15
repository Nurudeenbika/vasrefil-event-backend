import { Router } from 'express';
import authRoutes from './auth';
import eventRoutes from './events';
import bookingRoutes from './bookings';
import dashboardRoutes from './dashboard';

const router = Router();

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/dashboard', dashboardRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Event Booking API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;