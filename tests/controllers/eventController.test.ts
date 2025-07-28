// tests/controllers/eventController.test.ts
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import request from "supertest";
import mongoose from "mongoose"; // This will be the mocked mongoose after the jest.mock call
import app from "../../src/app";
import Event from "../../src/models/Event";
import User from "../../src/models/User";
import Booking from "../../src/models/Booking"; // Ensure Booking model is imported for setup/teardown

// IMPORTANT: This mock must be at the very top to ensure it's applied before
// any modules that depend on mongoose are loaded (like your models).
// This workaround addresses the "TypeError: mongoose_1.Schema is not a constructor"
// by ensuring Schema is correctly exposed as a constructor from the mocked mongoose.
jest.mock("mongoose", () => {
  const actualMongoose = jest.requireActual("mongoose");
  return {
    ...actualMongoose,
    // Ensure Schema is the actual Schema constructor
    Schema: actualMongoose.Schema,
    Types: {
      ObjectId: actualMongoose.Types.ObjectId,
    },
    // If you explicitly import 'model' from mongoose, you might need to expose it too
    model: actualMongoose.model,
  };
});

// Define valid categories based on your Event model's schema enum
// YOU MUST ENSURE THIS LIST EXACTLY MATCHES THE ENUM IN YOUR src/models/Event.ts
const validCategories = [
  "conference",
  "workshop",
  "seminar",
  "concert",
  "sports",
  "exhibition",
  "networking",
  "other",
];

