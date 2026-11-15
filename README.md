# FriendLoop 👋

**[View Live Demo](https://friendloop-zitl.onrender.com)**

FriendLoop is a full-stack, secure real-time chat application built using the MERN stack (MongoDB, Express, React, Node.js), Socket.io, Redis, and WebCrypto.

I built this project to tackle the core engineering challenges of modern distributed communication: **horizontal scalability, zero-knowledge end-to-end privacy, defense-in-depth security, and sub-millisecond real-time event distribution.**

---

## 💡 Why I Built This & What It Solves

### 1. Real-Time & Horizontal Scalability
* **The Problem:** A single Node.js process is constrained by memory and event loop capacity. As concurrent WebSocket connections grow, distributing state across multiple servers typically causes connection partitioning.
* **The Solution:** Integrated Redis Pub/Sub via `@socket.io/redis-adapter` with automatic reconnection and in-memory fallback. Sockets scale horizontally across multiple stateless Node.js server instances, seamlessly routing messages between users connected to different physical nodes.

### 2. Dual End-to-End Encryption (E2EE) with Non-Extractable Key Storage
* **The Problem:** Storing cryptographic keys in browser `localStorage` leaves users vulnerable to XSS exfiltration. Furthermore, naive 1-to-1 E2EE often prevents the sender from decrypting their own chat history.
* **The Solution:** Implemented Dual RSA-OAEP (2048-bit, SHA-256) encryption via the browser's native WebCrypto API. Each message payload is dual-encrypted for both the recipient's and sender's public keys (`E2EE:encSelf|encRecipient`). Private keys are generated with `extractable: false` and stored directly as `CryptoKey` objects in browser **IndexedDB**, ensuring that malicious JavaScript cannot extract the raw private key bytes.

### 3. Strict Broken Access Control (IDOR) & Room Authorization
* **The Problem:** REST endpoints and WebSocket room joins often suffer from Insecure Direct Object References (IDOR), allowing authenticated users to eavesdrop on chats or forge messages.
* **The Solution:** Implemented strict authorization across all layers:
  * **REST Level:** Message fetching (`GET /api/messages/:chatId`) and posting (`POST /api/messages`) verify that `req.user.id` is an active member in `chat.members`.
  * **Socket Level:** The `chat:join` and `messages:mark_read` handlers verify database room membership before granting room subscriptions.
  * **Friendship-Gated Chats:** Direct chats can only be instantiated between confirmed friends (`FriendRequest` status `accepted`).

### 4. NoSQL & ReDoS Injection Prevention
* **The Problem:** Unsanitized user inputs can execute MongoDB operator injection (`$regex`, `$ne`) or trigger catastrophic Regular Expression Denial of Service (ReDoS).
* **The Solution:**
  * **Type Validation:** Validated all request payloads using strict **Zod** schemas.
  * **In-Place Sanitizer:** Custom middleware strips MongoDB query operators (`$` and `.`) from request bodies and query parameters.
  * **Search Hardening:** Enforced a minimum 2-character query length and escaped regex special characters before querying.
  * **Mongoose Strict Query:** Enforced `mongoose.set("strictQuery", true)`.

### 5. Dual-Token Architecture & Silent Session Rotation
* **The Problem:** Storing JWTs in `localStorage` invites token theft, while long-lived access tokens cannot be revoked.
* **The Solution:** 
  * Separated access and refresh signing secrets (`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`).
  * Enforced token typing claims (`typ: "access"` vs `typ: "refresh"`).
  * Kept short-lived access tokens (15m) strictly **in-memory** in frontend state (never in `localStorage`).
  * Placed 7-day refresh tokens inside `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
  * Implemented **automatic token rotation with reuse detection**: each refresh increments the user's `tokenVersion`. If an outdated token is replayed, all active sessions for that account are revoked immediately.

### 6. User Privacy & Friends-Only Presence
* **The Problem:** Broadcasting presence globally leaks user behavioral metadata, search endpoints can expose user emails, and shared demo accounts can leak test messages.
* **The Solution:**
  * **Friends-Only Presence:** WebSocket online/offline status updates are broadcast exclusively to confirmed friends rather than the global socket namespace.
  * **Email PII Redaction:** Stripped email addresses from search results, friend requests, member listings, and public profiles.
  * **Ephemeral Demo Accounts:** Demo logins instantiate isolated per-session guest accounts with private Echo Bot threads, preventing cross-session data leaks.
  * **Cascade Deletion:** Removing a friend immediately deletes all associated message records to eliminate orphaned data.
  * **Encrypted Last Message:** Previews for E2EE chats display `"🔒 Encrypted Message"`, ensuring chat lists never leak plaintext snippets.

### 7. High-Performance Cursor Pagination
* **The Problem:** Offset-based pagination (`skip()` / `limit()`) degrades to $O(N)$ query time complexity as chat history grows into millions of documents.
* **The Solution:** Replaced offset pagination with indexed **Cursor-based pagination** using `{ createdAt: { $lt: cursor } }`. Chat queries execute in $O(1)$ constant time complexity regardless of how far back in chat history a user scrolls. Frontend rendering is streamlined using React Suspense and lazy-loading.

### 8. Upload Boundaries & CDN Offloading
* **The Problem:** Unbounded file uploads can exhaust server storage and allow malicious script execution.
* **The Solution:** Configured Multer with Cloudinary to enforce a 10MB limit and strict MIME-type whitelisting (`image/*`, `application/pdf`, `text/plain`). Outgoing attachment URLs are validated on the backend to guarantee they originate from the trusted Cloudinary domain.

---

## ✨ Features

- **Real-Time Messaging:** Instant messaging with Socket.io and Redis adapter.
- **Delivery & Read Receipts:** WhatsApp-style status tracking (`sent`, `delivered`, `read`).
- **Friends-Only Online & Last Seen:** Track friend availability securely.
- **Dual End-to-End Encryption:** Client-side WebCrypto RSA-OAEP encryption with non-extractable IndexedDB keys.
- **Media Sharing:** Secure image and file uploads powered by Cloudinary CDN.
- **Friend Management:** Search users, send/accept friend requests, and unfriend with cascade cleanup.
- **Automated CI Security:** GitHub Actions workflow scanning for secrets and credential leaks via TruffleHog.
- **Interactive API Docs:** Interactive Swagger UI documentation at `/api-docs`.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Socket.io-client, Axios, Lucide Icons, WebCrypto API, IndexedDB.
- **Backend:** Node.js, Express 5, TypeScript, MongoDB, Mongoose, Socket.io, Redis (`ioredis`), Zod.
- **Security:** Helmet, Express Rate Limit, Cookie-Parser, BcryptJS, TruffleHog CI.
- **Testing:** Jest, Supertest, Ts-Jest.
- **Media & Docs:** Cloudinary, Multer, Swagger UI.

---

## 💻 Local Setup & Installation

Want to run FriendLoop on your machine?

👉 **[Follow the SETUP.md Guide](./SETUP.md)** for step-by-step instructions.
