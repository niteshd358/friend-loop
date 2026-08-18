# FriendLoop 👋

**[View Live Demo](https://friendloop-zitl.onrender.com)**

FriendLoop is a full-stack, real-time chat application built using the MERN stack (MongoDB, Express, React, Node.js). 

I built this project to tackle some of the most common challenges in modern web apps: **making things fast, keeping user data secure, and handling real-time data smoothly.** It's more than just a basic CRUD app—it's designed to show how a production-ready application handles scale and security under the hood.

---

## 💡 Why I Built This & What It Solves

When building a chat app, you quickly run into a few problems:
1. **Security:** How do you make sure no one else can read private messages?
2. **Performance:** Loading a chat with 10,000 messages shouldn't freeze the browser.
3. **Scaling:** What happens when thousands of users are chatting at the same time?

Here is how FriendLoop solves these issues:

### 1. Real-Time & Scalable 
* **The Problem:** A single Node.js server can only handle so many WebSocket connections before it crashes.
* **The Fix:** I added Redis (`@socket.io/redis-adapter`). This means if we need to handle more traffic, we can spin up multiple servers, and Redis will make sure a message sent to Server A still reaches a user connected to Server B.

### 2. Serious Privacy (End-to-End Encryption)
* **The Problem:** If someone hacks the database, they shouldn't be able to read the messages.
* **The Fix:** I implemented Dual End-to-End Encryption (E2EE) using the browser's native WebCrypto API. Messages are locked (encrypted) on your device before they even hit the internet, and only the person you are texting has the key to unlock (decrypt) them. The server never knows what you are saying.

### 3. Fast Loading Times
* **The Problem:** Fetching old messages using standard pagination gets extremely slow as the database grows.
* **The Fix:** I swapped to **Cursor-based pagination**. This keeps database queries lightning-fast ($O(1)$ time complexity), no matter how far back in the chat history you scroll. I also used React Suspense to lazy-load parts of the website, so the initial page loads instantly.

### 4. Bulletproof Logins
* **The Problem:** Storing login tokens in local storage makes users vulnerable to hacks (like XSS attacks).
* **The Fix:** FriendLoop uses short-lived access tokens kept in memory, combined with secure, `HttpOnly` refresh cookies. I also added rate-limiting to the login routes so hackers can't spam the server to guess passwords.

---

## ✨ Features You Can Try

- **Instant Chat:** Send and receive messages instantly.
- **Message Status:** See "Delivered" and "Read" receipts, just like WhatsApp.
- **Online Status:** Check if your friends are online and see their "last seen" time.
- **Image Sharing:** Upload and send images directly in the chat (powered by Cloudinary).
- **Find Friends:** Search for other users and send them friend requests.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Socket.io-client
- **Backend:** Node.js, Express, TypeScript, MongoDB, Socket.io, Redis
- **Testing:** Jest, Supertest, MongoDB-Memory-Server
- **Media & APIs:** Cloudinary, Swagger UI

*(Note: The backend features an automated test suite to verify the authentication and chat routes, and includes live interactive API documentation via Swagger).*

---

## 💻 How to Run It Locally

Want to test it out on your own machine? 

👉 **[Check out the SETUP.md guide here!](./SETUP.md)** 

It walks you through everything from cloning the repo to getting the database and servers running.
