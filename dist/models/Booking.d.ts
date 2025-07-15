import mongoose, { Document, Types } from "mongoose";
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
declare const Booking: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking> & IBooking & {
    _id: Types.ObjectId;
}, any>;
export default Booking;
//# sourceMappingURL=Booking.d.ts.map