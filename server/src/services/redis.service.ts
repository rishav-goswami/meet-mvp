import { createClient } from 'redis';
import { config } from '../config/config';

export class RedisService {
    private static instance: RedisService;
    public client;

    private constructor() {
        this.client = createClient({
            socket: { host: config.redis.host, port: config.redis.port }
        });
        this.client.on('error', (err) => console.error('Redis Client Error', err));
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    public async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
            console.log('Redis connected');
        }
    }
}