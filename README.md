# 🚀 WebRTC Video Conference MVP

## 📌 Project Goal

Build a scalable, Google Meet-like video conferencing MVP for 3–5 users using a **Mediasoup SFU** architecture. The focus is on interview-defensible engineering, correct WebRTC handling, and a clear path to hyper-scale.

## 🛠 Tech Stack

* **Language:** TypeScript (Backend & Frontend)
* **Frontend:** React (Vite) + `mediasoup-client`
* **Backend:** Node.js + `mediasoup` + Socket.IO
* **Infrastructure:** Docker, Docker Compose
* **Signaling/State:** Redis (for room state & scalability)
* **NAT Traversal:** Custom Coturn Server (STUN/TURN)
* **Reverse Proxy:** Nginx (SSL termination & static serving)

---

## 📅 Iteration Plan

### Phase 1: Infrastructure & Foundation (Current Step)

* [ ] Initialize Project Structure (Monorepo-style: `/server`, `/client`).
* [ ] **Docker Setup:** Create `docker-compose.yml` for **Redis** and **Coturn**.
* [ ] **Backend Config:** Initialize TypeScript Node.js project.
* [ ] **Mediasoup Check:** Verify Mediasoup workers can spawn and bind ports locally.

### Phase 2: The SFU Backend (Node.js + Mediasoup)

* [ ] **Signaling Server:** Set up Socket.IO with Redis Adapter.
* [ ] **Room Architecture:** Implement `Room` and `Peer` classes.
* [ ] **Mediasoup Integration:**
* Initialize Workers & Router.
* Implement `createWebRtcTransport`.
* Implement `produce` (Publish Stream).
* Implement `consume` (Subscribe Stream).

* [ ] **Event Handling:** Handle `join`, `leave`, and `disconnect` gracefully.

### Phase 3: The Frontend Core (React + WebRTC)

* [ ] **Setup:** Vite React + TypeScript.
* [ ] **Signal Client:** Create a Socket.IO hook/context for room coordination.
* [ ] **Mediasoup Client:**
* Initialize `Device`.
* Load Router capabilities.
* Handle `sendTransport` (Local Camera/Mic).
* Handle `recvTransport` (Remote Streams).

### Phase 4: UI & Integration

* [ ] **Video Grid:** Build a responsive grid for 1 vs. many participants.
* [ ] **Stream Management:** Handle "New User Joined" and "User Left" UI updates.
* [ ] **Controls:** Mute/Unmute Audio & Video toggles.

### Phase 5: Production & Defense Prep

* [ ] **Final Docker:** Containerize the Node.js App & Nginx.
* [ ] **Cloud Sim:** Run full stack with `docker-compose up` simulating a production env.
* [ ] **Interview Prep:** Finalize answers for "Why SFU?", "How to scale?", "Latency vs. Bandwidth".
