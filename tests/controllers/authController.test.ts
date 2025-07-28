import {
  register,
  login,
  loginAdmin,
  registerAdmin,
  getProfile,
} from "../../src/controllers/authController";
import User from "../../src/models/User";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../src/types"; // Import AuthRequest type
import mongoose from "mongoose"; // Import mongoose for ObjectId

// Mock the entire User module and jsonwebtoken
jest.mock("../../src/models/User", () => {
  const actual = jest.requireActual("../../src/models/User");
  return {
    ...actual,
    findOne: jest.fn(),
    create: jest.fn(), // Keep create mock for register controller
    findById: jest.fn(),
    // Mock the constructor for `new User()` calls
    // This mock will be overridden in specific tests if needed
    default: jest.fn().mockImplementation((data) => {
      // Default implementation for new User()
      const instance = actual.default(data); // Call actual constructor for schema validation etc.
      instance.save = jest.fn().mockResolvedValue(instance); // Mock save on the instance
      return instance;
    }),
  };
});
jest.mock("jsonwebtoken");

// Helper to mock a user instance with a comparePassword method
// This mock now includes `getJwtToken` and `toObject` to simulate a Mongoose document
const mockUserInstance = (userData: any, isPasswordMatch: boolean = true) => {
  const user = {
    ...userData,
    // Ensure _id is a string or ObjectId for consistency in tests
    _id: userData._id || new mongoose.Types.ObjectId().toHexString(),
    comparePassword: jest.fn().mockResolvedValue(isPasswordMatch),
    // Mock getJwtToken method that your User model might have
    getJwtToken: jest.fn().mockReturnValue("fake-token"),
    // Mock populate and save if they are called on the user instance
    populate: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(userData),
  };

  // Add toObject that returns a plain object representation, mimicking Mongoose's behavior
  user.toObject = jest.fn().mockImplementation(function (this: any) {
    // Explicitly type 'this'
    const obj = { ...this }; // Copy properties from the mock user instance
    // Remove sensitive fields and mock methods from the returned object
    delete obj.password;
    obj.id = obj._id; // Map _id to id as commonly done in responses
    delete obj._id;
    // Delete mock methods to ensure the returned object is clean for assertions
    delete obj.comparePassword;
    delete obj.getJwtToken;
    delete obj.populate;
    delete obj.save;
    delete obj.toObject; // Prevent infinite recursion if toObject calls itself
    return obj;
  });

  return user;
};

describe("Auth Controller - Register", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: "user",
      },
    };
    res = {
      status: statusMock,
    } as unknown as Response;

    jest.clearAllMocks();
    // Spy on console.error, but don't suppress it globally for this suite unless needed by specific tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should register a new user successfully", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    const createdUser = mockUserInstance({
      _id: "fake-id",
      name: "Test User",
      email: "test@example.com",
      role: "user",
    });
    (User.create as jest.Mock).mockResolvedValue(createdUser);
    (jwt.sign as jest.Mock).mockReturnValue("fake-token");

    await register(req as Request, res as Response);

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(User.create).toHaveBeenCalledWith({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "user",
    });
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      message: "User registered successfully",
      data: {
        user: createdUser.toObject(), // Use toObject for comparison
        token: "fake-token",
      },
    });
  });

  it("should return 400 if user already exists", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(true);

    await register(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "User already exists with this email",
    });
  });

  it("should handle unexpected errors gracefully", async () => {
    (User.findOne as jest.Mock).mockRejectedValue(new Error("DB Error"));

    await register(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Error registering user",
      error: "DB Error",
    });
    // Controller does NOT call console.error in this catch block, so no assertion here
  });
});

describe("Auth Controller - Login", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonMock = jest.fn();
    // For login, the controller calls res.json directly for success, not res.status().json()
    // For error, it calls res.status().json()
    statusMock = jest.fn(() => ({ json: jsonMock }));
    req = {
      body: {
        email: "test@example.com",
        password: "password123",
      },
    };
    res = {
      json: jsonMock, // Direct mock for res.json
      status: statusMock, // For when res.status is explicitly called (e.g., errors)
    } as unknown as Response;

    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should log in a user successfully", async () => {
    const user = mockUserInstance({
      _id: "fake-id",
      name: "Test User",
      email: "test@example.com",
      role: "user",
    });

    const mockSelect = jest.fn().mockResolvedValue(user);
    (User.findOne as jest.Mock).mockReturnValue({
      select: mockSelect, // Mock select for password
    });
    (jwt.sign as jest.Mock).mockReturnValue("fake-token");

    await login(req as Request, res as Response);

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(user.comparePassword).toHaveBeenCalledWith("password123");
    // Controller calls res.json directly, which defaults to 200, so no statusMock expectation here
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      message: "Login successful",
      data: {
        user: user.toObject(), // Use toObject for comparison
        token: "fake-token",
      },
    });
  });

  it("should return 401 for invalid credentials (user not found)", async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await login(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Invalid credentials",
    });
  });

  it("should return 401 for invalid credentials (password mismatch)", async () => {
    const user = mockUserInstance(
      {
        _id: "fake-id",
        name: "Test User",
        email: "test@example.com",
        role: "user",
      },
      false
    ); // Mock comparePassword to return false
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    await login(req as Request, res as Response);

    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(user.comparePassword).toHaveBeenCalledWith("password123");
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Invalid credentials",
    });
  });

  it("should handle unexpected errors gracefully during login", async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error("DB Error")),
    });

    await login(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Error logging in",
      error: "DB Error",
    });
    // Controller does NOT call console.error in this catch block, so no assertion here
  });
});

