# FriendLoop – Real-Time Friends Messaging App

Welcome to **FriendLoop**, a modern, responsive, real-time messaging application. Connect with friends instantly using WebSockets for a seamless, live chat experience.

## ✨ Project Features
- **Real-Time Messaging:** Powered by Socket.io for instantaneous message delivery and updates.
- **Clean Architecture:** Organized backend adhering to the MVC pattern (Models, Controllers, Routes) for maintainability and scalability.
- **Authentication Flow:** Secure user registration and login implemented with JWT (JSON Web Tokens) and bcrypt.
- **Responsive UI:** Clean, Apple-like chat interface built with React and TailwindCSS.

## 🛠 Tech Stack
**Frontend:**
- React (Vite)
- TailwindCSS
- Axios (for API requests)
- Socket.io-client
- React Router DOM

**Backend:**
- Node.js & Express
- MongoDB & Mongoose
- Socket.io (for WebSocket integration)
- JSON Web Token (JWT)

## 📂 Folder Structure

```text
FriendLoop/
├── chat-frontend/       # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── api/         # Axios instance setup
│   │   ├── components/  # Reusable UI elements
│   │   ├── context/     # SocketContext and State Management
│   │   ├── pages/       # Login, Register, ChatPage
│   │   ├── App.jsx      # Main application component
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
└── server/              # Node.js Backend
    ├── config/          # Configurations
    ├── controllers/     # Request handlers (Auth, Chat, Message)
    ├── middleware/      # JWT Authentication Middleware
    ├── models/          # Mongoose Schemas (User, Chat, Message)
    ├── routes/          # API Endpoint definitions
    ├── utils/           # Helper functions
    ├── .env.example
    ├── package.json
    ├── server.js        # Main Express server entry point
    └── socket.js        # Socket.io configuration and events
```

## 🚀 Getting Started / Local Setup

Follow these steps to set up the project locally on your machine.

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
Copy the example environment variables file:
```bash
cp .env.example .env
```
Ensure your `chat-frontend/.env` points to the backend URL:
```env
VITE_API_URL=http://localhost:5000/api
```
Start the frontend development server:
```bash
npm run dev
```

You can now view the app in your browser (typically at `http://localhost:5173`). Open multiple browsers/incognito windows to test real-time messaging!

## 🌍 Live Demo & Deployment

- **Frontend Deployment:** [Coming Soon / Vercel Link]
- **Backend API:** [Coming Soon / Render Link]
