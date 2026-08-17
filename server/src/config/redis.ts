import { Redis } from "ioredis";

const redisClient = new Redis(process.env.REDIS_URI || "redis://localhost:6379");

redisClient.on("connect", () => {
  console.log("Redis connected ✅");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error ❌:", err);
});

export default redisClient;