describe("Auth Controller - Register Admin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    req = {
      body: {
        name: "Admin User",
        email: "admin@example.com",
        password: "adminpassword",
      },
    };
    res = {
      status: statusMock,
    } as unknown as Response;

    jest.clearAllMocks();
    // Suppress console.error output for this test suite
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console.error after each test
    consoleErrorSpy.mockRestore();
  });

  it("should return 400 if admin user already exists", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(true);

    await registerAdmin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "User already exists",
    });
  });

  it("should handle unexpected errors gracefully during admin registration", async () => {
    // Mock findOne to reject, triggering the catch block in the controller
    (User.findOne as jest.Mock).mockRejectedValue(new Error("DB Error"));

    await registerAdmin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Error registering admin",
      error: "DB Error",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error)); // Controller explicitly calls console.error here
  });
});

describe("Auth Controller - Login Admin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    req = {
      body: {
        email: "admin@example.com",
        password: "adminpassword",
      },
    };
    res = {
      json: jsonMock, // Direct mock for res.json
      status: statusMock, // For when res.status is explicitly called (e.g., errors)
    } as unknown as Response;

    jest.clearAllMocks();
    // Suppress console.error output for this test suite
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console.error after each test
    consoleErrorSpy.mockRestore();
  });

  it("should log in an admin user successfully", async () => {
    const adminUser = mockUserInstance({
      _id: "fake-admin-id",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
    });
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(adminUser),
    });
    (jwt.sign as jest.Mock).mockReturnValue("fake-admin-token");

    await loginAdmin(req as Request, res as Response);

    expect(User.findOne).toHaveBeenCalledWith({ email: "admin@example.com" });
    expect(adminUser.comparePassword).toHaveBeenCalledWith("adminpassword");
    // Controller calls res.json directly, which defaults to 200, so no statusMock expectation here
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      message: "Login successful",
      data: {
        user: adminUser.toObject(), // Use toObject for comparison
        token: "fake-admin-token",
      },
    });
  });

  it("should return 401 for invalid credentials (user not found)", async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await loginAdmin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Invalid credentials",
    });
  });

  it("should return 403 if user is not an admin", async () => {
    const regularUser = mockUserInstance({
      _id: "fake-user-id",
      name: "Regular User",
      email: "user@example.com",
      role: "user",
    });
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(regularUser),
    });

    req.body.email = "user@example.com"; // Set email to a non-admin one
    await loginAdmin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  });

  it("should return 401 for invalid credentials (password mismatch)", async () => {
    const adminUser = mockUserInstance(
      {
        _id: "fake-admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
      false
    ); // Mock comparePassword to return false
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(adminUser),
    });

    await loginAdmin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Invalid credentials",
    });
  });
});

describe("Auth Controller - Get Profile", () => {
  let req: Partial<AuthRequest>; // Use AuthRequest for profile
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    req = {
      user: {
        id: "authenticated-user-id",
        email: "auth@example.com",
        role: "user",
      },
    };
    res = {
      json: jsonMock, // Direct mock for res.json
      status: statusMock, // For when res.status is explicitly called (e.g., errors)
    } as unknown as Response;

    jest.clearAllMocks();
    // Suppress console.error output for this test suite
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console.error after each test
    consoleErrorSpy.mockRestore();
  });

  it("should return user profile successfully", async () => {
    const userProfile = mockUserInstance({
      _id: "authenticated-user-id",
      name: "Authenticated User",
      email: "auth@example.com",
      role: "user",
      createdAt: new Date(),
    });
    (User.findById as jest.Mock).mockResolvedValue(userProfile);

    await getProfile(req as AuthRequest, res as Response);

    expect(User.findById).toHaveBeenCalledWith("authenticated-user-id");
    // Controller calls res.json directly, which defaults to 200, so no statusMock expectation here
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: {
        user: userProfile.toObject(), // Use toObject to get the plain object
      },
    });
  });

  it("should return 404 if user not found", async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);

    await getProfile(req as AuthRequest, res as Response);

    expect(User.findById).toHaveBeenCalledWith("authenticated-user-id");
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
  });

  it("should handle unexpected errors gracefully during profile fetch", async () => {
    (User.findById as jest.Mock).mockRejectedValue(new Error("DB Error"));

    await getProfile(req as AuthRequest, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Error fetching profile",
      error: "DB Error",
    });
    // Controller does NOT call console.error in this catch block, so no assertion here
  });
});
