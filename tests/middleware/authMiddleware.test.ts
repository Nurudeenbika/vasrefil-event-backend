import { Response, NextFunction, Request } from "express"; // Import Request
import jwt from "jsonwebtoken";
import { authenticate, authorize } from "../../src/middleware/auth";
import User from "../../src/models/User";
import { AuthRequest } from "../../src/types";

// Mock the jsonwebtoken library
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

// Mock the User model
jest.mock("../../src/models/User", () => ({
  findById: jest.fn(),
}));

// Mock process.env.JWT_SECRET
const OLD_ENV = process.env;
beforeEach(() => {
  jest.resetModules(); // Clears the cache for modules, important for process.env
  process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" }; // Set a consistent secret for tests
});

afterAll(() => {
  process.env = OLD_ENV; // Restore original env
});

// Define a mock AuthRequest interface for testing purposes.
// It extends the base Express Request interface to satisfy TypeScript,
// and then adds the 'user' property and mocks any specific methods like 'header'.
interface MockAuthRequest extends Request {
  header: jest.Mock; // Mock the header method
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

describe("Authentication Middleware", () => {
  let mockRequest: MockAuthRequest;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Initialize mockRequest as a partial Request object, then cast it.
    // This ensures it has all the base Request properties while allowing us to mock specific ones.
    mockRequest = {
      header: jest.fn(),
      // Add other common Request properties if your middleware uses them, e.g.:
      // body: {},
      // params: {},
      // query: {},
      // method: 'GET',
      // url: '/',
    } as MockAuthRequest;

    mockResponse = {
      status: jest.fn().mockReturnThis(), // Allow chaining .json() after .status()
      json: jest.fn(), // Capture the JSON response
    };

    mockNext = jest.fn(); // Mock the next middleware function

    // Spy on console.error to prevent it from cluttering test output
    // and to verify if it's called in error scenarios.
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.error function after each test
    consoleErrorSpy.mockRestore();
  });

  // Test case 1: No token provided
  it("should return 401 if no token is provided", async () => {
    mockRequest.header.mockReturnValue(undefined); // Simulate no Authorization header

    await authenticate(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. No token provided.",
    });
    expect(mockNext).not.toHaveBeenCalled(); // next should not be called on failure
    expect(jwt.verify).not.toHaveBeenCalled(); // jwt.verify should not be called
    expect(consoleErrorSpy).not.toHaveBeenCalled(); // No error should be logged for this specific case
  });
});

describe("Authorization Middleware", () => {
  let mockRequest: MockAuthRequest;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      header: jest.fn(), // Not strictly needed for authorize, but good to keep consistent
    } as MockAuthRequest;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  // Test case 1: No req.user (user not authenticated)
  it("should return 401 if req.user is not set", () => {
    mockRequest.user = undefined; // Simulate unauthenticated request
    const authorizeMiddleware = authorize("admin");

    authorizeMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Please authenticate first.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // Test case 2: User role not included in allowed roles
  it("should return 403 if user role is not in allowed roles", () => {
    mockRequest.user = { id: "123", email: "user@example.com", role: "user" };
    const authorizeMiddleware = authorize("admin", "manager"); // Allowed roles

    authorizeMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Insufficient permissions.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // Test case 3: User role is included in allowed roles (single role)
  it("should call next if user role is in allowed roles (single role)", () => {
    mockRequest.user = { id: "123", email: "admin@example.com", role: "admin" };
    const authorizeMiddleware = authorize("admin"); // Allowed role

    authorizeMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  // Test case 4: User role is included in allowed roles (multiple roles)
  it("should call next if user role is in allowed roles (multiple roles)", () => {
    mockRequest.user = {
      id: "123",
      email: "manager@example.com",
      role: "manager",
    };
    const authorizeMiddleware = authorize("admin", "manager", "editor"); // Allowed roles

    authorizeMiddleware(
      mockRequest as AuthRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
