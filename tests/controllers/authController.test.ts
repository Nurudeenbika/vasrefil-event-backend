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

// Mock the entire User module and jsonwebtoken
jest.mock("../../src/models/User", () => {
  const actual = jest.requireActual("../../src/models/User");
  return {
    ...actual,
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    // Add any other methods you need to mock
  };
});
jest.mock("jsonwebtoken");

// Helper to mock a user instance with a comparePassword method
const mockUserInstance = (userData: any, isPasswordMatch: boolean = true) => ({
  ...userData,
  comparePassword: jest.fn().mockResolvedValue(isPasswordMatch),
  populate: jest.fn().mockReturnThis(), // Mock populate for createEvent
  save: jest.fn().mockResolvedValue(userData), // Mock save for registerAdmin
});

describe("Auth Controller - Register", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
        user: {
          id: "fake-id",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
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
  });
});

describe("Auth Controller - Login", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    req = {
      body: {
        email: "test@example.com",
        password: "password123",
      },
    };
    res = {
      status: statusMock,
    } as unknown as Response;

    jest.clearAllMocks();
  });

  // it("should log in a user successfully", async () => {
  //   const user = mockUserInstance({
  //     _id: "fake-id",
  //     name: "Test User",
  //     email: "test@example.com",
  //     role: "user",
  //     comparePassword: jest.fn().mockResolvedValue(true),
  //   });

  //   const mockSelect = jest.fn().mockResolvedValue(user);
  //   (User.findOne as jest.Mock).mockReturnValue({
  //     select: mockSelect, // Mock select for password
  //   });
  //   (jwt.sign as jest.Mock).mockReturnValue("fake-token");

  //   await login(req as Request, res as Response);

  //   expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
  //   expect(user.comparePassword).toHaveBeenCalledWith("password123");
  //   expect(statusMock).toHaveBeenCalledWith(200);
  //   expect(jsonMock).toHaveBeenCalledWith({
  //     success: true,
  //     message: "Login successful",
  //     data: {
  //       user: {
  //         id: "fake-id",
  //         name: "Test User",
  //         email: "test@example.com",
  //         role: "user",
  //       },
  //       token: "fake-token",
  //     },
  //   });
  // });

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
  });
});

describe("Auth Controller - Register Admin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
    (User.findOne as jest.Mock).mockRejectedValue(new Error("DB Error"));

    await registerAdmin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Error registering admin",
      error: "DB Error",
    });
  });
});

describe("Auth Controller - Login Admin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
      status: statusMock,
    } as unknown as Response;

    jest.clearAllMocks();
  });

  // it("should log in an admin user successfully", async () => {
  //   const adminUser = mockUserInstance({
  //     _id: "fake-admin-id",
  //     email: "admin@example.com",
  //     role: "admin",
  //   });
  //   (User.findOne as jest.Mock).mockReturnValue({
  //     select: jest.fn().mockResolvedValue(adminUser),
  //   });
  //   (jwt.sign as jest.Mock).mockReturnValue("fake-admin-token");

  //   await loginAdmin(req as Request, res as Response);

  //   expect(User.findOne).toHaveBeenCalledWith({ email: "admin@example.com" });
  //   expect(adminUser.comparePassword).toHaveBeenCalledWith("adminpassword");
  //   expect(statusMock).toHaveBeenCalledWith(200);
  //   expect(jsonMock).toHaveBeenCalledWith({
  //     success: true,
  //     message: "Login successful",
  //     data: {
  //       user: {
  //         id: "fake-admin-id",
  //         name: "Admin User",
  //         email: "admin@example.com",
  //         role: "admin",
  //       },
  //       token: "fake-admin-token",
  //     },
  //   });
  // });

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

  it("should handle unexpected errors gracefully during admin login", async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error("DB Error")),
    });

    await loginAdmin(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Error logging in",
      error: "DB Error",
    });
  });
});

describe("Auth Controller - Get Profile", () => {
  let req: Partial<AuthRequest>; // Use AuthRequest for profile
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
      status: statusMock,
    } as unknown as Response;

    jest.clearAllMocks();
  });

  // it("should return user profile successfully", async () => {
  //   const userProfile = {
  //     _id: "authenticated-user-id",
  //     name: "Authenticated User",
  //     email: "auth@example.com",
  //     role: "user",
  //     createdAt: new Date(),
  //   };
  //   (User.findById as jest.Mock).mockResolvedValue(userProfile);

  //   await getProfile(req as AuthRequest, res as Response);

  //   expect(User.findById).toHaveBeenCalledWith("authenticated-user-id");
  //   expect(statusMock).toHaveBeenCalledWith(200);
  //   expect(jsonMock).toHaveBeenCalledWith({
  //     success: true,
  //     data: {
  //       user: {
  //         id: userProfile._id,
  //         name: userProfile.name,
  //         email: userProfile.email,
  //         role: userProfile.role,
  //         createdAt: userProfile.createdAt,
  //       },
  //     },
  //   });
  // });

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
  });
});
