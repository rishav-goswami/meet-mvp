# meet-mvp

A minimal, self-hosted WebRTC meeting application (MVP) with optional live-streaming features.

This repository contains a full-stack example for building a video meeting app using a Node.js server (Signaling, Mediasoup helpers) and a TypeScript React client. The project includes support for TURN/coturn, Nginx configuration, and Docker compose files for local and production deployments.

**Key features**
- Peer-to-peer and server-assisted WebRTC signaling.
- Multiplatform client (browser) implemented with Vite + React + TypeScript.
- Server-side components for signaling and mediasoup integration.
- Optional live streaming capabilities and host controls.
- Docker and docker-compose setup for local and production use.

**Repository layout**
- [client](client): React + Vite frontend (TypeScript).
- [server](server): Node.js backend and signaling implementation.
- [coturn](coturn): TURN server config for NAT traversal.
- [nginx](nginx): Nginx config and TLS certs directory.
- docker-compose.yml / docker-compose.prod.yml: Local and production orchestration.

Getting started
---------------

Prerequisites

- Node.js (16+ recommended)
- pnpm, npm or yarn
- Docker & Docker Compose (optional, for running with containers)

Local development (two-terminal approach)

1. Start the server

	- Open a terminal in the repository root and install server dependencies:

	```bash
	cd server
	npm install
	npm run build
	npm run start:dev
	```

	The server exposes signaling and API endpoints. See [server/src/index.ts](server/src/index.ts) for the entrypoint.

2. Start the client

	- In another terminal:

	```bash
	cd client
	npm install
	npm run dev
	```

	The client UI is served locally via Vite. Main entry is [client/src/main.tsx](client/src/main.tsx).

Environment configuration
-------------------------

Server configuration lives under [server/src/config](server/src/config). Typical environment variables (configure via `.env` or your process manager):

- `PORT` — server port (default: 3000)
- `NODE_ENV` — environment (development/production)
- TURN server host/credentials if using coturn

Check [server/src/config/config.ts](server/src/config/config.ts) for current variable names and defaults.

Running with Docker
-------------------

Start services using Docker Compose (local):

```bash
docker-compose up --build
```

For production, review `docker-compose.prod.yml` and the `nginx` and `coturn` configurations before starting.

Architecture notes
------------------

- The server coordinates signaling between clients and integrates with mediasoup for SFU-style server-side routing when needed.
- The client provides a meeting UI and optional host controls and streaming UI under `client/src/components`.
- TURN configuration in `coturn/turnserver.conf` is included as a reference for self-hosting.

Contributing
------------

Contributions are welcome. When opening issues or PRs:

- Provide a concise description of the bug or feature.
- Include reproduction steps and expected vs actual behavior.
- Add unit or integration tests where appropriate.

Maintenance & support
---------------------

This project is a minimal viable implementation intended for learning and small deployments. For production, carefully review:

- Media server scaling and load balancing
- Security (TLS termination, secure TURN credentials)
- Operational monitoring and backups

License
-------

This repository is provided under the MIT License. See the `LICENSE` file for details.

Contact
-------

If you have questions about usage or deployment, open an issue on this repository.

