import { Response } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking";
import Event from "../models/Event";
import { AuthRequest } from "../types";
import { v4 as uuidv4 } from "uuid";

// Mock payment service - replace with your actual payment provider
const processPayment = async (amount: number, paymentDetails: any) => {
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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment failed",
    };
  }
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const {
      event: eventIdRaw,
      seatsBooked,
      paymentDetails,
      bookingDetails,
    } = req.body;
    const userId = req.user?.id;

    // Ensure valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(eventIdRaw)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Event ID",
      });
    }

    const eventId = new mongoose.Types.ObjectId(eventIdRaw);

    // Check event existence
    const event = await Event.findById(eventId);
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
    const existingBooking = await Booking.findOne({
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
    const booking = new Booking({
      user: userId,
      event: eventId,
      seatsBooked,
      totalAmount,
      status: "confirmed",
      paymentId: paymentResult.transactionId,
      bookingDate: new Date(),
      bookingDetails,
      bookingReference: uuidv4(),
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating booking",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Updated cancel booking to handle refunds

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find the booking
    const booking = await Booking.findOne({ _id: id, user: userId });

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
    const event = await Event.findById(booking.event);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if event has already passed
    const now = new Date();
    const eventDate = new Date(event.date);
    const hoursDifference =
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

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

        await Booking.findByIdAndUpdate(booking._id, {
          paymentStatus: "refunded",
          refundedAt: new Date(),
        });
      } catch (refundError) {
        console.error("Refund failed:", refundError);
        // Handle refund error silently
      }
    }

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      data: { booking },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling booking",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Rest of your existing functions remain the same...
export const getUserBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10, status } = req.query;

    const query: any = { user: userId };
    if (status) query.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("event", "title date venue location price imageUrl")
      .lean();

    const total = await Booking.countDocuments(query);

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching bookings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const booking = await Booking.findOne({ _id: id, user: userId })
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching booking",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAllBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status, eventId, userId } = req.query;

    // Build query object
    const query: any = {};
    if (status) query.status = status;
    if (eventId) query.event = eventId;
    if (userId) query.user = userId;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("event", "title date venue location price imageUrl")
      .populate("user", "name email")
      .lean();

    const total = await Booking.countDocuments(query);

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching all bookings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEventBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Build query object
    const query: any = { event: eventId };
    if (status) query.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("user", "name email")
      .lean();

    const total = await Booking.countDocuments(query);

    // Calculate booking statistics
    const stats = await Booking.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching event bookings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
