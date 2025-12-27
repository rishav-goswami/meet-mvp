import React, { useEffect, useRef } from 'react';

interface Props {
    stream: MediaStream | null;
    isLocal?: boolean;
    label?: string;
}

export const VideoCard: React.FC<Props> = ({ stream, isLocal, label }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (videoEl && stream) {
            videoEl.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video shadow-lg ring-1 ring-gray-700">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full object-cover ${isLocal ? '-scale-x-100' : ''}`}
            />
            <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-sm font-medium text-white backdrop-blur-sm">
                {label || (isLocal ? "You" : "User")}
            </div>
        </div>
    );
};