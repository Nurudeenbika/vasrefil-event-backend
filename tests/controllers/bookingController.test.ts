import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";

// Set test JWT secret before importing app
process.env.JWT_SECRET = "testsecret";

import app from "../../src/app";
import Event from "../../src/models/Event";
import Booking from "../../src/models/Booking";
import User from "../../src/models/User";

let mongoServer: MongoMemoryServer;
let testUser: any;
let testEvent: any;
let testBooking: any;
let adminUser: any;
let userToken: string;
let adminToken: string;

// Helper function to generate JWT token
function generateToken(userId: string) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

// Helper function to create valid booking details
function createBookingDetails() {
  return {
    fullName: "Test User",
    email: "test@example.com",
    phone: "1234567890",
    emergencyContact: "Emergency Person",
    emergencyPhone: "0987654321",
  };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: "testdb" });

  // Create test users
  testUser = await User.create({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  });

  adminUser = await User.create({
    name: "Admin User",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
  });

  // Generate tokens
  userToken = generateToken(testUser._id.toString());
  adminToken = generateToken(adminUser._id.toString());

  // Create test event with all required fields
  testEvent = await Event.create({
    title: "Test Event",
    description: "Test Description",
    category: "concert",
    location: "Test Location",
    venue: "Test Venue",
    date: new Date(Date.now() + 72 * 60 * 60 * 1000), // 3 days from now
    time: "18:00",
    price: 100,
    totalSeats: 100,
    availableSeats: 100,
    createdBy: testUser._id,
    imageUrl: "http://example.com/image.jpg",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Booking.deleteMany({});
});

describe("Booking Controller", () => {
  describe("POST /api/bookings - createBooking", () => {
    it("should create a new booking successfully", async () => {
      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          event: testEvent._id,
          seatsBooked: 2,
          paymentDetails: { method: "card" },
          bookingDetails: createBookingDetails(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.event.title).toBe("Test Event");
      expect(res.body.data.payment.status).toBe("completed");

      // Verify event seats were updated
      const updatedEvent = await Event.findById(testEvent._id);
      expect(updatedEvent?.availableSeats).toBe(98);
    });

    it("should prevent duplicate bookings for same event", async () => {
      // First booking
      await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          event: testEvent._id,
          seatsBooked: 1,
          paymentDetails: { method: "card" },
          bookingDetails: createBookingDetails(),
        });

      // Second booking attempt
      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          event: testEvent._id,
          seatsBooked: 1,
          paymentDetails: { method: "card" },
          bookingDetails: createBookingDetails(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "You already have a booking for this event"
      );
    });
  });

  describe("DELETE /api/bookings/:id - cancelBooking", () => {
    beforeEach(async () => {
      // Create a booking to cancel with all required fields
      testBooking = await Booking.create({
        user: testUser._id,
        event: testEvent._id,
        seatsBooked: 2,
        totalAmount: 200,
        status: "confirmed",
        paymentId: "pay_test123",
        bookingReference: "ref123",
        bookingDetails: createBookingDetails(),
      });

      // Update event seats
      await Event.findByIdAndUpdate(testEvent._id, {
        availableSeats: testEvent.availableSeats - 2,
      });
    });

    it("should cancel a booking successfully", async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/cancel`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe("cancelled");

      // Verify seats were returned
      const updatedEvent = await Event.findById(testEvent._id);
      expect(updatedEvent?.availableSeats).toBe(100);
    });

    it("should prevent cancelling a non-existent booking", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/bookings/${fakeId}/cancel`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Booking not found");
    });

    it("should prevent cancelling another user's booking", async () => {
      const otherUser = await User.create({
        name: "Other User",
        email: "other@example.com",
        password: "password123",
      });
      const otherToken = generateToken(otherUser._id.toString());

      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/cancel`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Booking not found");
    });
  });

  describe("GET /api/bookings - getBookings", () => {
    beforeEach(async () => {
      // Create test bookings with all required fields
      await Booking.create([
        {
          user: testUser._id,
          event: testEvent._id,
          seatsBooked: 1,
          totalAmount: 100,
          status: "confirmed",
          paymentId: "pay_test1",
          bookingDetails: createBookingDetails(),
        },
        {
          user: testUser._id,
          event: testEvent._id,
          seatsBooked: 2,
          totalAmount: 200,
          status: "cancelled",
          paymentId: "pay_test2",
          bookingDetails: createBookingDetails(),
        },
      ]);
    });

    it("should get user bookings", async () => {
      const res = await request(app)
        .get("/api/bookings/user")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it("should filter bookings by status", async () => {
      const res = await request(app)
        .get("/api/bookings/user?status=confirmed")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBe(1);
      expect(res.body.data.bookings[0].status).toBe("confirmed");
    });

    it("should allow admin to get all bookings", async () => {
      const res = await request(app)
        .get("/api/bookings/admin/all")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBe(2);
    });
  });

  describe("GET /api/bookings/:id - getBookingById", () => {
    it("should get a specific booking", async () => {
      const booking = await Booking.create({
        user: testUser._id,
        event: testEvent._id,
        seatsBooked: 1,
        totalAmount: 100,
        status: "confirmed",
        bookingDetails: createBookingDetails(),
      });

      const res = await request(app)
        .get(`/api/bookings/${booking._id}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking._id).toBe(booking._id.toString());
    });
  });

  describe("GET /api/events/:eventId/bookings - getEventBookings", () => {
    it("should get bookings for an event", async () => {
      await Booking.create([
        {
          user: testUser._id,
          event: testEvent._id,
          seatsBooked: 1,
          totalAmount: 100,
          status: "confirmed",
          bookingDetails: createBookingDetails(),
        },
        {
          user: testUser._id,
          event: testEvent._id,
          seatsBooked: 2,
          totalAmount: 200,
          status: "confirmed",
          bookingDetails: createBookingDetails(),
        },
      ]);

      const res = await request(app)
        .get(`/api/bookings/admin/event/${testEvent._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBe(2);
      expect(res.body.data.stats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: "confirmed",
            count: 2,
            totalSeats: 3,
            totalRevenue: 300,
          }),
        ])
      );
    });
  });
});
