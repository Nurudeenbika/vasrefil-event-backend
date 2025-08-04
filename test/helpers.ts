import { agent } from "supertest";
import app from "../src/app";
//import { User } from '../src/models/User';

export const registerTestUser = async (userData: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) => {
  return agent(app).post("/api/auth/register").send(userData);
};

export const loginTestUser = async (credentials: {
  email: string;
  password: string;
}) => {
  return agent(app).post("/api/auth/login").send(credentials);
};

export const getAuthToken = (res: any): string => {
  return res.body.data.token;
};
