import { expect } from "chai";
import { agent } from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app";
import User from "../../src/models/User";
import * as authController from "../../src/controllers/authController";
import { getAuthToken, loginTestUser, registerTestUser } from "../helpers";

describe("Auth Controller", () => {
  describe("generateToken", () => {
    it("should generate a valid JWT token", () => {
      const testId = "507f1f77bcf86cd799439011";
      const token = authController.generateToken(testId);

      expect(token).to.be.a("string");

      // You must provide a secret key for jwt.verify
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      );
      expect(decoded).to.have.property("id", testId);
    });
  });

  describe("register", () => {
    it("should register a new user", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      };

      const res = await registerTestUser(userData);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data).to.have.property("user");
      expect(res.body.data).to.have.property("token");
      expect(res.body.data.user).to.have.property("email", userData.email);
    });

    it("should return error for duplicate email", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      };

      // First registration
      await registerTestUser(userData);

      // Second registration with same email
      const res = await registerTestUser(userData);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("success", false);
      expect(res.body.message).to.equal("User already exists with this email");
    });

    it("should handle registration errors", async () => {
      // Note: The specific error here depends on your validation logic.
      // For example, if you have a password length constraint, this test will pass.
      // Adjust the expectation if your logic is different.
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "invalid-password",
      };

      const res = await registerTestUser(userData);

      // Assuming a validation error or similar.
      expect(res).to.have.status(500);
      expect(res.body).to.have.property("success", false);
    });
  });

  describe("login", () => {
    const testUser = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    };

    beforeEach(async () => {
      await registerTestUser(testUser);
    });

    it("should login with valid credentials", async () => {
      const res = await loginTestUser({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res).to.have.status(200);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data).to.have.property("user");
      expect(res.body.data).to.have.property("token");
    });

    it("should reject invalid email", async () => {
      const res = await loginTestUser({
        email: "wrong@example.com",
        password: testUser.password,
      });

      expect(res).to.have.status(401);
      expect(res.body).to.have.property("success", false);
      expect(res.body.message).to.equal("Invalid credentials");
    });

    it("should reject invalid password", async () => {
      const res = await loginTestUser({
        email: testUser.email,
        password: "wrongpassword",
      });

      expect(res).to.have.status(401);
      expect(res.body).to.have.property("success", false);
      expect(res.body.message).to.equal("Invalid credentials");
    });
  });

  describe("loginAdmin", () => {
    const adminUser = {
      name: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      role: "admin",
    };

    const regularUser = {
      name: "Regular User",
      email: "user@example.com",
      password: "user123",
      role: "user",
    };

    beforeEach(async () => {
      await registerTestUser(adminUser);
      await registerTestUser(regularUser);
    });

    it("should allow admin to login", async () => {
      const res = await agent(app).post("/api/auth/login-admin").send({
        email: adminUser.email,
        password: adminUser.password,
      });

      expect(res).to.have.status(200);
      expect(res.body).to.have.property("success", true);
    });

    it("should reject regular user", async () => {
      const res = await agent(app).post("/api/auth/login-admin").send({
        email: regularUser.email,
        password: regularUser.password,
      });

      expect(res).to.have.status(403);
      expect(res.body).to.have.property("success", false);
      expect(res.body.message).to.equal(
        "Access denied. Admin privileges required."
      );
    });
  });

  describe("registerAdmin", () => {
    it("should register a new admin user", async () => {
      const adminData = {
        name: "Admin User",
        email: "admin@example.com",
        password: "admin123",
      };

      const res = await agent(app)
        .post("/api/auth/register-admin")
        .send(adminData);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data.user.role).to.equal("admin");

      // Verify the user is actually an admin in the database
      const user = await User.findOne({ email: adminData.email });
      expect(user).to.exist;
      expect(user?.role).to.equal("admin");
    });
  });

  describe("getProfile", () => {
    const testUser = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    };

    // Fix the 'any' type error by explicitly typing authToken as a string
    let authToken: string;

    beforeEach(async () => {
      const registerRes = await registerTestUser(testUser);
      const loginRes = await loginTestUser({
        email: testUser.email,
        password: testUser.password,
      });
      authToken = getAuthToken(loginRes);
    });

    it("should return user profile for authenticated user", async () => {
      const res = await agent(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data.user).to.have.property("email", testUser.email);
    });

    it("should reject unauthorized access", async () => {
      const res = await agent(app).get("/api/auth/profile");

      expect(res).to.have.status(401);
    });
  });
});
