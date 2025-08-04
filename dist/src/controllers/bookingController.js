"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventBookings = exports.getAllBookings = exports.getBookingById = exports.getUserBookings = exports.cancelBooking = exports.createBooking = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Event_1 = __importDefault(require("../models/Event"));
const uuid_1 = require("uuid");
// Mock payment service - replace with your actual payment provider
const processPayment = async (amount, paymentDetails) => {
    try {
        // Simulate payment processing without transaction
        console.log(`Processing payment of $${amount}`);
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Mock successful payment response
        return {
            success: true,
            transactionId: `txn_${Date.now()}`,
            amount,
            status: "completed",
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Payment failed",
        };
    }
};
const createBooking = async (req, res) => {
    try {
        const { event: eventIdRaw, seatsBooked, paymentDetails, bookingDetails, } = req.body;
        const userId = req.user?.id;
        // Ensure valid ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(eventIdRaw)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Event ID",
            });
        }
        const eventId = new mongoose_1.default.Types.ObjectId(eventIdRaw);
        // Check event existence
        const event = await Event_1.default.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }
        // Check if event is in the future
        if (new Date(event.date) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Cannot book tickets for past events",
            });
        }
        // Check for existing confirmed booking
        const existingBooking = await Booking_1.default.findOne({
            user: userId,
            event: eventId,
            status: "confirmed",
        });
        if (existingBooking) {
            return res.status(400).json({
                success: false,
                message: "You already have a booking for this event",
            });
        }
        // Check seat availability
        if (event.availableSeats < seatsBooked) {
            return res.status(400).json({
                success: false,
                message: `Only ${event.availableSeats} seats available`,
            });
        }
        // Calculate total amount
        const totalAmount = event.price * seatsBooked;
        // Process payment first
        const paymentResult = await processPayment(totalAmount, paymentDetails);
        if (!paymentResult.success) {
            return res.status(400).json({
                success: false,
                message: "Payment failed",
                error: paymentResult.error,
            });
        }
        // Create booking
        const booking = new Booking_1.default({
            user: userId,
            event: eventId,
            seatsBooked,
            totalAmount,
            status: "confirmed",
            paymentId: paymentResult.transactionId,
            bookingDate: new Date(),
            bookingDetails,
            bookingReference: (0, uuid_1.v4)(),
        });
        await booking.save();
        // Update available seats
        event.availableSeats -= seatsBooked;
        await event.save();
        // Populate booking for response
        await booking.populate([
            { path: "user", select: "name email" },
            { path: "event", select: "title date venue location price" },
        ]);
        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: {
                booking,
                payment: {
                    transactionId: paymentResult.transactionId,
                    amount: totalAmount,
                    status: paymentResult.status,
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating booking",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.createBooking = createBooking;
// Updated cancel booking to handle refunds
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        // Find the booking
        const booking = await Booking_1.default.findOne({ _id: id, user: userId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }
        // Check if booking is already cancelled
        if (booking.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Booking is already cancelled",
            });
        }
        // Find the event to restore seats
        const event = await Event_1.default.findById(booking.event);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }
        // Check if event has already passed
        const now = new Date();
        const eventDate = new Date(event.date);
        const hoursDifference = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursDifference < 24) {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel booking less than 24 hours before the event",
            });
        }
        // Update booking status
        booking.status = "cancelled";
        await booking.save();
        // Restore available seats
        event.availableSeats += booking.seatsBooked;
        await event.save();
        // Process refund AFTER cancellation
        if (booking.paymentId) {
            try {
                console.log(`Processing refund for payment ${booking.paymentId}`);
                await Booking_1.default.findByIdAndUpdate(booking._id, {
                    paymentStatus: "refunded",
                    refundedAt: new Date(),
                });
            }
            catch (refundError) {
                console.error("Refund failed:", refundError);
                // Handle refund error silently
            }
        }
        res.json({
            success: true,
            message: "Booking cancelled successfully",
            data: { booking },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error cancelling booking",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.cancelBooking = cancelBooking;
// Rest of your existing functions remain the same...
const getUserBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { page = 1, limit = 10, status } = req.query;
        const query = { user: userId };
        if (status)
            query.status = status;
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Math.min(50, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const bookings = await Booking_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate("event", "title date venue location price imageUrl")
            .lean();
        const total = await Booking_1.default.countDocuments(query);
        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching bookings",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getUserBookings = getUserBookings;
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const booking = await Booking_1.default.findOne({ _id: id, user: userId })
            .populate("event", "title date venue location price imageUrl")
            .populate("user", "name email");
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }
        res.json({
            success: true,
            data: { booking },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching booking",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getBookingById = getBookingById;
const getAllBookings = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, eventId, userId } = req.query;
        // Build query object
        const query = {};
        if (status)
            query.status = status;
        if (eventId)
            query.event = eventId;
        if (userId)
            query.user = userId;
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Math.min(50, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const bookings = await Booking_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate("event", "title date venue location price imageUrl")
            .populate("user", "name email")
            .lean();
        const total = await Booking_1.default.countDocuments(query);
        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching all bookings",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getAllBookings = getAllBookings;
const getEventBookings = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        // Check if event exists
        const event = await Event_1.default.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }
        // Build query object
        const query = { event: eventId };
        if (status)
            query.status = status;
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Math.min(50, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const bookings = await Booking_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate("user", "name email")
            .lean();
        const total = await Booking_1.default.countDocuments(query);
        // Calculate booking statistics
        const stats = await Booking_1.default.aggregate([
            { $match: { event: new mongoose_1.default.Types.ObjectId(eventId) } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalSeats: { $sum: "$seatsBooked" },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
        ]);
        res.json({
            success: true,
            data: {
                event: {
                    id: event._id,
                    title: event.title,
                    date: event.date,
                    venue: event.venue,
                    location: event.location,
                },
                bookings,
                stats,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching event bookings",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getEventBookings = getEventBookings;
//# sourceMappingURL=bookingController.js.map