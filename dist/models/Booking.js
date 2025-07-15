"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Mongoose schema definition
const bookingSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required"],
    },
    event: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Event",
        required: [true, "Event is required"],
    },
    seatsBooked: {
        // Changed from seatsBooked to match frontend
        type: Number,
        required: [true, "Number of tickets is required"],
        min: [1, "At least 1 ticket must be booked"],
        max: [10, "Maximum of 10 tickets per booking"],
    },
    totalAmount: {
        type: Number,
        required: [true, "Total amount is required"],
        min: [0, "Total amount cannot be negative"],
    },
    status: {
        type: String,
        enum: {
            values: ["confirmed", "cancelled", "pending", "paid", "refunded"],
            message: "Invalid booking status",
        },
        default: "pending",
    },
    bookingDate: {
        type: Date,
        default: Date.now,
    },
    bookingDetails: {
        // Added to store form data
        fullName: {
            type: String,
            required: [true, "Full name is required"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            validate: {
                validator: (v) => /\S+@\S+\.\S+/.test(v),
                message: "Please enter a valid email",
            },
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            validate: {
                validator: (v) => /^\+?[\d\s-()]{10,}$/.test(v),
                message: "Please enter a valid phone number",
            },
        },
        emergencyContact: {
            type: String,
            required: [true, "Emergency contact is required"],
        },
        emergencyPhone: {
            type: String,
            required: [true, "Emergency phone is required"],
            validate: {
                validator: (v) => /^\+?[\d\s-()]{10,}$/.test(v),
                message: "Please enter a valid emergency phone number",
            },
        },
        specialRequests: {
            type: String,
            default: "",
        },
    },
    paymentDetails: {
        method: {
            type: String,
            default: "mock", // or "card", "bank_transfer", etc.
        },
        transactionId: {
            type: String,
        },
        status: {
            type: String,
            enum: {
                values: ["pending", "completed", "failed"],
                message: "Invalid payment status",
            },
            default: "pending",
        },
        amountPaid: {
            type: Number,
            default: 0,
        },
        paidAt: {
            type: Date,
        },
    },
}, {
    timestamps: true, // This automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Add indexes for better query performance
bookingSchema.index({ user: 1, event: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });
// Virtual populate for user details
bookingSchema.virtual("userDetails", {
    ref: "User",
    localField: "user",
    foreignField: "_id",
    justOne: true,
});
// Virtual populate for event details
bookingSchema.virtual("eventDetails", {
    ref: "Event",
    localField: "event",
    foreignField: "_id",
    justOne: true,
});
// Pre-save middleware
bookingSchema.pre("save", function (next) {
    if (this.isNew) {
        this.bookingDate = new Date();
    }
    next();
});
// Export the model
const Booking = mongoose_1.default.model("Booking", bookingSchema);
exports.default = Booking;
//# sourceMappingURL=Booking.js.map