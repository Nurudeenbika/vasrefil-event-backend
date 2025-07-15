import mongoose, { Schema, Document, Types } from "mongoose";

// TypeScript interface for the Booking document
export interface IBooking extends Document {
  user: Types.ObjectId;
  event: Types.ObjectId;
  seatsBooked: number;
  totalAmount: number;
  status: "confirmed" | "cancelled" | "pending" | "paid" | "refunded";
  bookingDate: Date;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
  bookingDetails: {
    fullName: string;
    email: string;
    phone: string;
    emergencyContact: string;
    emergencyPhone: string;
    specialRequests?: string;
  };
  paymentDetails?: {
    method?: string;
    transactionId?: string;
    status?: "pending" | "completed" | "failed";
    amountPaid?: number;
    paidAt?: Date;
  };
}

// Mongoose schema definition
const bookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    event: {
      type: Schema.Types.ObjectId,
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
          validator: (v: string) => /\S+@\S+\.\S+/.test(v),
          message: "Please enter a valid email",
        },
      },
      phone: {
        type: String,
        required: [true, "Phone number is required"],
        validate: {
          validator: (v: string) => /^\+?[\d\s-()]{10,}$/.test(v),
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
          validator: (v: string) => /^\+?[\d\s-()]{10,}$/.test(v),
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
  },
  {
    timestamps: true, // This automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

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
const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;
