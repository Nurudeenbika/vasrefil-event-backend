import { Router } from 'express';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventCategories,
  getEventLocations
} from '../controllers/eventController';
import { authenticate, authorize } from '../middleware/auth';
import { validateEvent } from '../middleware/validation';

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/categories', getEventCategories);
router.get('/locations', getEventLocations);
router.get('/:id', getEvent);

// Protected routes (Admin only)
router.post('/', authenticate, authorize('admin'), validateEvent, createEvent);
router.put('/:id', authenticate, authorize('admin'), validateEvent, updateEvent);
router.delete('/:id', authenticate, authorize('admin'), deleteEvent);

export default router;
