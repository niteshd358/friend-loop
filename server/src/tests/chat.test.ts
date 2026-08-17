import request from "supertest";
import { app } from "../server.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import mongoose from "mongoose";

describe("Chat Routes", () => {
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    // Register User 1
    const res1 = await request(app).post("/api/auth/signup").send({
      username: "chatuser1",
      email: "c1@test.com",
      password: "password123",
    });
    // Register User 2
    const res2 = await request(app).post("/api/auth/signup").send({
      username: "chatuser2",
      email: "c2@test.com",
      password: "password123",
    });

    // Login User 1
    const login1 = await request(app).post("/api/auth/login").send({
      email: "c1@test.com",
      password: "password123",
    });
    user1Token = login1.body.token;
    user1Id = login1.body.user.id;

    // Login User 2
    const login2 = await request(app).post("/api/auth/login").send({
      email: "c2@test.com",
      password: "password123",
    });
    user2Token = login2.body.token;
    user2Id = login2.body.user.id;
  });

  it("should create a new chat between two users", async () => {
    // Actually, in the current system, chats are created via FriendRequests.
    // Let's create a chat directly for testing.
    const chat = await Chat.create({ members: [user1Id, user2Id] });
    expect(chat._id).toBeDefined();

    // Fetch user 1 chats
    const res = await request(app)
      .get("/api/chats/mine")
      .set("Authorization", `Bearer ${user1Token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ username: "chatuser1" }),
        expect.objectContaining({ username: "chatuser2" })
      ])
    );
  });

  it("should send and retrieve a message in the chat", async () => {
    const chat = await Chat.findOne({ members: { $all: [user1Id, user2Id] } });
    
    // Send message from user 1
    const sendRes = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        chatId: chat?._id,
        text: "Hello from user 1",
      });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.text).toBe("Hello from user 1");

    // Fetch messages
    const getRes = await request(app)
      .get(`/api/messages/${chat?._id}?limit=10`)
      .set("Authorization", `Bearer ${user2Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.messages.length).toBe(1);
    expect(getRes.body.messages[0].text).toBe("Hello from user 1");
  });
});
