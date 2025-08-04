"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventLocations = exports.getEventCategories = exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEvent = exports.getEvents = void 0;
const Event_1 = __importDefault(require("../models/Event"));
const mongoose_1 = __importDefault(require("mongoose")); // Import mongoose for ObjectId validation
const getEvents = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, location, date, time, search, sortBy = "date", sortOrder = "asc", } = req.query;
        // Build query
        const query = {};
        if (category)
            query.category = category;
        if (location)
            query.location = new RegExp(location, "i");
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
        const sort = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Math.min(50, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const events = await Event_1.default.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .populate("createdBy", "name email")
            .lean();
        const total = await Event_1.default.countDocuments(query);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching events",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getEvents = getEvents;
const getEvent = async (req, res) => {
    try {
        const { id } = req.params;
        // Validate if the ID is a valid MongoDB ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID format",
            });
        }
        const event = await Event_1.default.findById(id).populate("createdBy", "name email");
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
    }
    catch (error) {
        // Catch any other potential errors during fetching (e.g., database connection issues)
        res.status(500).json({
            success: false,
            message: "Error fetching event",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getEvent = getEvent;
const createEvent = async (req, res) => {
    try {
        const eventData = {
            ...req.body,
            createdBy: req.user?.id,
        };
        const event = await Event_1.default.create(eventData);
        // Populate createdBy for the response to include user details
        await event.populate("createdBy", "name email");
        res.status(201).json({
            success: true,
            message: "Event created successfully",
            data: { event },
        });
    }
    catch (error) {
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
exports.createEvent = createEvent;
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        // Validate if the ID is a valid MongoDB ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID format",
            });
        }
        const event = await Event_1.default.findById(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }
        // Check if user is the creator or admin
        if (event.createdBy.toString() !== req.user?.id &&
            req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Insufficient permissions.", // Updated message
            });
        }
        const updatedEvent = await Event_1.default.findByIdAndUpdate(id, { ...req.body }, { new: true, runValidators: true }).populate("createdBy", "name email");
        res.json({
            success: true,
            message: "Event updated successfully",
            data: { event: updatedEvent },
        });
    }
    catch (error) {
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
exports.updateEvent = updateEvent;
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        // Validate if the ID is a valid MongoDB ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID format",
            });
        }
        const event = await Event_1.default.findById(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }
        // Check if user is the creator or admin
        if (event.createdBy.toString() !== req.user?.id &&
            req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Insufficient permissions.", // Updated message
            });
        }
        await Event_1.default.findByIdAndDelete(id);
        res.json({
            success: true,
            message: "Event deleted successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting event",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.deleteEvent = deleteEvent;
const getEventCategories = async (req, res) => {
    try {
        const categories = await Event_1.default.distinct("category");
        res.json({
            success: true,
            data: { categories },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching categories",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getEventCategories = getEventCategories;
const getEventLocations = async (req, res) => {
    try {
        const locations = await Event_1.default.distinct("location");
        res.json({
            success: true,
            data: { locations },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching locations",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getEventLocations = getEventLocations;
//# sourceMappingURL=eventController.js.map