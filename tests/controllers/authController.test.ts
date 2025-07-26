import { register } from "../../src/controllers/authController";
import User from "../../src/models/User";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

jest.mock("../../src/models/User");
jest.mock("jsonwebtoken");

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
    (User.create as jest.Mock).mockResolvedValue({
      _id: "fake-id",
      name: "Test User",
      email: "test@example.com",
      role: "user",
    });
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
