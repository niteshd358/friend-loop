import request from "supertest";
import { app } from "../server.js";
import User from "../models/User.js";

describe("Auth Routes & Security", () => {
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

  it("should login an existing user and set HttpOnly refresh cookie", async () => {
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

    // Verify secure HttpOnly cookie is returned
    const cookies = res.headers["set-cookie"] as any;
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes("refreshToken") && c.includes("HttpOnly"))).toBe(true);
  });

  it("should block NoSQL injection objects in login", async () => {
    // Attacker tries passing a $regex object instead of string
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: { $regex: ".*" },
        password: "password123",
      });

    expect(res.status).toBe(400);
  });

  it("should return 401 Unauthorized (not 400) when token is invalid or missing", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", "Bearer invalid-or-forged-token");

    expect(res.status).toBe(401);
  });
});
