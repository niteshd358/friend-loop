# FriendLoop

A real-time messaging application built with the MERN stack and Socket.io. 

**[View Live Demo](https://friendloop-zitl.onrender.com)**

## Features

- **Real-Time Messaging:** Instant message delivery with Socket.io. Includes sent, delivered, and read receipts.
- **Online Presence:** See when users are online and their last seen status.
- **Clean UI:** Responsive and modern chat interface built with Tailwind CSS.
- **Friend Requests:** Search for users and send friend requests to start chatting.
- **Guest Login:** A quick demo mode to test the app without registering.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Socket.io-client
- **Backend:** Node.js, Express, MongoDB, Socket.io, JWT

## Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/niteshd358/friend-loop.git
cd friend-loop
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```
Edit `server/.env` with your MongoDB URI and a secret key:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
CLIENT_ORIGIN=http://localhost:5173
```
Run the server:
```bash
npm run dev
```

### 3. Frontend Setup
In a new terminal:
```bash
cd chat-frontend
npm install
```
Ensure `chat-frontend/.env` points to your backend:
```env
VITE_API_URL=http://localhost:5000/api
```
Run the frontend:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.
