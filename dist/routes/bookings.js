"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// User routes
router.post("/", auth_1.authenticate, validation_1.validateBooking, bookingController_1.createBooking);
router.get("/user", auth_1.authenticate, bookingController_1.getUserBookings);
router.get("/:id", auth_1.authenticate, bookingController_1.getBookingById);
router.patch("/:id/cancel", auth_1.authenticate, bookingController_1.cancelBooking);
// Admin routes
router.get("/admin/all", auth_1.authenticate, (0, auth_1.authorize)("admin"), bookingController_1.getAllBookings);
router.get("/admin/event/:eventId", auth_1.authenticate, (0, auth_1.authorize)("admin"), bookingController_1.getEventBookings);
exports.default = router;
//# sourceMappingURL=bookings.js.map