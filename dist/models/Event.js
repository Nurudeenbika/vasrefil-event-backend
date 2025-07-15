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
const eventSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, "Event title is required"],
        trim: true,
        minlength: [3, "Title must be at least 3 characters long"],
        maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
        type: String,
        required: [true, "Event description is required"],
        trim: true,
        minlength: [10, "Description must be at least 10 characters long"],
        maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
        type: String,
        required: [true, "Event category is required"],
        enum: [
            "conference",
            "workshop",
            "seminar",
            "concert",
            "sports",
            "exhibition",
            "networking",
            "other",
        ],
        default: "other",
    },
    location: {
        type: String,
        required: [true, "Event location is required"],
        trim: true,
    },
    venue: {
        type: String,
        required: [true, "Event venue is required"],
        trim: true,
    },
    date: {
        type: String,
        required: true,
    },
    time: {
        type: String, // Store as 'HH:mm'
        required: true,
    },
    // date: {
    //   type: Date,
    //   required: [true, 'Event date is required'],
    //   validate: {
    //     validator: function(date: Date) {
    //       return date > new Date();
    //     },
    //     message: 'Event date must be in the future'
    //   }
    // },
    // time: {
    //   type: String,
    //   required: [true, 'Event time is required'],
    //   match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
    // },
    price: {
        type: Number,
        required: [true, "Event price is required"],
        min: [0, "Price cannot be negative"],
    },
    totalSeats: {
        type: Number,
        required: [true, "Total seats is required"],
        min: [1, "Total seats must be at least 1"],
    },
    availableSeats: {
        type: Number,
        required: false, // Optional, will default to totalSeats
        min: [0, "Available seats cannot be negative"],
    },
    imageUrl: {
        type: String,
        default: null,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});
// Index for better query performance
eventSchema.index({ category: 1, location: 1, date: 1 });
eventSchema.index({ title: "text", description: "text" });
// Set availableSeats to totalSeats before saving if not set
eventSchema.pre("save", function (next) {
    if (this.isNew && this.availableSeats === undefined) {
        this.availableSeats = this.totalSeats;
    }
    next();
});
exports.default = mongoose_1.default.model("Event", eventSchema);
//# sourceMappingURL=Event.js.map