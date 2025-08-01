import { Request, Response } from "express";
import Event from "../models/Event";
import { AuthRequest, QueryParams } from "../types";
import mongoose from "mongoose"; // Import mongoose for ObjectId validation

export const getEvents = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      location,
      date,
      time,
      search,
      sortBy = "date",
      sortOrder = "asc",
    }: QueryParams = req.query;

    // Build query
    const query: any = {};

    if (category) query.category = category;
    if (location) query.location = new RegExp(location, "i");
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: searchDate, $lt: nextDay };
    }
    if (time) {
      // Ensure time matches exactly e.g., "08:00"
      query.time = time;
    }
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const events = await Event.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate("createdBy", "name email")
      .lean();

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      data: {
        events,
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
      message: "Error fetching events",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format",
      });
    }

    const event = await Event.findById(id).populate("createdBy", "name email");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      data: { event },
    });
  } catch (error) {
    // Catch any other potential errors during fetching (e.g., database connection issues)
    res.status(500).json({
      success: false,
      message: "Error fetching event",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user?.id,
    };

    const event = await Event.create(eventData);
    // Populate createdBy for the response to include user details
    await event.populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: { event },
    });
  } catch (error: any) {
    // Explicitly type error as 'any' or 'MongooseError' for better handling
    // Handle Mongoose validation errors specifically
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message, // Mongoose validation error message
        errors: error.errors, // Detailed validation errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating event",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is the creator or admin
    if (
      event.createdBy.toString() !== req.user?.id &&
      req.user?.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.", // Updated message
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Event updated successfully",
      data: { event: updatedEvent },
    });
  } catch (error: any) {
    // Explicitly type error as 'any' or 'MongooseError' for better handling
    // Handle Mongoose validation errors specifically
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message, // Mongoose validation error message
        errors: error.errors, // Detailed validation errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating event",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is the creator or admin
    if (
      event.createdBy.toString() !== req.user?.id &&
      req.user?.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.", // Updated message
      });
    }

    await Event.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting event",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEventCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Event.distinct("category");

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getEventLocations = async (req: Request, res: Response) => {
  try {
    const locations = await Event.distinct("location");

    res.json({
      success: true,
      data: { locations },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching locations",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
