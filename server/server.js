import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import messageRoutes from "./routes/message.js";
import { initSocket } from "./socket.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));

// Health
app.get("/", (_req, res) => res.send("API running"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

// DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error(err));

// HTTP + Socket
const server = http.createServer(app);
initSocket(server, process.env.CLIENT_ORIGIN || "*");

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on :${PORT} 🚀`));