describe("Event Controller", () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let userToken: string;
  let adminUser: any;
  let regularUser: any;
  let testEvent: any; // This will be the initial event created by adminUser

  // Helper function to generate JWT token
  function generateToken(userId: string, role: string) {
    return jwt.sign({ id: userId, role }, process.env.JWT_SECRET as Secret, {
      expiresIn: (process.env.JWT_EXPIRE || "30d") as SignOptions["expiresIn"],
    });
  }

  beforeAll(async () => {
    // Set up test environment variables
    process.env.JWT_SECRET = "testsecret";
    process.env.JWT_EXPIRE = "1h";

    // Create MongoMemoryServer instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    await mongoose.connect(mongoUri);

    // Clear collections before starting tests to ensure a clean state
    await User.deleteMany({});
    await Event.deleteMany({});
    await Booking.deleteMany({}); // Assuming you have a Booking model

    // Create test users
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      password: "adminpassword",
      role: "admin",
    });

    regularUser = await User.create({
      name: "Regular User",
      email: "user@test.com",
      password: "userpassword",
      role: "user",
    });

    // Generate tokens
    adminToken = generateToken(adminUser._id.toString(), "admin");
    userToken = generateToken(regularUser._id.toString(), "user");

    // Calculate a future date for testEvent
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Set to 7 days from now
    const futureDateString = futureDate.toISOString().split("T")[0];

    // Create an initial test event for GET, PUT, DELETE tests
    testEvent = await Event.create({
      title: "Test Event for CRUD",
      description: "This is a comprehensive description for a test event.", // Ensure minLength
      category: "conference", // Must be a valid category
      location: "Test Location",
      venue: "Test Venue",
      date: futureDateString,
      time: "18:00",
      price: 100,
      totalSeats: 100,
      availableSeats: 100, // Ensure availableSeats is set
      createdBy: adminUser._id,
      imageUrl: "http://example.com/test.jpg", // Add imageUrl if required by schema
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up events added during tests, but keep the initial testEvent
    await Event.deleteMany({ _id: { $ne: testEvent._id } });
    // Also clean up users created during tests (e.g., 'Another User')
    await User.deleteMany({ _id: { $nin: [adminUser._id, regularUser._id] } });
  });

  describe("GET /api/events", () => {
    it("should return a list of events with pagination", async () => {
      const res = await request(app).get("/api/events").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toBeInstanceOf(Array);
      expect(res.body.data.events.length).toBeGreaterThan(0); // Should at least contain testEvent
      expect(res.body.data.pagination).toHaveProperty("page", 1);
      expect(res.body.data.pagination).toHaveProperty("limit", 10);
      expect(res.body.data.pagination).toHaveProperty("total");
      expect(res.body.data.pagination).toHaveProperty("pages");
    });

    it("should filter events by category", async () => {
      // Create an event with a different category to test filtering
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);
      await Event.create({
        title: "Music Fest",
        description: "A fantastic music festival with many bands playing live.", // Ensure minLength
        category: "concert", // Using 'concert' from the valid enum
        location: "City Park",
        venue: "Open Field",
        date: futureDate.toISOString().split("T")[0],
        time: "15:00",
        price: 75,
        totalSeats: 500,
        availableSeats: 500,
        createdBy: adminUser._id,
        imageUrl: "http://example.com/music.jpg",
      });

      const res = await request(app)
        .get("/api/events")
        .query({ category: "concert" }) // Query for 'concert'
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThan(0);
      expect(
        res.body.data.events.every((e: any) => e.category === "concert")
      ).toBe(true);
    });

    it("should search events by title or description", async () => {
      const res = await request(app)
        .get("/api/events")
        .query({ search: "Test Event for CRUD" }) // Search for the initial testEvent
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThan(0);
      expect(res.body.data.events[0].title).toContain("Test Event for CRUD");
    });

    it("should sort events by date in ascending order", async () => {
      // Create additional events with different dates for sorting
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);

      await Event.create([
        {
          title: "Early Future Event",
          description: "This event is happening tomorrow, very exciting.", // Ensure minLength
          category: "workshop", // Must be a valid category
          location: "Test Location 2",
          venue: "Test Venue 2",
          date: tomorrow.toISOString().split("T")[0],
          time: "10:00",
          price: 50,
          totalSeats: 50,
          availableSeats: 50,
          createdBy: adminUser._id,
          imageUrl: "http://example.com/early.jpg",
        },
        {
          title: "Later Future Event",
          description:
            "This event is happening day after tomorrow, mark your calendars.", // Ensure minLength
          category: "seminar", // Must be a valid category
          location: "Test Location 3",
          venue: "Test Venue 3",
          date: dayAfterTomorrow.toISOString().split("T")[0],
          time: "14:00",
          price: 75,
          totalSeats: 75,
          availableSeats: 75,
          createdBy: adminUser._id,
          imageUrl: "http://example.com/later.jpg",
        },
      ]);

      const res = await request(app)
        .get("/api/events")
        .query({ sortBy: "date", sortOrder: "asc" })
        .expect(200);

      expect(res.body.success).toBe(true);
      const dates = res.body.data.events.map((e: any) =>
        new Date(e.date).getTime()
      );
      // Ensure the dates are sorted correctly (ignoring time part of date string)
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i + 1]);
      }
    });

    it("should filter events by location (case-insensitive)", async () => {
      const res = await request(app)
        .get("/api/events")
        .query({ location: "test location" }) // Test case-insensitive
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThan(0);
      expect(
        res.body.data.events.every((e: any) =>
          e.location.toLowerCase().includes("test location")
        )
      ).toBe(true);
    });

    it("should filter events by exact time", async () => {
      // Create an event with a specific time
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 9);
      await Event.create({
        title: "Evening Show",
        description: "A captivating show happening in the evening.", // Ensure minLength
        category: "exhibition", // Using 'exhibition' from the valid enum
        location: "Theater",
        venue: "Main Stage",
        date: futureDate.toISOString().split("T")[0],
        time: "20:30",
        price: 30,
        totalSeats: 200,
        availableSeats: 200,
        createdBy: adminUser._id,
        imageUrl: "http://example.com/show.jpg",
      });

      const res = await request(app)
        .get("/api/events")
        .query({ time: "20:30" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThan(0);
      expect(res.body.data.events.every((e: any) => e.time === "20:30")).toBe(
        true
      );
    });
  });

  describe("GET /api/events/:id", () => {
    it("should return a single event by ID", async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.event).toHaveProperty(
        "_id",
        testEvent._id.toString()
      );
      expect(res.body.data.event).toHaveProperty(
        "title",
        "Test Event for CRUD"
      );
      expect(res.body.data.event.createdBy).toHaveProperty(
        "name",
        adminUser.name
      );
    });

    it("should return 404 for non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/events/${nonExistentId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Event not found");
    });

    it("should return 400 for invalid event ID format", async () => {
      const res = await request(app).get("/api/events/invalid-id").expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid event ID format");
    });
  });

  describe("POST /api/events", () => {
    const newEventData = {
      title: "Brand New Event",
      description: "A newly created event with a detailed description.", // Ensure minLength
      category: "workshop", // Using 'workshop' from the valid enum
      location: "Online",
      venue: "Zoom",
      date: new Date(new Date().setDate(new Date().getDate() + 10))
        .toISOString()
        .split("T")[0], // 10 days in future
      time: "12:00",
      price: 150,
      totalSeats: 200,
      availableSeats: 200,
      imageUrl: "http://example.com/new.jpg",
    };

    it("should create a new event as admin", async () => {
      const res = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newEventData)
        .expect(201); // Expecting 201 Created

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Event created successfully");
      expect(res.body.data.event).toHaveProperty("_id");
      expect(res.body.data.event).toHaveProperty("title", newEventData.title);
      expect(res.body.data.event.createdBy).toHaveProperty(
        "name",
        adminUser.name
      );

      // Verify event exists in DB
      const createdEvent = await Event.findById(res.body.data.event._id);
      expect(createdEvent).not.toBeNull();
      expect(createdEvent?.title).toBe(newEventData.title);
    });

    it("should return 403 for non-admin users trying to create an event", async () => {
      const res = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${userToken}`)
        .send(newEventData)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. Insufficient permissions.");
    });

    it("should return 401 for unauthenticated users trying to create an event", async () => {
      const res = await request(app)
        .post("/api/events")
        .send(newEventData)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. No token provided.");
    });

    it("should return 400 for invalid event data (validation error)", async () => {
      const invalidEvent = { ...newEventData, title: "" }; // Missing required title
      const res = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidEvent)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Validation failed"); // Corrected expected message
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.title).toBeDefined();
    });

    it("should return 400 for event date in the past", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday
      const invalidEvent = {
        ...newEventData,
        date: pastDate.toISOString().split("T")[0],
      };
      const res = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidEvent)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Event date must be in the future"); // Corrected expected message
    });
  });

  describe("PUT /api/events/:id", () => {
    let eventByRegularUser: any; // An event created by a regular user for testing permissions

    beforeEach(async () => {
      // Create an event specifically for the regular user to test creator permissions
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 12);
      eventByRegularUser = await Event.create({
        title: "User's Event to Update",
        description:
          "This event is created by a regular user for testing purposes.", // Ensure minLength
        category: "meetup", // Must be a valid category
        location: "Community Center",
        venue: "Room 101",
        date: futureDate.toISOString().split("T")[0],
        time: "17:00",
        price: 20,
        totalSeats: 50,
        availableSeats: 50,
        createdBy: regularUser._id,
        imageUrl: "http://example.com/user_event.jpg",
      });
      // Explicitly verify the creator ID for debugging
      expect(eventByRegularUser.createdBy.toString()).toBe(
        regularUser._id.toString()
      );
    });

    const updatedData = {
      title: "Updated Event Title",
      description: "Updated description with more details for the event.", // Ensure minLength
      price: 200,
    };

    it("should update an event as admin", async () => {
      const res = await request(app)
        .put(`/api/events/${testEvent._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatedData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Event updated successfully");
      expect(res.body.data.event).toHaveProperty("title", updatedData.title);
      expect(res.body.data.event).toHaveProperty("price", updatedData.price);

      const updatedEventInDb = await Event.findById(testEvent._id);
      expect(updatedEventInDb?.title).toBe(updatedData.title);
    });

    it("should update an event as the creator (regular user)", async () => {
      const res = await request(app)
        .put(`/api/events/${eventByRegularUser._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updatedData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Event updated successfully");
      expect(res.body.data.event).toHaveProperty("title", updatedData.title);
    });

    it("should return 403 if non-creator/non-admin tries to update event", async () => {
      // A different regular user trying to update testEvent (created by admin)
      const anotherUser = await User.create({
        name: "Another User",
        email: "another@test.com",
        password: "password123",
        role: "user",
      });
      const anotherUserToken = generateToken(
        anotherUser._id.toString(),
        "user"
      );

      const res = await request(app)
        .put(`/api/events/${testEvent._id}`)
        .set("Authorization", `Bearer ${anotherUserToken}`)
        .send(updatedData)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. Insufficient permissions.");
    });

    it("should return 401 for unauthenticated users trying to update event", async () => {
      const res = await request(app)
        .put(`/api/events/${testEvent._id}`)
        .send(updatedData)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. No token provided.");
    });

    it("should return 400 for invalid event ID format", async () => {
      const res = await request(app)
        .put("/api/events/invalid-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatedData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid event ID format");
    });

    it("should return 404 for non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/events/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatedData)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Event not found");
    });

    it("should return 400 for invalid update data (validation error)", async () => {
      const invalidUpdate = { price: -100 }; // Invalid price
      const res = await request(app)
        .put(`/api/events/${testEvent._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Validation failed");
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.price).toBeDefined();
    });
  });

  describe("DELETE /api/events/:id", () => {
    let eventToDeleteByCreator: any; // An event created by a regular user for deletion test

    beforeEach(async () => {
      // Create an event specifically for the regular user to test creator permissions
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      eventToDeleteByCreator = await Event.create({
        title: "User's Event to Delete",
        description: "Created by regular user for deletion testing.", // Ensure minLength
        category: "workshop", // Must be a valid category
        location: "Online",
        venue: "Platform",
        date: futureDate.toISOString().split("T")[0],
        time: "11:00",
        price: 0, // Free event
        totalSeats: 100,
        availableSeats: 100,
        createdBy: regularUser._id,
        imageUrl: "http://example.com/delete_user_event.jpg",
      });
      // Explicitly verify the creator ID for debugging
      expect(eventToDeleteByCreator.createdBy.toString()).toBe(
        regularUser._id.toString()
      );
    });

    it("should delete event as admin", async () => {
      // Create a new event specifically for this test to ensure it's deleted
      const tempEvent = await Event.create({
        title: "Temp Event for Admin Delete",
        description: "This event will be deleted by an admin user.", // Ensure minLength
        category: "conference", // Must be a valid category
        location: "Admin Location",
        venue: "Admin Venue",
        date: new Date(new Date().setDate(new Date().getDate() + 20))
          .toISOString()
          .split("T")[0],
        time: "09:00",
        price: 50,
        totalSeats: 50,
        availableSeats: 50,
        createdBy: adminUser._id,
        imageUrl: "http://example.com/temp_admin_delete.jpg",
      });

      const res = await request(app)
        .delete(`/api/events/${tempEvent._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Event deleted successfully");

      // Verify event is actually deleted
      const deletedEvent = await Event.findById(tempEvent._id);
      expect(deletedEvent).toBeNull();
    });

    it("should delete event as the creator (regular user)", async () => {
      const res = await request(app)
        .delete(`/api/events/${eventToDeleteByCreator._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200); // Expecting 200 OK

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Event deleted successfully");

      const deletedEvent = await Event.findById(eventToDeleteByCreator._id);
      expect(deletedEvent).toBeNull();
    });

    it("should return 403 if non-creator/non-admin tries to delete event", async () => {
      // A different regular user trying to delete testEvent (created by admin)
      const anotherUser = await User.create({
        name: "Another User for Delete",
        email: "another_delete@test.com",
        password: "password123",
        role: "user",
      });
      const anotherUserToken = generateToken(
        anotherUser._id.toString(),
        "user"
      );

      const res = await request(app)
        .delete(`/api/events/${testEvent._id}`)
        .set("Authorization", `Bearer ${anotherUserToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. Insufficient permissions.");

      // Ensure event was NOT deleted
      const eventStillExists = await Event.findById(testEvent._id);
      expect(eventStillExists).not.toBeNull();
    });

    it("should return 401 for unauthenticated users trying to delete event", async () => {
      const res = await request(app)
        .delete(`/api/events/${testEvent._id}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Access denied. No token provided.");
    });

    it("should return 400 for invalid event ID format", async () => {
      const res = await request(app)
        .delete("/api/events/invalid-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid event ID format");
    });

    it("should return 404 for non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/events/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Event not found");
    });
  });

  describe("GET /api/events/categories", () => {
    it("should return a list of distinct event categories", async () => {
      // Ensure there are events with various categories
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 25);
      await Event.create([
        {
          title: "Category Test 1",
          description: "This is a test event for category filtering.", // Ensure minLength
          category: "sports", // Must be a valid category
          location: "Stadium",
          venue: "Field",
          date: futureDate.toISOString().split("T")[0],
          time: "10:00",
          price: 10,
          totalSeats: 100,
          availableSeats: 100,
          createdBy: adminUser._id,
          imageUrl: "http://example.com/cat1.jpg",
        },
        {
          title: "Category Test 2",
          description: "Another test event for category filtering.", // Ensure minLength
          category: "networking", // Must be a valid category
          location: "Online",
          venue: "Web",
          date: futureDate.toISOString().split("T")[0],
          time: "14:00",
          price: 0,
          totalSeats: 1000,
          availableSeats: 1000,
          createdBy: adminUser._id,
          imageUrl: "http://example.com/cat2.jpg",
        },
      ]);

      const res = await request(app).get("/api/events/categories").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.categories).toBeInstanceOf(Array);
      expect(res.body.data.categories).toContain("conference"); // From testEvent
      expect(res.body.data.categories).toContain("sports");
      expect(res.body.data.categories).toContain("networking");
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle errors when fetching categories", async () => {
      // Temporarily disconnect mongoose to simulate a DB error
      await mongoose.disconnect();

      const res = await request(app).get("/api/events/categories").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Error fetching categories");
      expect(res.body.error).toBeDefined();

      // Reconnect mongoose for subsequent tests
      await mongoose.connect(mongoServer.getUri());
    });
  });

  describe("GET /api/events/locations", () => {
    it("should return a list of distinct event locations", async () => {
      // Ensure there are events with various locations
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 26);
      await Event.create([
        {
          title: "Location Test 1",
          description: "This event is for testing location filtering.", // Ensure minLength
          category: "other", // Must be a valid category
          location: "New York",
          venue: "Venue X",
          date: futureDate.toISOString().split("T")[0],
          time: "09:00",
          price: 10,
          totalSeats: 50,
          availableSeats: 50,
          createdBy: adminUser._id,
          imageUrl: "http://example.com/loc1.jpg",
        },
        {
          title: "Location Test 2",
          description: "Another event for testing location filtering.", // Ensure minLength
          category: "other", // Must be a valid category
          location: "London",
          venue: "Venue Y",
          date: futureDate.toISOString().split("T")[0],
          time: "13:00",
          price: 0,
          totalSeats: 200,
          availableSeats: 200,
          createdBy: adminUser._id,
          imageUrl: "http://example.com/loc2.jpg",
        },
      ]);

      const res = await request(app).get("/api/events/locations").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.locations).toBeInstanceOf(Array);
      expect(res.body.data.locations).toContain("Test Location"); // From initial testEvent
      expect(res.body.data.locations).toContain("New York");
      expect(res.body.data.locations).toContain("London");
      expect(res.body.data.locations.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle errors when fetching locations", async () => {
      // Temporarily disconnect mongoose to simulate a DB error
      await mongoose.disconnect();

      const res = await request(app).get("/api/events/locations").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Error fetching locations");
      expect(res.body.error).toBeDefined();

      // Reconnect mongoose for subsequent tests
      await mongoose.connect(mongoServer.getUri());
    });
  });
});
