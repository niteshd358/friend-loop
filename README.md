# FriendLoop: A Highly Scalable & Secure Real-Time Messaging Platform

> A production-ready, full-stack chat application built with the MERN stack, TypeScript, and Socket.io. Designed to demonstrate advanced software engineering principles including horizontal scaling, end-to-end encryption, cursor-based pagination, and stringent security practices.

**[View Live Demo](https://friendloop-zitl.onrender.com)**

## 🚀 The Vision & Problem Solved

Traditional chat applications often face three major hurdles as they scale: **Security**, **Performance (data fetching/rendering)**, and **Real-Time Consistency** across multiple servers. 

FriendLoop was built from the ground up to solve these exact engineering challenges. It isn't just a basic CRUD app; it incorporates industry-standard techniques to handle high concurrency, protect user privacy with Native WebCrypto encryption, and deliver buttery-smooth UI experiences even on heavy chat threads.

---

## 🏗️ Architecture & Scalability Improvements

To handle thousands of concurrent users, the application architecture was heavily optimized:

- **TypeScript Migration & Repository Pattern**: The backend is fully strongly-typed. Data access logic was extracted from controllers into the `Repository Layer`, making the codebase modular, testable, and strictly decoupled.
- **Horizontal Scaling with Redis**: A single Node.js instance maxes out under heavy WebSocket load. We integrated the `@socket.io/redis-adapter` and `ioredis`. This means you can deploy 10 instances of the FriendLoop server behind a load balancer, and a message sent to Server A will correctly broadcast to a user connected on Server B.
- **Cursor-Based Pagination**: Fetching chat history with traditional offset pagination (`skip`/`limit`) becomes an $O(N)$ operation that gets slower as the dataset grows. FriendLoop utilizes $O(1)$ cursor-based pagination utilizing MongoDB indexing to load messages instantly, regardless of the chat's length.

---

## 🔒 Security & Privacy Hardening

User privacy and data security are the top priorities in this architecture.

- **Dual End-to-End Encryption (E2EE)**: Messages are encrypted *before* they leave the browser using the Native `WebCrypto API`. The server only routes encrypted ciphertexts and never sees the plaintext. Only the recipient's browser holds the cryptographic keys to decrypt the message payload.
- **HttpOnly Refresh Token Strategy**: JWT access tokens are stored entirely in memory (preventing XSS attacks from reading local storage), while long-lived refresh tokens are handled via strict `HttpOnly`, `Secure`, and `SameSite` cookies to drastically mitigate CSRF vectors.
- **DDoS & Brute-Force Protection**: The authentication endpoints are shielded by `express-rate-limit`, neutralizing brute-force dictionary attacks and providing a sturdy defense-in-depth layer.

---

## ⚡ Performance Optimizations

To ensure the app feels like a premium, native experience:

- **Infinite Scrolling via Virtualization**: The React frontend uses an IntersectionObserver approach to lazy-load older messages only when the user scrolls to the top of the container, keeping the DOM extremely light.
- **Cloudinary CDN Integration**: Instead of saturating the Node server's local disk and bandwidth, all media assets (profile pictures, chat attachments) are piped through `multer` and streamed directly to Cloudinary's Global CDN for rapid delivery and automated image optimization.
- **React Suspense & Code Splitting**: The frontend routes are lazy-loaded via `React.lazy()` and `<Suspense>`, significantly reducing the initial JavaScript bundle payload on the first paint.

---

## 🧪 Testing & Code Quality

A robust CI/CD pipeline starts with confident code:
- **Comprehensive Test Suite**: The backend is outfitted with integration tests written in `Jest` and `Supertest`. 
- **Isolated Ephemeral Databases**: Tests are executed against `mongodb-memory-server`, ensuring that tests run in a pristine, perfectly isolated environment without polluting local or staging databases.
- **API Documentation**: A live, interactive Swagger UI is automatically generated for the backend REST endpoints (available at `/api-docs`).

---

## ✨ Core Features

- **Instant Real-Time Messaging:** Sub-millisecond message delivery.
- **Read & Delivered Receipts:** Exactly like WhatsApp or iMessage.
- **Online Presence & Last Seen:** Track when your friends are active.
- **Friend Request System:** Search the global user base and establish private connections.
- **Rich Media Attachments:** Send images instantly.
- **Sleek UI:** Fully responsive, modern, dark-themed user interface built with Tailwind CSS.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Socket.io-client, WebCrypto API
- **Backend:** Node.js, Express, TypeScript, MongoDB, Socket.io, Redis, Jest, Supertest, Swagger
- **Cloud/Infra:** Cloudinary (CDN), MongoDB Atlas

---

## 💻 How to Run This Project

Detailed setup instructions, prerequisites, and a functional example have been moved to their own document for clarity. 

👉 **[Please see SETUP.md for local setup and testing instructions](./SETUP.md)**
