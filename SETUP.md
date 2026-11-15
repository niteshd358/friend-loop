# Setting Up FriendLoop Locally

Getting FriendLoop up and running on your local machine is straightforward. Since the architecture uses a modular MERN stack with Redis adapter support and WebCrypto encryption, follow the steps below to configure and run the application.

---

## Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or a free MongoDB Atlas connection string)
- [Redis](https://redis.io/) (Optional for local development; required for horizontal multi-instance scaling. Can be run via Docker: `docker run -p 6379:6379 -d redis`)
- Git

---

## Step-by-Step Setup

### 1. Clone the Repository
```bash
git clone https://github.com/niteshd358/friend-loop.git
cd friend-loop
```

---

### 2. Configure the Backend (Server)

1. Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

2. Create a `.env` file in the `server` directory. You can copy the provided `.env.example`:
```bash
cp .env.example .env
```

Your `.env` should look like this:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (For CORS & Cookie setup)
CLIENT_ORIGIN=http://localhost:5173

# Database & Cache
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/chatApp?retryWrites=true&w=majority
# REDIS_URI=redis://localhost:6379  # Uncomment if running a local/remote Redis instance

# Dual JWT Secrets (Separated Access & Refresh token signing)
JWT_SECRET=your_super_secret_key
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars

# Cloudinary Setup (For secure media uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

3. Build the TypeScript source:
```bash
npm run build
```

4. Run the automated test suite to verify security & functionality:
```bash
npm run test
```

5. Start the backend development server:
```bash
npm run dev
```

> **API Documentation:** Interactive Swagger UI documentation is available at `http://localhost:5000/api-docs`.

---

### 3. Configure the Frontend (Client)

1. Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd chat-frontend
npm install
```

2. Create a `.env` file in the `chat-frontend` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

3. Start the Vite development server:
```bash
npm run dev
```

---

### 4. Testing End-to-End Encryption & Real-Time Flow

Once both the backend and frontend are running:
1. Open the application at `http://localhost:5173`.
2. Open two separate incognito browser windows side-by-side.
3. In Window 1, click **Sign Up** and register `User A` (e.g. `alice`, `alice@example.com`, `password123`).
4. In Window 2, click **Sign Up** and register `User B` (e.g. `bob`, `bob@example.com`, `password123`).
5. As `User A`, search for `bob` in the "Add Friends" tab and send a **Friend Request**.
6. As `User B`, accept the friend request in the "Requests" tab. A dedicated chat will instantly appear for both users.
7. Send a message! 
   * Open the **Network Tab** in Developer Tools: inspect the `POST /api/messages` request. Notice that the message payload starts with `E2EE:` followed by encrypted ciphertext.
   * Neither the server nor any interceptor can read the plaintext message content.
   * Delivery receipts ("sent", "delivered", "read") update in real-time via Socket.io.
   * RSA private keys are non-extractable and held securely in browser `IndexedDB`.
