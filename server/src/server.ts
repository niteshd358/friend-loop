import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import messageRoutes from "./routes/message.js";
import friendRequestRoutes from "./routes/friendRequest.js";
import profileRoutes from "./routes/profile.js";
import { initSocket } from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development/testing
  message: { msg: "Too many requests from this IP, please try again later." }
});
app.use("/api/", limiter);

app.use(express.json());
app.use(cookieParser());

// Serve uploads folder statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const corsOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: corsOrigin, credentials: true }));

// Serve Frontend in Production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../chat-frontend/dist")));

  // Health check API route
  app.get("/api/health", (_req: Request, res: Response) => res.send("API running"));

} else {
  // Health check for development
  app.get("/", (_req: Request, res: Response) => res.send("API running"));
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friend-requests", friendRequestRoutes);
app.use("/api/profile", profileRoutes);

// DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error(err));

// Catch-all route for React Router (must be AFTER all API routes)
if (process.env.NODE_ENV === "production") {
  app.get(/(.*)/, (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, "../chat-frontend/dist", "index.html"));
  });
}

// HTTP + Socket
const server = http.createServer(app);
initSocket(server, corsOrigin);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on :${PORT} 🚀`));
