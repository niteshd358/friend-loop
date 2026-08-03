# FriendLoop Backend

This is the Express and Socket.io backend for FriendLoop.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key
   CLIENT_ORIGIN=http://localhost:5173
   ```

3. Run the server:
   ```bash
   npm run dev
   ```

## Technologies

- Node.js & Express
- MongoDB & Mongoose
- Socket.io for WebSockets
- JWT for Authentication
