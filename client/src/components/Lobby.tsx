import React, { useState } from 'react';
import { Video, Users } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';

interface Props {
    onJoin: (roomId: string, secret: string, username?: string) => void;
}

export const Lobby: React.FC<Props> = ({ onJoin }) => {
    const { user } = useAuth();
    const [roomId, setRoomId] = useState('');
    const [displayName, setDisplayName] = useState(user?.username || '');

    const createRoom = () => {
        const newId = uuidv4().slice(0, 8); // Generate short random ID
        setRoomId(newId);
        onJoin(newId, '', displayName || user?.username || undefined);
    };

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 text-white">
            <div className="max-w-md w-full bg-dark-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                        <Video size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Meet MVP</h1>
                    <p className="text-gray-400 mt-2">Secure Video Conferencing</p>
                </div>

                <div className="space-y-4">
                    {/* Display Name Input (optional override) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                            <Users size={14} /> Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-dark-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-white"
                            placeholder={user?.username || "Enter your display name..."}
                        />
                        <p className="text-xs text-gray-500 mt-1">Logged in as: {user?.username}</p>
                    </div>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-dark-800 text-gray-400">Join Existing Room</span>
                        </div>
                    </div>

                    {/* Room ID Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            className="flex-1 bg-dark-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="Enter Room ID"
                            maxLength={8}
                        />
                        <button
                            onClick={() => roomId && onJoin(roomId, '', displayName || user?.username || undefined)}
                            disabled={!roomId || roomId.length < 4}
                            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition"
                        >
                            Join
                        </button>
                    </div>

                    <button
                        onClick={createRoom}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-lg font-medium transition flex items-center justify-center gap-2 mt-4 shadow-lg hover:shadow-blue-500/20"
                    >
                        <Video size={20} />
                        Create New Meeting
                    </button>
                </div>
            </div>
        </div>
    );
};