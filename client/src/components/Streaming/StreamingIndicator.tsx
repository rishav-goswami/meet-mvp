import React from 'react';
import { Radio } from 'lucide-react';

interface StreamingIndicatorProps {
  isStreaming: boolean;
  viewerCount?: number;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ isStreaming, viewerCount }) => {
  if (!isStreaming) return null;

  return (
    <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-600 px-2 py-1 rounded-md z-10">
      <Radio size={14} className="animate-pulse" />
      <span className="text-xs font-semibold text-white">LIVE</span>
      {viewerCount !== undefined && (
        <span className="text-xs text-white/80">{viewerCount} viewers</span>
      )}
    </div>
  );
};

