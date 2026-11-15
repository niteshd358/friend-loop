import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import http from "http";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import messageRoutes from "./routes/message.js";
import friendRequestRoutes from "./routes/friendRequest.js";
import profileRoutes from "./routes/profile.js";
import { initSocket } from "./socket.js";
import { setupSwagger } from "./swagger.js";
import { sanitizeNoSql } from "./middleware/validate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded whether run from repo root or server dir
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

export const app = express();

// Set trust proxy for accurate IP identification behind reverse proxies (Render, Nginx, Cloudflare)
app.set("trust proxy", 1);

// Enforce Mongoose strictQuery to prevent query injection
mongoose.set("strictQuery", true);

// Security Middlewares - configure CSP to allow Cloudinary, jsdelivr emoji CDN, blob previews, and WebSockets
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://*.cloudinary.com",
          "https://cdn.jsdelivr.net",
          "https:",
        ],
        connectSrc: [
          "'self'",
          "https://res.cloudinary.com",
          "https://*.cloudinary.com",
          "ws:",
          "wss:",
        ],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  skip: () => process.env.NODE_ENV === "test",
  message: { msg: "Too many requests from this IP, please try again later." }
});
app.use("/api/", limiter);

app.use(express.json());
app.use(cookieParser());
app.use(sanitizeNoSql);

// Setup Swagger UI
setupSwagger(app);

// Serve uploads folder statically with CORS headers
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

const rawCorsOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const corsOrigins = rawCorsOrigin.includes(",")
  ? rawCorsOrigin.split(",").map(o => o.trim())
  : rawCorsOrigin;
app.use(cors({ origin: corsOrigins, credentials: true }));

const frontendDist = path.resolve(__dirname, "../../chat-frontend/dist");

// Serve Frontend in Production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendDist));

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
if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected ✅"))
    .catch((err) => console.error(err));
}

// Catch-all route for React Router (must be AFTER all API routes)
if (process.env.NODE_ENV === "production") {
  app.get(/(.*)/, (req: Request, res: Response) => {
    res.sendFile(path.resolve(frontendDist, "index.html"));
  });
}

// HTTP + Socket
const server = http.createServer(app);
initSocket(server, corsOrigins);

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on :${PORT} 🚀`));
}
