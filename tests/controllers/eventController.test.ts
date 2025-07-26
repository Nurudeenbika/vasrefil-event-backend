import { MongoMemoryServer } from "mongodb-memory-server";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app";
import Event from "../../src/models/Event";
import User from "../../src/models/User";

describe("Event Controller", () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let userToken: string;
  let adminUser: any;
  let regularUser: any;
  let testEvent: any;

  // Helper function to generate tokens with proper typing
  const generateToken = (user: any): string => {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET as Secret, {
      expiresIn: (process.env.JWT_EXPIRE || "30d") as SignOptions["expiresIn"], // Fixed: removed redundant type assertion
    });
  };

  beforeAll(async () => {
    // Set up test environment variables
    process.env.JWT_SECRET = "testsecret";
    process.env.JWT_EXPIRE = "1h";

    // Create MongoMemoryServer instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    await mongoose.connect(mongoUri);

    // Create test users
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      password: "password123",
      role: "admin",
    });

    regularUser = await User.create({
      name: "Regular User",
      email: "user@test.com",
      password: "password123",
      role: "user",
    });

    // Generate tokens
    adminToken = generateToken(adminUser);
    userToken = generateToken(regularUser);

    // Calculate a future date for testEvent
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Set to 7 days from now
    // Format to YYYY-MM-DD for consistency with your string date format
    const futureDateString = futureDate.toISOString().split("T")[0];

    // Create test event
    testEvent = await Event.create({
      title: "Test Event",
      description: "This is a test event",
      category: "conference",
      location: "Test Location",
      venue: "Test Venue",
      date: futureDateString, // Use the dynamically calculated future date
      time: "18:00",
      price: 100,
      totalSeats: 100,
      createdBy: adminUser._id,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Ensure testEvent is defined before attempting to use its _id
    if (testEvent && testEvent._id) {
      await Event.deleteMany({ _id: { $ne: testEvent._id } });
    } else {
      // If testEvent failed to create, clear all events to ensure clean state
      await Event.deleteMany({});
    }
  });

  describe("GET /events", () => {
    it("should return a list of events with pagination", async () => {
      const res = await request(app).get("/api/events").expect(200); // ADDED /api

      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toHaveProperty("page");
      expect(res.body.data.pagination).toHaveProperty("limit");
      expect(res.body.data.pagination).toHaveProperty("total");
      expect(res.body.data.pagination).toHaveProperty("pages");
    });

    it("should filter events by category", async () => {
      const res = await request(app)
        .get("/api/events") // ADDED /api
        .query({ category: "conference" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(
        res.body.data.events.every((e: any) => e.category === "conference")
      ).toBe(true);
    });

    it("should search events by title", async () => {
      const res = await request(app)
        .get("/api/events") // ADDED /api
        .query({ search: "Test" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThan(0);
    });

    it("should sort events by date", async () => {
      // Create additional events with different dates
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);

      await Event.create([
        {
          title: "Early Future Event",
          description: "This event is tomorrow",
          category: "workshop",
          date: tomorrow.toISOString().split("T")[0],
          time: "10:00",
          price: 50,
          totalSeats: 50,
          createdBy: adminUser._id,
          location: "Test Location 2", // Added required fields
          venue: "Test Venue 2", // Added required fields
        },
        {
          title: "Later Future Event",
          description: "This event is day after tomorrow",
          category: "seminar",
          date: dayAfterTomorrow.toISOString().split("T")[0],
          time: "14:00",
          price: 75,
          totalSeats: 75,
          createdBy: adminUser._id,
          location: "Test Location 3", // Added required fields
          venue: "Test Venue 3", // Added required fields
        },
      ]);

      const res = await request(app)
        .get("/api/events") // ADDED /api
        .query({ sortBy: "date", sortOrder: "asc" })
        .expect(200);

      expect(res.body.success).toBe(true);
      const dates = res.body.data.events.map((e: any) =>
        new Date(e.date).getTime()
      );
      const sortedDates = [...dates].sort((a, b) => a - b);
      expect(dates).toEqual(sortedDates);
    });
  });

  describe("GET /events/:id", () => {
    it("should return a single event", async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}`) // ADDED /api
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.event).toHaveProperty(
        "_id",
        testEvent._id.toString()
      );
      expect(res.body.data.event).toHaveProperty("title", "Test Event");
    });

    it("should return 404 for non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/events/${nonExistentId}`) // ADDED /api
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Event not found"); // Expecting specific message
    });

    it("should return 400 for invalid event ID", async () => {
      const res = await request(app).get("/api/events/invalid-id").expect(400); // ADDED /api

      expect(res.body.success).toBe(false);
      // Depending on your error handler, you might expect a message here too
    });
  });

  describe("POST /events", () => {
    const newEvent = {
      title: "New Event",
      description: "New event description",
      category: "workshop",
      location: "New Location",
      venue: "New Venue",
      date: new Date(new Date().setDate(new Date().getDate() + 10))
        .toISOString()
        .split("T")[0], // 10 days in future
      time: "12:00",
      price: 150,
      totalSeats: 200,
    };
    it("should return 403 for non-admin users", async () => {
      const res = await request(app)
        .post("/api/events") // ADDED /api
        .set("Authorization", `Bearer ${userToken}`)
        .send(newEvent)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. Insufficient permissions."); // Adjusted for common forbidden messages
    });

    it("should return 401 for unauthenticated users", async () => {
      const res = await request(app)
        .post("/api/events")
        .send(newEvent)
        .expect(401); // ADDED /api

      expect(res.body.success).toBe(false);
      // Depending on your auth middleware, message might be 'No token, authorization denied'
    });

    it("should validate event data", async () => {
      const invalidEvent = { ...newEvent, title: "" };
      const res = await request(app)
        .post("/api/events") // ADDED /api
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidEvent)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0]).toMatch(/title/i); // Case-insensitive match for error message
    });
  });

  describe("PUT /events/:id", () => {
    const updatedData = {
      title: "Updated Event",
      description: "Updated description",
      price: 200,
    };

    it("should validate update data", async () => {
      const invalidUpdate = { price: -100 };
      const res = await request(app)
        .put(`/api/events/${testEvent._id}`) // ADDED /api
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe("DELETE /events/:id", () => {
    it("should delete event as admin", async () => {
      const eventToDelete = await Event.create({
        title: "Event to Delete",
        description: "Will be deleted",
        category: "workshop",
        date: new Date(new Date().setDate(new Date().getDate() + 15))
          .toISOString()
          .split("T")[0], // 15 days in future
        time: "10:00",
        price: 50,
        totalSeats: 50,
        createdBy: adminUser._id,
        location: "Delete Location", // Added required fields
        venue: "Delete Venue", // Added required fields
      });

      const res = await request(app)
        .delete(`/api/events/${eventToDelete._id}`) // ADDED /api
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Event deleted successfully");

      // Verify event is actually deleted
      const deletedEvent = await Event.findById(eventToDelete._id);
      expect(deletedEvent).toBeNull();
    });

    it("should return 404 for non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/events/${nonExistentId}`) // ADDED /api
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Event not found");
    });
  });
});
