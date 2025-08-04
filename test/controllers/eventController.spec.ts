import { expect } from "chai";
import sinon from "sinon";
import mongoose from "mongoose";
import { Request, Response } from "express";
import * as eventController from "../../src/controllers/eventController";
import Event from "../../src/models/Event";
import User from "../../src/models/User";
import { AuthRequest } from "../../src/types";

describe("Event Controller", () => {
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
    await Event.deleteMany({});
    await User.deleteMany({});
    sandbox.restore();
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe("getEvents", () => {
    it("should return paginated events", async () => {
      // Create test user
      const user = new User({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
      await user.save();

      // Create test events
      const event1 = new Event({
        title: "Music Festival",
        date: new Date(Date.now() + 86400000),
        category: "Music",
        location: "New York",
        createdBy: user._id,
      });
      const event2 = new Event({
        title: "Tech Conference",
        date: new Date(Date.now() + 86400000 * 2),
        category: "Technology",
        location: "San Francisco",
        createdBy: user._id,
      });
      await Promise.all([event1.save(), event2.save()]);

      mockRequest = { query: { page: "1", limit: "10" } };

      await eventController.getEvents(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      const responseData = jsonStub.firstCall.args[0].data;
      expect(responseData.events.length).to.equal(2);
      expect(responseData.pagination.total).to.equal(2);
    });

    it("should filter events by category", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      const musicEvent = new Event({
        title: "Music Festival",
        category: "Music",
        createdBy: user._id,
      });
      const techEvent = new Event({
        title: "Tech Conference",
        category: "Technology",
        createdBy: user._id,
      });
      await Promise.all([musicEvent.save(), techEvent.save()]);

      mockRequest = { query: { category: "Music" } };

      await eventController.getEvents(
        mockRequest as Request,
        mockResponse as Response
      );

      const responseData = jsonStub.firstCall.args[0].data;
      expect(responseData.events.length).to.equal(1);
      expect(responseData.events[0].category).to.equal("Music");
    });

    it("should search events by text", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      const musicEvent = new Event({
        title: "Music Festival",
        description: "Annual music festival",
        createdBy: user._id,
      });
      const techEvent = new Event({
        title: "Tech Conference",
        description: "Annual tech conference",
        createdBy: user._id,
      });
      await Promise.all([musicEvent.save(), techEvent.save()]);

      mockRequest = { query: { search: "music" } };

      await eventController.getEvents(
        mockRequest as Request,
        mockResponse as Response
      );

      const responseData = jsonStub.firstCall.args[0].data;
      expect(responseData.events.length).to.equal(1);
      expect(responseData.events[0].title).to.equal("Music Festival");
    });
  });

  describe("getEvent", () => {
    it("should return a single event", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      const event = new Event({
        title: "Test Event",
        createdBy: user._id,
      });
      await event.save();

      mockRequest = { params: { id: event._id.toString() } };

      await eventController.getEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.event._id.toString()).to.equal(
        event._id.toString()
      );
    });

    it("should return 404 for non-existent event", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      mockRequest = { params: { id: fakeId.toString() } };

      await eventController.getEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(404)).to.be.true;
    });

    it("should return 400 for invalid ID format", async () => {
      mockRequest = { params: { id: "invalid-id" } };

      await eventController.getEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(400)).to.be.true;
    });
  });

  describe("createEvent", () => {
    it("should create a new event", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      mockRequest = {
        user: {
          id: user._id.toString(),
          email: "",
          role: "",
        },
        body: {
          title: "New Event",
          date: new Date(),
          category: "Music",
          location: "New York",
        },
      };

      await eventController.createEvent(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(201)).to.be.true;
      const responseData = jsonStub.firstCall.args[0].data;
      expect(responseData.event.title).to.equal("New Event");
      expect(responseData.event.createdBy.toString()).to.equal(
        user._id.toString()
      );
    });

    it("should return 400 for invalid event data", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      mockRequest = {
        user: {
          id: user._id.toString(),
          email: "",
          role: "",
        },
        body: {}, // Missing required fields
      };

      await eventController.createEvent(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(400)).to.be.true;
    });
  });

  describe("updateEvent", () => {
    it("should update an event", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      const event = new Event({
        title: "Old Title",
        createdBy: user._id,
      });
      await event.save();

      mockRequest = {
        user: {
          id: user._id.toString(),
          email: "",
          role: "",
        },
        params: { id: event._id.toString() },
        body: { title: "New Title" },
      };

      await eventController.updateEvent(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.event.title).to.equal("New Title");
    });

    it("should return 403 for non-creator user", async () => {
      const creator = new User({
        name: "Creator",
        email: "creator@example.com",
      });
      const otherUser = new User({ name: "Other", email: "other@example.com" });
      await Promise.all([creator.save(), otherUser.save()]);

      const event = new Event({
        title: "Test Event",
        createdBy: creator._id,
      });
      await event.save();

      mockRequest = {
        user: {
          id: otherUser._id.toString(),
          email: "",
          role: "",
        },
        params: { id: event._id.toString() },
        body: { title: "New Title" },
      };

      await eventController.updateEvent(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(403)).to.be.true;
    });
  });

  describe("deleteEvent", () => {
    it("should delete an event", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      const event = new Event({
        title: "Test Event",
        createdBy: user._id,
      });
      await event.save();

      mockRequest = {
        user: {
          id: user._id.toString(),
          email: "",
          role: "",
        },
        params: { id: event._id.toString() },
      };

      await eventController.deleteEvent(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      const deletedEvent = await Event.findById(event._id);
      expect(deletedEvent).to.be.null;
    });
  });

  describe("getEventCategories", () => {
    it("should return distinct categories", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      const event1 = new Event({
        title: "Music",
        category: "Music",
        createdBy: user._id,
      });
      const event2 = new Event({
        title: "Tech",
        category: "Technology",
        createdBy: user._id,
      });
      const event3 = new Event({
        title: "Music 2",
        category: "Music",
        createdBy: user._id,
      });
      await Promise.all([event1.save(), event2.save(), event3.save()]);

      await eventController.getEventCategories(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.categories).to.have.members([
        "Music",
        "Technology",
      ]);
    });
  });

  describe("getEventLocations", () => {
    it("should return distinct locations", async () => {
      const user = new User({ name: "Test User", email: "test@example.com" });
      await user.save();

      const event1 = new Event({
        title: "NY Event",
        location: "New York",
        createdBy: user._id,
      });
      const event2 = new Event({
        title: "SF Event",
        location: "San Francisco",
        createdBy: user._id,
      });
      const event3 = new Event({
        title: "NY Event 2",
        location: "New York",
        createdBy: user._id,
      });
      await Promise.all([event1.save(), event2.save(), event3.save()]);

      await eventController.getEventLocations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.locations).to.have.members([
        "New York",
        "San Francisco",
      ]);
    });
  });
});
