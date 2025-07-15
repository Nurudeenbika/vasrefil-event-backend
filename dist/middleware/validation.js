"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBooking = exports.validateEvent = exports.validateLogin = exports.validateRegister = exports.bookingSchema = exports.eventSchema = exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.details.map((detail) => detail.message),
            });
        }
        next();
    };
};
// Validation schemas
exports.registerSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(50).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    role: joi_1.default.string().valid("user", "admin").optional(),
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required(),
    role: joi_1.default.string().valid("user", "admin").optional(),
});
exports.eventSchema = joi_1.default.object({
    title: joi_1.default.string().min(3).max(100).required(),
    description: joi_1.default.string().min(10).max(1000).required(),
    category: joi_1.default.string()
        .valid("conference", "workshop", "seminar", "concert", "sports", "exhibition", "networking", "other")
        .required(),
    location: joi_1.default.string().required(),
    venue: joi_1.default.string().required(),
    date: joi_1.default.date().greater("now").required(),
    time: joi_1.default.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required(),
    price: joi_1.default.number().min(0).required(),
    totalSeats: joi_1.default.number().min(1).required(),
    availableSeats: joi_1.default.number().min(0).required(),
    imageUrl: joi_1.default.string().uri().optional(),
});
// export const bookingSchema = Joi.object({
//   event: Joi.string().required(),
//   seatsBooked: Joi.number().min(1).max(10).required(),
// });
exports.bookingSchema = joi_1.default.object({
    event: joi_1.default.string().required().messages({
        "string.empty": "Event ID is required",
        "any.required": "Event ID is required",
    }),
    seatsBooked: joi_1.default.number().min(1).max(10).required().messages({
        "number.base": "Number of tickets must be a number",
        "number.min": "At least 1 ticket must be booked",
        "number.max": "Maximum of 10 tickets per booking",
        "any.required": "Number of tickets is required",
    }),
    bookingDetails: joi_1.default.object({
        fullName: joi_1.default.string().min(2).max(100).required().messages({
            "string.empty": "Full name is required",
            "string.min": "Full name must be at least 2 characters",
            "any.required": "Full name is required",
        }),
        email: joi_1.default.string().email().required().messages({
            "string.email": "Please enter a valid email",
            "string.empty": "Email is required",
            "any.required": "Email is required",
        }),
        phone: joi_1.default.string()
            .pattern(/^\+?[\d\s-()]{10,}$/)
            .required()
            .messages({
            "string.pattern.base": "Please enter a valid phone number",
            "string.empty": "Phone number is required",
            "any.required": "Phone number is required",
        }),
        emergencyContact: joi_1.default.string().min(2).max(100).required().messages({
            "string.empty": "Emergency contact is required",
            "string.min": "Emergency contact must be at least 2 characters",
            "any.required": "Emergency contact is required",
        }),
        emergencyPhone: joi_1.default.string()
            .pattern(/^\+?[\d\s-()]{10,}$/)
            .required()
            .messages({
            "string.pattern.base": "Please enter a valid emergency phone number",
            "string.empty": "Emergency phone is required",
            "any.required": "Emergency phone is required",
        }),
        specialRequests: joi_1.default.string().allow("").optional(),
    }).required(),
    paymentDetails: joi_1.default.object({
        method: joi_1.default.string().optional(),
    }).optional(),
});
exports.validateRegister = validateRequest(exports.registerSchema);
exports.validateLogin = validateRequest(exports.loginSchema);
exports.validateEvent = validateRequest(exports.eventSchema);
exports.validateBooking = validateRequest(exports.bookingSchema);
//# sourceMappingURL=validation.js.map