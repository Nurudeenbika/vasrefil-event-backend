import { Request } from "express";
import { Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IEvent extends Document {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  venue: string;
  date: Date;
  time: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  imageUrl?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBooking extends Document {
  _id: string;
  user: string;
  event: string;
  seatsBooked: number;
  totalAmount: number;
  bookingDate: Date;
  status: "confirmed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  category?: string;
  location?: string;
  date?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
