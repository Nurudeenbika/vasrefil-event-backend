"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI ||
      "mongodb+srv://nurudeenhassan:nurudeenhassan@cluster0.ri4ry38.mongodb.net/event-bookings?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose_1.default.connect(mongoURI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
exports.default = connectDB;
//# sourceMappingURL=database.js.map
