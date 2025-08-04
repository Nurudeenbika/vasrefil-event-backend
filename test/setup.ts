import "mocha";
import chai from "chai";
import chaiHttp from "chai-http";
//import sinon from 'sinon';
import mongoose from "mongoose";
import app from "../src/app";
import User from "../src/models/User";

chai.use(chaiHttp);
export const { expect } = chai;

// Global hooks
before(async () => {
  // Connect to test database
  await mongoose.connect(
    process.env.MONGODB_URI_TEST ||
      "mongodb://localhost:27017/event-bookings-test"
  );
});

after(async () => {
  // Disconnect from database
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Clear database before each test
  await User.deleteMany({});
});
