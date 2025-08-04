"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthToken = exports.loginTestUser = exports.registerTestUser = void 0;
const supertest_1 = require("supertest");
const app_1 = __importDefault(require("../src/app"));
//import { User } from '../src/models/User';
const registerTestUser = async (userData) => {
    return (0, supertest_1.agent)(app_1.default).post("/api/auth/register").send(userData);
};
exports.registerTestUser = registerTestUser;
const loginTestUser = async (credentials) => {
    return (0, supertest_1.agent)(app_1.default).post("/api/auth/login").send(credentials);
};
exports.loginTestUser = loginTestUser;
const getAuthToken = (res) => {
    return res.body.data.token;
};
exports.getAuthToken = getAuthToken;
//# sourceMappingURL=helpers.js.map