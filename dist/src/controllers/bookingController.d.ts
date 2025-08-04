import { Response } from "express";
import { AuthRequest } from "../types";
export declare const createBooking: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const cancelBooking: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserBookings: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getBookingById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllBookings: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getEventBookings: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=bookingController.d.ts.map