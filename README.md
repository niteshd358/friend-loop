# FriendLoop – Real-Time Messaging App

Welcome to **FriendLoop**, a modern, responsive, and real-time messaging application. Connect with friends instantly using WebSockets for a seamless, live chat experience.

**[🌍 View Live Demo](https://friendloop-zitl.onrender.com)**

---

## ✨ Features

- **Guest Demo Mode:** Recruiters and visitors can click **"Try Demo"** to instantly log in as a guest and interact with our automated **Echo Bot** to test real-time WebSocket capabilities without registering!
- **Real-Time Messaging:** Powered by Socket.io for instantaneous message delivery, complete with live "Sent", "Delivered" (gray ticks), and "Read" (blue ticks) status updates similar to WhatsApp.
- **Global Presence Tracking:** Users' online/offline statuses are tracked globally, showing an accurate "Last Seen" timestamp when they disconnect.
- **Premium UI/UX:** A stunning frontend utilizing Mesh Gradients, Glassmorphism, Plus Jakarta Sans typography, and fluid micro-animations powered by Framer Motion.
- **Friend Request System:** Search for users globally, send friend requests, and manage your connections seamlessly.
- **Full-Stack Deployment:** Configured as a unified MERN stack application, where the Express backend serves the optimized Vite React build, completely eliminating CORS issues in production.

## 🛠 Tech Stack

**Frontend:**
- React 19 (Vite)
- Tailwind CSS v4 & PostCSS
- Framer Motion (Animations)
- Lucide React (Icons)
- Socket.io-client
- Axios

**Backend:**
- Node.js & Express 5
- MongoDB & Mongoose
- Socket.io
- JSON Web Tokens (JWT) & bcryptjs

## 🚀 Live Demo & Deployment

This project is deployed as a single, unified web service on **Render**. The Express backend serves the static React frontend files for maximum efficiency. 

👉 **Live URL:** [https://friendloop-zitl.onrender.com](https://friendloop-zitl.onrender.com)

*Note: Render free tier spins down after 15 minutes of inactivity. The initial load might take up to 50 seconds if the server is waking up.*

## 💻 Local Setup Instructions

Follow these steps to set up the project locally on your machine for development.

### 1. Clone the repository
```bash
git clone https://github.com/niteshd358/friend-loop.git
cd friend-loop
```

### 2. Setup the Backend (`server/`)
Open a terminal and navigate to the `server` directory:
```bash
cd server
npm install
```
Copy the example environment variables file and fill in your details:
```bash
cp .env.example .env
```
Inside `server/.env`, provide your MongoDB URI and a secret string for JWT:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
CLIENT_ORIGIN=http://localhost:5173
```
Start the backend development server:
```bash
npm run dev
```

### 3. Setup the Frontend (`chat-frontend/`)
Open a new terminal and navigate to the `chat-frontend` directory:
```bash
cd chat-frontend
npm install
```
Ensure you have a `.env` file pointing to your local backend:
```env
VITE_API_URL=http://localhost:5000/api
```
Start the frontend development server:
```bash
npm run dev
```

You can now view the app in your browser at `http://localhost:5173`. 
