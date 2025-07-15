import { Request, Response, NextFunction } from "express";
import Joi from "joi";

const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
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
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("user", "admin").optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().valid("user", "admin").optional(),
});

export const eventSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  category: Joi.string()
    .valid(
      "conference",
      "workshop",
      "seminar",
      "concert",
      "sports",
      "exhibition",
      "networking",
      "other"
    )
    .required(),
  location: Joi.string().required(),
  venue: Joi.string().required(),
  //date: Joi.date().greater("now").required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
    .required(),
  time: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required(),
  price: Joi.number().min(0).required(),
  totalSeats: Joi.number().min(1).required(),
  availableSeats: Joi.number().min(0).optional(),
  imageUrl: Joi.string().uri().optional(),
});

// export const bookingSchema = Joi.object({
//   event: Joi.string().required(),
//   seatsBooked: Joi.number().min(1).max(10).required(),

// });

export const bookingSchema = Joi.object({
  event: Joi.string().required().messages({
    "string.empty": "Event ID is required",
    "any.required": "Event ID is required",
  }),
  seatsBooked: Joi.number().min(1).max(10).required().messages({
    "number.base": "Number of tickets must be a number",
    "number.min": "At least 1 ticket must be booked",
    "number.max": "Maximum of 10 tickets per booking",
    "any.required": "Number of tickets is required",
  }),
  bookingDetails: Joi.object({
    fullName: Joi.string().min(2).max(100).required().messages({
      "string.empty": "Full name is required",
      "string.min": "Full name must be at least 2 characters",
      "any.required": "Full name is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email",
      "string.empty": "Email is required",
      "any.required": "Email is required",
    }),
    phone: Joi.string()
      .pattern(/^\+?[\d\s-()]{10,}$/)
      .required()
      .messages({
        "string.pattern.base": "Please enter a valid phone number",
        "string.empty": "Phone number is required",
        "any.required": "Phone number is required",
      }),
    emergencyContact: Joi.string().min(2).max(100).required().messages({
      "string.empty": "Emergency contact is required",
      "string.min": "Emergency contact must be at least 2 characters",
      "any.required": "Emergency contact is required",
    }),
    emergencyPhone: Joi.string()
      .pattern(/^\+?[\d\s-()]{10,}$/)
      .required()
      .messages({
        "string.pattern.base": "Please enter a valid emergency phone number",
        "string.empty": "Emergency phone is required",
        "any.required": "Emergency phone is required",
      }),
    specialRequests: Joi.string().allow("").optional(),
  }).required(),
  paymentDetails: Joi.object({
    method: Joi.string().optional(),
  }).optional(),
});

export const validateRegister = validateRequest(registerSchema);
export const validateLogin = validateRequest(loginSchema);
export const validateEvent = validateRequest(eventSchema);
export const validateBooking = validateRequest(bookingSchema);
