import request from "supertest";
import { app } from "../server.js"; // Assuming server.js exports the express app without starting the server, or we can just import app
import User from "../models/User.js";
import mongoose from "mongoose";

describe("Auth Routes", () => {
  it("should signup a new user", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });
      
    expect(res.status).toBe(200);
    expect(res.body.msg).toContain("User registered successfully");
    
    const user = await User.findOne({ email: "test@example.com" });
    expect(user).toBeTruthy();
  });

  it("should login an existing user", async () => {
    // Create user
    await request(app)
      .post("/api/auth/signup")
      .send({
        username: "testuser2",
        email: "test2@example.com",
        password: "password123",
      });

    // Login
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test2@example.com",
        password: "password123",
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("testuser2");
  });
});
