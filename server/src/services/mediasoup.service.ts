import * as mediasoup from 'mediasoup';
import { config } from '../config/config';
import { Worker } from 'mediasoup/types';

export class MediasoupService {
    private static instance: MediasoupService;
    private workers: Worker[] = [];
    private nextWorkerIdx = 0;

    private constructor() { }

    public static getInstance(): MediasoupService {
        if (!MediasoupService.instance) {
            MediasoupService.instance = new MediasoupService();
        }
        return MediasoupService.instance;
    }

    public async initialize() {
        console.log(`🚀 Starting ${config.mediasoup.numWorkers} Mediasoup Workers...`);
        for (let i = 0; i < config.mediasoup.numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: config.mediasoup.worker.logLevel,
                logTags: config.mediasoup.worker.logTags as any,
                rtcMinPort: config.mediasoup.worker.rtcMinPort,
                rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
            });

            worker.on('died', () => {
                console.error(`❌ Worker ${worker.pid} died. Exiting...`);
                process.exit(1);
            });

            this.workers.push(worker);
        }
    }

    public getWorker(): Worker {
        const worker = this.workers[this.nextWorkerIdx];
        this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
        return worker;
    }
}