# Setting Up FriendLoop Locally

Getting the FriendLoop up and running on your local machine is straightforward. Since we use a modular MERN stack along with Redis for WebSocket scaling, follow the steps below to ensure everything connects properly.

## Prerequisites

Before you start, make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or a MongoDB Atlas URI)
- [Redis](https://redis.io/) (Required for Socket.io adapter. Can be run via Docker: `docker run -p 6379:6379 -d redis`)
- Git

## Step-by-Step Setup

### 1. Clone the Repository
```bash
git clone https://github.com/niteshd358/friend-loop.git
cd friend-loop
```

### 2. Configure the Backend (Server)

Navigate to the server directory and install the required dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory. You can copy the provided example if one exists, or create a new one:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (For CORS setup)
CLIENT_ORIGIN=http://localhost:5173

# Database & Cache
MONGO_URI=mongodb://localhost:27017/friendloop
REDIS_URI=redis://localhost:6379

# Security
JWT_SECRET=generate_a_strong_random_secret_string

# Cloudinary Setup (For image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend development server:
```bash
npm run dev
```
> You can also run the backend tests to ensure everything is working: `npm run test`
> The Swagger API Documentation will be available at `http://localhost:5000/api-docs`.

### 3. Configure the Frontend (Client)

Open a new terminal window/tab, navigate to the frontend directory, and install its dependencies:
```bash
cd chat-frontend
npm install
```

Create a `.env` file in the `chat-frontend` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the Vite development server:
```bash
npm run dev
```

### 4. Sample Example (Putting it all together)

Once both servers are running, the application will be accessible at `http://localhost:5173`. 

Here is a quick flow to test the system locally:
1. Open two separate incognito windows side-by-side and go to `http://localhost:5173`.
2. In the first window, click **Sign Up** and create `User A` (e.g. alice, alice@test.com, password123).
3. In the second window, **Sign Up** as `User B` (e.g. bob, bob@test.com, password123).
4. As `User A`, use the search bar to find `User B` and send a **Friend Request**.
5. As `User B`, accept the friend request. A new chat thread will instantly appear for both users.
6. Send a message! You will see the real-time "delivered" and "read" receipts update instantly across both windows thanks to Socket.io and Redis. 
7. Check the network tab: Notice that the actual message content being transmitted is fully encrypted using the WebCrypto API.
