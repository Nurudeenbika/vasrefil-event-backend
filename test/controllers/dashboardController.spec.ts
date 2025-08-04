import { expect } from "chai";
import sinon from "sinon";
import mongoose from "mongoose";
import { Response } from "express";
import * as dashboardController from "../../src/controllers/dashboardController";
import Booking from "../../src/models/Booking";
import Event from "../../src/models/Event";
import User from "../../src/models/User";
import { AuthRequest } from "../../src/types";

describe("Dashboard Controller", () => {
  let sandbox: sinon.SinonSandbox;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;

  before(async () => {
    await mongoose.connect(
      process.env.MONGODB_URI_TEST ||
        "mongodb://localhost:27017/event-bookings-test"
    );
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockRequest = {};
    mockResponse = {
      status: () => mockResponse as Response,
      json: () => mockResponse as Response,
    };
    statusStub = sandbox
      .stub(mockResponse, "status")
      .returns(mockResponse as Response);
    jsonStub = sandbox.stub(mockResponse, "json");
  });

  afterEach(async () => {
    await Booking.deleteMany({});
    await Event.deleteMany({});
    await User.deleteMany({});
    sandbox.restore();
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe("getDashboardStats", () => {
    it("should return dashboard statistics", async () => {
      // Create test data
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: "user",
      });
      await user.save();

      const event = new Event({
        title: "Test Event",
        date: new Date(Date.now() + 86400000), // Tomorrow
        category: "Music",
        price: 50,
        availableSeats: 100,
        totalSeats: 100,
      });
      await event.save();

      const booking = new Booking({
        user: user._id,
        event: event._id,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
      });
      await booking.save();

      await dashboardController.getDashboardStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.calledOnce).to.be.true;

      const responseData = jsonStub.firstCall.args[0].data;
      expect(responseData.overview.totalEvents).to.equal(1);
      expect(responseData.overview.totalBookings).to.equal(1);
      expect(responseData.overview.totalUsers).to.equal(1);
      expect(responseData.overview.totalRevenue).to.equal(100);
      expect(responseData.popularEvents.length).to.equal(1);
      expect(responseData.categoryStats.length).to.equal(1);
      expect(responseData.recentBookings.length).to.equal(1);
      expect(responseData.upcomingEvents.length).to.equal(1);
    });

    it("should handle empty database", async () => {
      await dashboardController.getDashboardStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;

      const responseData = jsonStub.firstCall.args[0].data;
      expect(responseData.overview.totalEvents).to.equal(0);
      expect(responseData.overview.totalBookings).to.equal(0);
      expect(responseData.overview.totalUsers).to.equal(0);
      expect(responseData.overview.totalRevenue).to.equal(0);
      expect(responseData.popularEvents.length).to.equal(0);
      expect(responseData.categoryStats.length).to.equal(0);
      expect(responseData.recentBookings.length).to.equal(0);
      expect(responseData.upcomingEvents.length).to.equal(0);
    });
  });

  describe("getRevenueStats", () => {
    it("should return monthly revenue stats by default", async () => {
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
      await user.save();

      const event = new Event({
        title: "Test Event",
        date: new Date(),
        price: 50,
        availableSeats: 100,
      });
      await event.save();

      const booking = new Booking({
        user: user._id,
        event: event._id,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
        createdAt: new Date(),
      });
      await booking.save();

      mockRequest = { query: {} };

      await dashboardController.getRevenueStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.revenueData.length).to.equal(1);
    });

    it("should return weekly revenue stats when requested", async () => {
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
      await user.save();

      const event = new Event({
        title: "Test Event",
        date: new Date(),
        price: 50,
        availableSeats: 100,
      });
      await event.save();

      const booking = new Booking({
        user: user._id,
        event: event._id,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
        createdAt: new Date(),
      });
      await booking.save();

      mockRequest = { query: { period: "week" } };

      await dashboardController.getRevenueStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.revenueData.length).to.equal(1);
    });

    it("should return yearly revenue stats when requested", async () => {
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
      await user.save();

      const event = new Event({
        title: "Test Event",
        date: new Date(),
        price: 50,
        availableSeats: 100,
      });
      await event.save();

      const booking = new Booking({
        user: user._id,
        event: event._id,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
        createdAt: new Date(),
      });
      await booking.save();

      mockRequest = { query: { period: "year" } };

      await dashboardController.getRevenueStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.revenueData.length).to.equal(1);
    });

    it("should handle empty revenue data", async () => {
      mockRequest = { query: {} };

      await dashboardController.getRevenueStats(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.revenueData.length).to.equal(0);
    });
  });
});
