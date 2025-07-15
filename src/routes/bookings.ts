import { Router } from "express";
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  getEventBookings,
} from "../controllers/bookingController";
import { authenticate, authorize } from "../middleware/auth";
import { validateBooking } from "../middleware/validation";

const router = Router();

// User routes
router.post("/", authenticate, validateBooking, createBooking);
router.get("/user", authenticate, getUserBookings);
router.get("/:id", authenticate, getBookingById);
router.patch("/:id/cancel", authenticate, cancelBooking);

// Admin routes
router.get("/admin/all", authenticate, authorize("admin"), getAllBookings);
router.get(
  "/admin/event/:eventId",
  authenticate,
  authorize("admin"),
  getEventBookings
);

export default router;
