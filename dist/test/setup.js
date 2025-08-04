"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = void 0;
require("mocha");
const chai_1 = __importDefault(require("chai"));
const chai_http_1 = __importDefault(require("chai-http"));
//import sinon from 'sinon';
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../src/models/User"));
chai_1.default.use(chai_http_1.default);
exports.expect = chai_1.default.expect;
// Global hooks
before(async () => {
    // Connect to test database
    await mongoose_1.default.connect(process.env.MONGODB_URI_TEST ||
        "mongodb://localhost:27017/event-bookings-test");
});
after(async () => {
    // Disconnect from database
    await mongoose_1.default.connection.dropDatabase();
    await mongoose_1.default.disconnect();
});
beforeEach(async () => {
    // Clear database before each test
    await User_1.default.deleteMany({});
});
//# sourceMappingURL=setup.js.map