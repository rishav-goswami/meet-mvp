import React, { useEffect, useRef } from 'react';
import { Crown, UserCheck } from 'lucide-react';
import { UserRole } from '../types';
import { StreamingIndicator } from './Streaming/StreamingIndicator';

interface Props {
    stream: MediaStream | null;
    isLocal?: boolean;
    label?: string;
    role?: UserRole;
    isStreaming?: boolean;
    viewerCount?: number;
}

export const VideoCard: React.FC<Props> = ({ stream, isLocal, label, role, isStreaming, viewerCount }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (videoEl && stream) {
            // 1. Assign stream
            videoEl.srcObject = stream;

            // 2. Mute local to prevent echo/feedback loops
            if (isLocal) {
                videoEl.muted = true;
            }

            // 3. Play with error handling (Fixes AbortError)
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play was prevented. This is normal in some browsers until user interacts.
                    console.log("Autoplay prevented/pending:", error.name);
                });
            }
        }
    }, [stream, isLocal]); // Re-run if stream changes

    return (
        <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video shadow-lg ring-1 ring-gray-700">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${isLocal ? '-scale-x-100' : ''}`}
            />
            <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-sm font-medium text-white backdrop-blur-sm flex items-center gap-2">
                {role === 'host' && <Crown size={14} className="text-yellow-500" />}
                {role === 'subhost' && <UserCheck size={14} className="text-purple-500" />}
                <span>{label || (isLocal ? "You" : "User")}</span>
            </div>
            {isStreaming && <StreamingIndicator isStreaming={isStreaming} viewerCount={viewerCount} />}
        </div>
    );
};