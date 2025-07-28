import { Request, Response, NextFunction } from "express";
import errorHandler from "../../src/middleware/errorHandler"; // Adjust path as needed

// Define a custom error interface for testing purposes, matching the middleware's expectation
interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: any;
  errors?: { [key: string]: { message: string } };
}

describe("Error Handler Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;

  // Before each test, set up fresh mocks and spy on console.error
  beforeEach(() => {
    mockRequest = {}; // Request object is not typically used in this middleware, so it can be empty
    mockResponse = {
      status: jest.fn().mockReturnThis(), // Mock status to allow chaining .json()
      json: jest.fn(), // Mock json to capture the response body
    };
    mockNext = jest.fn(); // Mock next function, though it shouldn't be called by errorHandler

    // Spy on console.error to check if errors are logged without actually printing them during tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // After each test, restore the original console.error implementation
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // Test case 1: Handles a generic error with default 500 status and message
  it("should handle a generic error with default 500 status and message", () => {
    const err: CustomError = new Error("Something went wrong");

    errorHandler(
      err,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Expect console.error to have been called with the error
    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    // Expect response status to be 500
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    // Expect response JSON to contain success: false and the error message
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Something went wrong",
    });
    // Expect next function not to be called
    expect(mockNext).not.toHaveBeenCalled();
  });

  // Test case 2: Handles Mongoose CastError (bad ObjectId)
  it("should handle Mongoose CastError with 404 status", () => {
    const err: CustomError = new Error("Cast to ObjectId failed");
    err.name = "CastError"; // Simulate a Mongoose CastError

    errorHandler(
      err,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Resource not found",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // Test case 3: Handles Mongoose duplicate key error (code 11000)
  it("should handle Mongoose duplicate key error (code 11000) with 400 status", () => {
    const err: CustomError = new Error("Duplicate key error");
    err.code = 11000; // Simulate a Mongoose duplicate key error
    err.keyValue = { email: "test@example.com" }; // Optional: simulate the duplicate field

    errorHandler(
      err,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Duplicate field value entered",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // Test case 4: Handles Mongoose ValidationError
  it("should handle Mongoose ValidationError with 400 status and detailed messages", () => {
    const err: CustomError = new Error("Validation failed");
    err.name = "ValidationError"; // Simulate a Mongoose ValidationError
    err.errors = {
      // Simulate validation error details
      name: { message: "Name is required" },
      email: { message: "Invalid email format" },
    };

    errorHandler(
      err,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Name is required, Invalid email format", // Expect combined messages
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // Test case 5: Handles an error with a pre-defined statusCode
  it("should use the provided statusCode if available", () => {
    const err: CustomError = new Error("Unauthorized");
    err.statusCode = 401; // Simulate an error with a custom status code

    errorHandler(
      err,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Unauthorized",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // Test case 6: Handles a generic error with no message
  it('should handle a generic error with no message and default to "Server Error"', () => {
    const err: CustomError = { name: "", message: "" }; // An error object with no message property
    // For a real Error object, message is always present, but for CustomError, it might not be.
    // If it's a generic error, it should default to "Server Error".
    // We'll simulate this by not setting err.message explicitly.

    errorHandler(
      err,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Server Error",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
