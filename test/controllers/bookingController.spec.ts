import { expect } from "chai";
import sinon from "sinon";
import mongoose from "mongoose";
import { Request, Response } from "express";
import * as bookingController from "../../src/controllers/bookingController";
import Booking from "../../src/models/Booking";
import Event from "../../src/models/Event";
import User from "../../src/models/User";

describe("Booking Controller", () => {
  let sandbox: sinon.SinonSandbox;
  let mockRequest: Partial<Request & { user?: any }>;
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

  afterEach(() => {
    sandbox.restore();
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe("createBooking", () => {
    it("should create a new booking", async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();

      const event = new Event({
        _id: eventId,
        title: "Test Event",
        date: new Date(Date.now() + 86400000),
        price: 50,
        availableSeats: 100,
      });
      await event.save();

      mockRequest = {
        user: { id: userId.toString() },
        body: {
          event: eventId.toString(),
          seatsBooked: 2,
          paymentDetails: { token: "test_token" },
          bookingDetails: { notes: "Test booking" },
        },
      };

      await bookingController.createBooking(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(201)).to.be.true;
      expect(jsonStub.calledOnce).to.be.true;

      const responseArgs = jsonStub.firstCall.args[0];
      expect(responseArgs.success).to.be.true;
      expect(responseArgs.data.booking).to.exist;
    });

    it("should return error for past events", async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();

      const pastEvent = new Event({
        _id: eventId,
        title: "Past Event",
        date: new Date(Date.now() - 86400000), // Yesterday
        price: 50,
        availableSeats: 100,
      });
      await pastEvent.save();

      mockRequest = {
        user: { id: userId.toString() },
        body: {
          event: eventId.toString(),
          seatsBooked: 2,
          paymentDetails: { token: "test_token" },
        },
      };

      await bookingController.createBooking(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(400)).to.be.true;
      expect(jsonStub.firstCall.args[0].message).to.equal(
        "Cannot book tickets for past events"
      );
    });
  });

  describe("cancelBooking", () => {
    it("should cancel a booking", async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();

      const futureEvent = new Event({
        _id: eventId,
        title: "Future Event",
        date: new Date(Date.now() + 86400000 * 2), // 2 days from now
        price: 50,
        availableSeats: 98,
      });
      await futureEvent.save();

      const booking = new Booking({
        _id: bookingId,
        user: userId,
        event: eventId,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
        paymentId: "txn_123",
      });
      await booking.save();

      mockRequest = {
        user: { id: userId.toString() },
        params: { id: bookingId.toString() },
      };

      await bookingController.cancelBooking(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;

      const updatedBooking = await Booking.findById(bookingId);
      expect(updatedBooking?.status).to.equal("cancelled");

      const updatedEvent = await Event.findById(eventId);
      expect(updatedEvent?.availableSeats).to.equal(100);
    });
  });

  describe("getUserBookings", () => {
    it("should return user bookings", async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();

      const event = new Event({
        _id: eventId,
        title: "Test Event",
        date: new Date(),
        price: 50,
      });
      await event.save();

      const booking = new Booking({
        user: userId,
        event: eventId,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
      });
      await booking.save();

      mockRequest = {
        user: { id: userId.toString() },
        query: {},
      };

      await bookingController.getUserBookings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.bookings.length).to.equal(1);
    });
  });

  describe("getBookingById", () => {
    it("should return a specific booking", async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();

      const booking = new Booking({
        _id: bookingId,
        user: userId,
        event: eventId,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
      });
      await booking.save();

      mockRequest = {
        user: { id: userId.toString() },
        params: { id: bookingId.toString() },
      };

      await bookingController.getBookingById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.booking._id.toString()).to.equal(
        bookingId.toString()
      );
    });
  });

  describe("getAllBookings", () => {
    it("should return all bookings for admin", async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();

      const booking = new Booking({
        user: userId,
        event: eventId,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
      });
      await booking.save();

      mockRequest = {
        user: { id: userId.toString(), role: "admin" },
        query: {},
      };

      await bookingController.getAllBookings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.bookings.length).to.equal(1);
    });
  });

  describe("getEventBookings", () => {
    it("should return bookings for a specific event", async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();

      const booking = new Booking({
        user: userId,
        event: eventId,
        seatsBooked: 2,
        totalAmount: 100,
        status: "confirmed",
      });
      await booking.save();

      mockRequest = {
        params: { eventId: eventId.toString() },
        query: {},
      };

      await bookingController.getEventBookings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusStub.calledWith(200)).to.be.true;
      expect(jsonStub.firstCall.args[0].data.bookings.length).to.equal(1);
    });
  });
});
