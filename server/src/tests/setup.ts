import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  const baseUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (baseUri) {
    const testDbUri = baseUri.includes(".net/?")
      ? baseUri.replace(".net/?", ".net/friendloop_test?")
      : baseUri;
    await mongoose.connect(testDbUri);
  } else {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }

  // Ensure clean test database state
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (e) {
    // Continue
  }
}, 30000);

afterAll(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (e) {
    // Continue cleanup
  }

  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
