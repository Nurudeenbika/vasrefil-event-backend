import { Request, Response, NextFunction } from "express";
import {
  getDashboardStats,
  getRevenueStats,
} from "../../src/controllers/dashboardController";
import Event from "../../src/models/Event";
import Booking from "../../src/models/Booking";
import User from "../../src/models/User";
import { AuthRequest } from "../../src/types"; // Assuming AuthRequest is defined here

// Mock Mongoose Models
jest.mock("../../src/models/Event");
jest.mock("../../src/models/Booking");
jest.mock("../../src/models/User");

describe("Dashboard Controller Unit Tests", () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test

    mockRequest = {}; // Request object for these unit tests is minimal
    mockResponse = {
      status: jest.fn().mockReturnThis(), // Allow chaining .json()
      json: jest.fn(), // Capture the JSON response
    };
    mockNext = jest.fn(); // Not typically used by controller functions directly

    // Spy on console.error to prevent test output clutter and verify error logging
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore(); // Restore original console.error
  });

  describe("getDashboardStats", () => {
    it("should return all dashboard statistics successfully", async () => {
      // Mock data for each aggregation/count
      const mockTotalEvents = 10;
      const mockTotalBookings = 5;
      const mockTotalUsers = 3;
      const mockTotalRevenue = [{ _id: null, total: 1250 }];

      const mockMonthlyBookings = [
        { _id: { year: 2024, month: 1 }, bookings: 1, revenue: 100, seats: 2 },
        { _id: { year: 2024, month: 2 }, bookings: 2, revenue: 300, seats: 5 },
      ];

      const mockPopularEvents = [
        {
          _id: "event1Id",
          totalBookings: 5,
          totalSeats: 10,
          totalRevenue: 500,
          event: { title: "Concert A", category: "Music", date: new Date() },
          eventId: "event1Id",
          title: "Concert A",
          category: "Music",
          date: new Date(),
        },
      ];

      const mockCategoryStats = [
        { _id: "Music", eventCount: 5, totalBookings: 10, totalRevenue: 1000 },
        { _id: "Sports", eventCount: 3, totalBookings: 5, totalRevenue: 500 },
      ];

      const mockRecentBookings = [
        {
          _id: "booking1Id",
          user: { name: "User A" },
          event: { title: "Event X" },
          createdAt: new Date(),
        },
      ];

      const mockUpcomingEvents = [
        {
          _id: "event2Id",
          title: "Future Event",
          date: new Date(),
          venue: "Venue Y",
          availableSeats: 50,
          totalSeats: 100,
        },
      ];

      // Mock the Mongoose model methods
      (Event.countDocuments as jest.Mock).mockResolvedValue(mockTotalEvents);
      (Booking.countDocuments as jest.Mock).mockResolvedValue(
        mockTotalBookings
      );
      (User.countDocuments as jest.Mock).mockResolvedValue(mockTotalUsers);

      // Mock Booking.aggregate for totalRevenue
      (Booking.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockTotalRevenue) // First call for totalRevenue
        .mockResolvedValueOnce(mockMonthlyBookings) // Second call for monthlyBookings
        .mockResolvedValueOnce(mockPopularEvents); // Third call for popularEvents

      // Mock Event.aggregate for categoryStats
      (Event.aggregate as jest.Mock).mockResolvedValue(mockCategoryStats);

      // Mock Booking.find for recentBookings
      (Booking.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockRecentBookings),
      });

      // Mock Event.find for upcomingEvents
      (Event.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUpcomingEvents),
      });

      // Act
      await getDashboardStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assert
      expect(Event.countDocuments).toHaveBeenCalledWith();
      expect(Booking.countDocuments).toHaveBeenCalledWith({
        status: "confirmed",
      });
      expect(User.countDocuments).toHaveBeenCalledWith({ role: "user" });

      // Check aggregate calls (order matters for mockResolvedValueOnce)
      expect(Booking.aggregate).toHaveBeenCalledTimes(3);
      expect(Event.aggregate).toHaveBeenCalledTimes(1);

      expect(Booking.find).toHaveBeenCalledWith({ status: "confirmed" });
      expect(Event.find).toHaveBeenCalledWith({
        date: { $gte: expect.any(Date) },
      });

      expect(mockResponse.status).not.toHaveBeenCalled(); // 200 is default
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          overview: {
            totalEvents: mockTotalEvents,
            totalBookings: mockTotalBookings,
            totalUsers: mockTotalUsers,
            totalRevenue: mockTotalRevenue[0].total,
          },
          monthlyBookings: mockMonthlyBookings,
          popularEvents: mockPopularEvents,
          categoryStats: mockCategoryStats,
          recentBookings: mockRecentBookings,
          upcomingEvents: mockUpcomingEvents,
        },
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("getRevenueStats", () => {
    // Helper to mock Booking.aggregate for revenue stats
    const mockBookingAggregateForRevenue = (mockData: any[]) => {
      (Booking.aggregate as jest.Mock).mockResolvedValue(mockData);
    };

    it("should return monthly revenue stats by default", async () => {
      mockRequest.query = {}; // Default period is 'month'
      const mockRevenueData = [
        {
          _id: { year: 2024, month: 1, day: 15 },
          revenue: 500,
          bookings: 5,
          seats: 10,
        },
      ];
      mockBookingAggregateForRevenue(mockRevenueData);

      await getRevenueStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(Booking.aggregate).toHaveBeenCalledTimes(1);
      const aggregateCall = (Booking.aggregate as jest.Mock).mock.calls[0][0];
      expect(aggregateCall[0].$match.createdAt.$gte).toBeInstanceOf(Date);
      expect(aggregateCall[0].$match.status).toBe("confirmed");
      expect(aggregateCall[1].$group._id).toEqual({
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { revenueData: mockRevenueData },
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return weekly revenue stats when period is "week"', async () => {
      mockRequest.query = { period: "week" };
      const mockRevenueData = [
        {
          _id: { year: 2024, month: 1, day: 20 },
          revenue: 250,
          bookings: 2,
          seats: 4,
        },
      ];
      mockBookingAggregateForRevenue(mockRevenueData);

      await getRevenueStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(Booking.aggregate).toHaveBeenCalledTimes(1);
      const aggregateCall = (Booking.aggregate as jest.Mock).mock.calls[0][0];
      expect(aggregateCall[0].$match.createdAt.$gte).toBeInstanceOf(Date);
      expect(aggregateCall[0].$match.status).toBe("confirmed");
      expect(aggregateCall[1].$group._id).toEqual({
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { revenueData: mockRevenueData },
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return yearly revenue stats when period is "year"', async () => {
      mockRequest.query = { period: "year" };
      const mockRevenueData = [
        {
          _id: { year: 2023, month: 12 },
          revenue: 1500,
          bookings: 10,
          seats: 20,
        },
      ];
      mockBookingAggregateForRevenue(mockRevenueData);

      await getRevenueStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(Booking.aggregate).toHaveBeenCalledTimes(1);
      const aggregateCall = (Booking.aggregate as jest.Mock).mock.calls[0][0];
      expect(aggregateCall[0].$match.createdAt.$gte).toBeInstanceOf(Date);
      expect(aggregateCall[0].$match.status).toBe("confirmed");
      expect(aggregateCall[1].$group._id).toEqual({
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { revenueData: mockRevenueData },
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
