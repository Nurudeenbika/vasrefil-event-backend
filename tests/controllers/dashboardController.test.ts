import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";

// Set test JWT secret before importing app and other files
process.env.JWT_SECRET = "testsecret";
process.env.NODE_ENV = "test";

import app from "../../src/app";
import Event from "../../src/models/Event";
import Booking from "../../src/models/Booking";
import User from "../../src/models/User";

let mongoServer: MongoMemoryServer;
let adminUser: any;
let regularUser: any;
let adminToken: string;
let regularUserToken: string;
let testEvent1: any;
let testEvent2: any;
let testEvent3: any;

// Helper function to generate JWT token
function generateToken(userId: string, role: string) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "testdb" });

  // Create test users
  adminUser = await User.create({
    name: "Admin User",
    email: "admin@example.com",
    password: "adminpassword",
    role: "admin",
  });
  regularUser = await User.create({
    name: "Regular User",
    email: "user@example.com",
    password: "userpassword",
    role: "user",
  });

  // Generate tokens
  adminToken = generateToken(adminUser._id.toString(), "admin");
  regularUserToken = generateToken(regularUser._id.toString(), "user");

  // Create test events - all in the future to satisfy validation
  const today = new Date();
  const futureDate1 = new Date();
  futureDate1.setDate(today.getDate() + 5);
  const futureDate2 = new Date();
  futureDate2.setDate(today.getDate() + 10);
  const futureDate3 = new Date();
  futureDate3.setDate(today.getDate() + 15);

  testEvent1 = await Event.create({
    title: "Upcoming Concert",
    description: "A great concert",
    category: "concert",
    location: "Venue A",
    venue: "Main Hall",
    date: futureDate1,
    time: "19:00",
    price: 50,
    totalSeats: 100,
    availableSeats: 95,
    createdBy: adminUser._id,
    imageUrl: "http://example.com/concert.jpg",
  });

  testEvent2 = await Event.create({
    title: "Tech Conference",
    description: "A tech conference",
    category: "conference",
    location: "Venue B",
    venue: "Conference Room",
    date: futureDate2,
    time: "10:00",
    price: 150,
    totalSeats: 200,
    availableSeats: 190,
    createdBy: adminUser._id,
    imageUrl: "http://example.com/conference.jpg",
  });

  testEvent3 = await Event.create({
    title: "Art Exhibition",
    description: "An art exhibition",
    category: "exhibition",
    location: "Venue C",
    venue: "Gallery",
    date: futureDate3,
    time: "14:00",
    price: 25,
    totalSeats: 50,
    availableSeats: 50,
    createdBy: adminUser._id,
    imageUrl: "http://example.com/art.jpg",
  });

  // Create test bookings
  await Booking.create({
    user: regularUser._id,
    event: testEvent1._id,
    seatsBooked: 5,
    bookingDate: new Date(),
    totalAmount: 250,
    status: "confirmed",
    bookingDetails: {
      fullName: "Regular User",
      email: "user@example.com",
      phone: "08012345678",
      emergencyContact: "Emergency Person",
      emergencyPhone: "08087654321",
    },
    createdAt: new Date(),
  });

  await Booking.create({
    user: adminUser._id,
    event: testEvent2._id,
    seatsBooked: 10,
    totalAmount: 1500,
    bookingDate: new Date(),
    status: "confirmed",
    bookingDetails: {
      fullName: "Admin User",
      email: "admin@example.com",
      phone: "08099999888",
      emergencyContact: "Admin Emergency",
      emergencyPhone: "08099999342",
    },
    createdAt: new Date(),
  });

  await Booking.create({
    user: regularUser._id,
    event: testEvent2._id,
    seatsBooked: 2,
    bookingDate: new Date(),
    totalAmount: 300,
    status: "cancelled",
    bookingDetails: {
      fullName: "Regular User 2",
      email: "user2@example.com",
      phone: "08012345679",
      emergencyContact: "Emergency Person",
      emergencyPhone: "08087654322",
    },
    createdAt: new Date(),
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear collections if needed
});

describe("Dashboard Controller", () => {
  describe("GET /api/dashboard/stats - getDashboardStats", () => {
    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/api/dashboard/stats");
      expect(res.status).toBe(401);
    });

    it("should return 403 if authenticated user is not an admin", async () => {
      const res = await request(app)
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
    });

    it("should return zero values for stats on an empty database", async () => {
      // Clear collections to simulate an empty database
      await Booking.deleteMany({});
      await Event.deleteMany({});
      await User.deleteMany({ role: "user" });

      const res = await request(app)
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.overview.totalEvents).toBe(0);
      expect(data.overview.totalBookings).toBe(0);
      expect(data.overview.totalUsers).toBe(0);
      expect(data.overview.totalRevenue).toBe(0);
      expect(data.monthlyBookings.length).toBe(0);
      expect(data.popularEvents.length).toBe(0);
      expect(data.categoryStats.length).toBe(0);
      expect(data.recentBookings.length).toBe(0);
      expect(data.upcomingEvents.length).toBe(0);
    });
  });

  describe("GET /api/dashboard/revenue - getRevenueStats", () => {
    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/api/dashboard/revenue");
      expect(res.status).toBe(401);
    });
  });
});
