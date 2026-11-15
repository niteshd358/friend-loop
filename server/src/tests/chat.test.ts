import request from "supertest";
import { app } from "../server.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

describe("Chat Routes & Security", () => {
  let user1Token: string;
  let user2Token: string;
  let user3Token: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  beforeAll(async () => {
    // Register User 1
    await request(app).post("/api/auth/signup").send({
      username: "chatuser1",
      email: "c1@test.com",
      password: "password123",
    });
    // Register User 2
    await request(app).post("/api/auth/signup").send({
      username: "chatuser2",
      email: "c2@test.com",
      password: "password123",
    });
    // Register User 3 (Outsider)
    await request(app).post("/api/auth/signup").send({
      username: "chatuser3",
      email: "c3@test.com",
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

    // Login User 3 (Outsider)
    const login3 = await request(app).post("/api/auth/login").send({
      email: "c3@test.com",
      password: "password123",
    });
    user3Token = login3.body.token;
    user3Id = login3.body.user.id;
  });

  it("should create a new chat and ensure emails are hidden for privacy", async () => {
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
        expect.objectContaining({ username: "chatuser2" }),
      ])
    );

    // Privacy assertion: member emails should NOT be exposed
    expect(res.body[0].members[0].email).toBeUndefined();
  });

  it("should send and retrieve a message for authorized members", async () => {
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

    // Fetch messages by user 2
    const getRes = await request(app)
      .get(`/api/messages/${chat?._id}?limit=10`)
      .set("Authorization", `Bearer ${user2Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.messages.length).toBe(1);
    expect(getRes.body.messages[0].text).toBe("Hello from user 1");
  });

  it("should enforce Broken Access Control (IDOR) prevention: forbid outsider access", async () => {
    const chat = await Chat.findOne({ members: { $all: [user1Id, user2Id] } });

    // User 3 (outsider) attempts to read messages in User 1 & 2's chat
    const unauthorizedGet = await request(app)
      .get(`/api/messages/${chat?._id}`)
      .set("Authorization", `Bearer ${user3Token}`);

    expect(unauthorizedGet.status).toBe(403);
    expect(unauthorizedGet.body.msg).toContain("Forbidden");

    // User 3 attempts to post message to User 1 & 2's chat
    const unauthorizedSend = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${user3Token}`)
      .send({
        chatId: chat?._id,
        text: "Malicious injection attempt",
      });

    expect(unauthorizedSend.status).toBe(403);
    expect(unauthorizedSend.body.msg).toContain("Forbidden");
  });
});
