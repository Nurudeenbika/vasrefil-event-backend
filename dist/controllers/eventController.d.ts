import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare const getEvents: (req: Request, res: Response) => Promise<void>;
export declare const getEvent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createEvent: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateEvent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteEvent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getEventCategories: (req: Request, res: Response) => Promise<void>;
export declare const getEventLocations: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=eventController.d.ts.map