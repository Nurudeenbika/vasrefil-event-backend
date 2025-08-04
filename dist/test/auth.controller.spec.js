"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const supertest_1 = require("supertest");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../src/app"));
const User_1 = __importDefault(require("../src/models/User"));
const authController = __importStar(require("../src/controllers/authController"));
const helpers_1 = require("./helpers");
describe("Auth Controller", () => {
    describe("generateToken", () => {
        it("should generate a valid JWT token", () => {
            const testId = "507f1f77bcf86cd799439011";
            const token = authController.generateToken(testId);
            (0, chai_1.expect)(token).to.be.a("string");
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback-secret");
            (0, chai_1.expect)(decoded).to.have.property("id", testId);
        });
    });
    describe("register", () => {
        it("should register a new user", async () => {
            const userData = {
                name: "Test User",
                email: "test@example.com",
                password: "password123",
            };
            const res = await (0, helpers_1.registerTestUser)(userData);
            (0, chai_1.expect)(res).to.have.status(201);
            (0, chai_1.expect)(res.body).to.have.property("success", true);
            (0, chai_1.expect)(res.body.data).to.have.property("user");
            (0, chai_1.expect)(res.body.data).to.have.property("token");
            (0, chai_1.expect)(res.body.data.user).to.have.property("email", userData.email);
        });
        it("should return error for duplicate email", async () => {
            const userData = {
                name: "Test User",
                email: "test@example.com",
                password: "password123",
            };
            // First registration
            await (0, helpers_1.registerTestUser)(userData);
            // Second registration with same email
            const res = await (0, helpers_1.registerTestUser)(userData);
            (0, chai_1.expect)(res).to.have.status(400);
            (0, chai_1.expect)(res.body).to.have.property("success", false);
            (0, chai_1.expect)(res.body.message).to.equal("User already exists with this email");
        });
        it("should handle registration errors", async () => {
            const userData = {
                name: "Test User",
                email: "test@example.com",
                password: "invalid-password",
            };
            const res = await (0, helpers_1.registerTestUser)(userData);
            (0, chai_1.expect)(res).to.have.status(500);
            (0, chai_1.expect)(res.body).to.have.property("success", false);
        });
    });
    describe("login", () => {
        const testUser = {
            name: "Test User",
            email: "test@example.com",
            password: "password123",
        };
        beforeEach(async () => {
            await (0, helpers_1.registerTestUser)(testUser);
        });
        it("should login with valid credentials", async () => {
            const res = await (0, helpers_1.loginTestUser)({
                email: testUser.email,
                password: testUser.password,
            });
            (0, chai_1.expect)(res).to.have.status(200);
            (0, chai_1.expect)(res.body).to.have.property("success", true);
            (0, chai_1.expect)(res.body.data).to.have.property("user");
            (0, chai_1.expect)(res.body.data).to.have.property("token");
        });
        it("should reject invalid email", async () => {
            const res = await (0, helpers_1.loginTestUser)({
                email: "wrong@example.com",
                password: testUser.password,
            });
            (0, chai_1.expect)(res).to.have.status(401);
            (0, chai_1.expect)(res.body).to.have.property("success", false);
            (0, chai_1.expect)(res.body.message).to.equal("Invalid credentials");
        });
        it("should reject invalid password", async () => {
            const res = await (0, helpers_1.loginTestUser)({
                email: testUser.email,
                password: "wrongpassword",
            });
            (0, chai_1.expect)(res).to.have.status(401);
            (0, chai_1.expect)(res.body).to.have.property("success", false);
            (0, chai_1.expect)(res.body.message).to.equal("Invalid credentials");
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
            await (0, helpers_1.registerTestUser)(adminUser);
            await (0, helpers_1.registerTestUser)(regularUser);
        });
        it("should allow admin to login", async () => {
            const res = await (0, supertest_1.agent)(app_1.default).post("/api/auth/login-admin").send({
                email: adminUser.email,
                password: adminUser.password,
            });
            (0, chai_1.expect)(res).to.have.status(200);
            (0, chai_1.expect)(res.body).to.have.property("success", true);
        });
        it("should reject regular user", async () => {
            const res = await (0, supertest_1.agent)(app_1.default).post("/api/auth/login-admin").send({
                email: regularUser.email,
                password: regularUser.password,
            });
            (0, chai_1.expect)(res).to.have.status(403);
            (0, chai_1.expect)(res.body).to.have.property("success", false);
            (0, chai_1.expect)(res.body.message).to.equal("Access denied. Admin privileges required.");
        });
    });
    describe("registerAdmin", () => {
        it("should register a new admin user", async () => {
            const adminData = {
                name: "Admin User",
                email: "admin@example.com",
                password: "admin123",
            };
            const res = await (0, supertest_1.agent)(app_1.default)
                .post("/api/auth/register-admin")
                .send(adminData);
            (0, chai_1.expect)(res).to.have.status(201);
            (0, chai_1.expect)(res.body).to.have.property("success", true);
            (0, chai_1.expect)(res.body.data.user.role).to.equal("admin");
            // Verify the user is actually an admin in the database
            const user = await User_1.default.findOne({ email: adminData.email });
            (0, chai_1.expect)(user).to.exist;
            (0, chai_1.expect)(user?.role).to.equal("admin");
        });
    });
    describe("getProfile", () => {
        const testUser = {
            name: "Test User",
            email: "test@example.com",
            password: "password123",
        };
        let authToken;
        beforeEach(async () => {
            const registerRes = await (0, helpers_1.registerTestUser)(testUser);
            const loginRes = await (0, helpers_1.loginTestUser)({
                email: testUser.email,
                password: testUser.password,
            });
            authToken = (0, helpers_1.getAuthToken)(loginRes);
        });
        it("should return user profile for authenticated user", async () => {
            const res = await (0, supertest_1.agent)(app_1.default)
                .get("/api/auth/profile")
                .set("Authorization", `Bearer ${authToken}`);
            (0, chai_1.expect)(res).to.have.status(200);
            (0, chai_1.expect)(res.body).to.have.property("success", true);
            (0, chai_1.expect)(res.body.data.user).to.have.property("email", testUser.email);
        });
        it("should reject unauthorized access", async () => {
            const res = await (0, supertest_1.agent)(app_1.default).get("/api/auth/profile");
            (0, chai_1.expect)(res).to.have.status(401);
        });
    });
});
//# sourceMappingURL=auth.controller.spec.js.map