import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/config';
import { RedisService } from './services/redis.service';
import { MediasoupService } from './services/mediasoup.service';
import { RoomManager } from './modules/room/RoomManager';
import { SocketHandler } from './modules/signaling/socket.handler';

async function bootstrap() {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: { origin: config.server.corsOrigin }
    });

    // 1. Initialize Services
    const redisService = RedisService.getInstance();
    await redisService.connect();

    const mediasoupService = MediasoupService.getInstance();
    await mediasoupService.initialize();

    // 2. Initialize Logic
    // UPDATE: Pass redisService here
    const roomManager = new RoomManager(mediasoupService, redisService);
    const socketHandler = new SocketHandler(io, roomManager);

    // 3. Handle Connections
    io.on('connection', (socket) => {
        socketHandler.handleConnection(socket);
    });

    // 4. Start Server
    httpServer.listen(config.server.port, () => {
        console.log(`Server listening on http://localhost:${config.server.port}`);
    });
}

bootstrap();