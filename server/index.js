 

// server.js - Node.js/Express server with Socket.io (Enhanced for cross-network WebRTC)
require('dotenv').config(); // MUST BE AT THE VERY TOP to load environment variables

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);

// --- CORS Configuration ---
// CORS for Express API routes
app.use(cors({
    origin: true,
    credentials: true
}));

// Enhanced Socket.io CORS configuration for cross-network support
const io = socketIo(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true
    },
    allowEIO3: true,
    maxHttpBufferSize: 1e8, // Increased for large ICE candidates
    pingTimeout: 60000, // Increased timeout for poor networks
    pingInterval: 25000,
    // Enhanced transport settings for cross-network reliability
    transports: ['websocket', 'polling'],
    upgradeTimeout: 30000,
    allowUpgrades: true
});

// --- Data Stores ---
const rooms = new Map(); // Stores general room information and a map of users currently in it.
const users = new Map(); // Stores global user information by their socket.id.
const connectionMetrics = new Map(); // Track connection quality metrics

// --- Utility Functions ---
function getServerIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

// Enhanced WebRTC Configuration with multiple STUN/TURN servers
function getWebRTCConfig() {
    return {
        iceServers: [
            // Google's public STUN servers (multiple for redundancy)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            
            // Additional STUN servers for better reliability
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.ekiga.net' },
            { urls: 'stun:stun.antisip.com' },
            { urls: 'stun:stun.bluesip.net' },
            
            // Free TURN servers (limited but helpful for testing)
            {
                urls: ['turn:openrelay.metered.ca:80'],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: ['turn:openrelay.metered.ca:443'],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: ['turn:openrelay.metered.ca:443?transport=tcp'],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all' // Allow both STUN and TURN candidates
    };
}

// Enhanced ICE candidate filtering for better cross-network support
function filterICECandidate(candidate) {
    if (!candidate || !candidate.candidate) return false;
    
    const candidateStr = candidate.candidate.toLowerCase();
    
    // Allow all valid candidate types including relay (TURN)
    const allowedTypes = ['host', 'srflx', 'prflx', 'relay'];
    const hasValidType = allowedTypes.some(type => candidateStr.includes(type));
    
    // Block known problematic candidates
    const blockedPatterns = [
        '169.254.', // Link-local addresses
        '0.0.0.0',  // Invalid addresses
        '::', // IPv6 unspecified
        'tcp type host', // Sometimes problematic
    ];
    
    const isBlocked = blockedPatterns.some(pattern => 
        candidateStr.includes(pattern)
    );
    
    // Prioritize TURN/relay candidates for cross-network connections
    const isRelay = candidateStr.includes('relay') || candidateStr.includes('turn');
    
    return hasValidType && !isBlocked;
}

// --- API Routes (for Express) ---
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Server is running!', 
        version: '2.1.0', 
        timestamp: new Date(),
        webrtcConfig: getWebRTCConfig()
    });
});

app.get('/api/server-info', (req, res) => {
    res.json({
        serverIPs: getServerIPs(),
        port: process.env.PORT || 3001,
        timestamp: new Date(),
        activeRooms: rooms.size,
        activeUsers: users.size,
        webrtcConfig: getWebRTCConfig()
    });
});

app.get('/api/webrtc-config', (req, res) => {
    res.json(getWebRTCConfig());
});

// --- Socket.io Connection Handling ---
io.on('connection', (socket) => {
    const clientIP = socket.handshake.address;
    console.log(`User connected: ${socket.id} from ${clientIP}`);

    // Initialize user data with enhanced tracking
    users.set(socket.id, {
        id: socket.id,
        name: null,
        roomId: null,
        joinedAt: new Date(),
        clientIP: clientIP,
        isAudioEnabled: true,
        isVideoEnabled: false,
        isScreenSharing: false,
        connectionQuality: 'unknown',
        networkType: 'unknown',
        pendingOffers: []
    });

    // Initialize connection metrics
    connectionMetrics.set(socket.id, {
        connectTime: Date.now(),
        lastPing: Date.now(),
        reconnectCount: 0,
        iceFailures: 0,
        successfulConnections: 0,
        pendingOffers: 0
    });

    /**
     * Enhanced user leave handling with connection cleanup
     */
    function handleUserLeave(socket) {
        const user = users.get(socket.id);
        if (user && user.roomId) {
            const roomId = user.roomId;
            const room = rooms.get(roomId);

            if (room) {
                room.users.delete(socket.id);

                // Notify other users with enhanced disconnect info
                socket.to(roomId).emit('user-left', {
                    userId: socket.id,
                    userName: user.name,
                    userCount: room.users.size,
                    disconnectReason: 'user-left',
                    timestamp: new Date()
                });
                
                console.log(`User ${user.name} (${socket.id}) left room ${roomId}`);

                // Clean up empty room
                if (room.users.size === 0) {
                    rooms.delete(roomId);
                    io.emit('room-deleted', roomId);
                    console.log(`Room ${roomId} deleted (empty)`);
                } else {
                    // Trigger reconnection attempts for remaining users if needed
                    io.emit('room-updated', {
                        id: roomId,
                        userCount: room.users.size,
                        createdAt: room.createdAt,
                        roomType: room.roomType
                    });
                }
            }
        }
        
        // Cleanup global data
        users.delete(socket.id);
        connectionMetrics.delete(socket.id);
    }

    // --- Socket.io Event Listeners ---

    // Event: Enhanced join-room with WebRTC config
    socket.on('join-room', ({ roomId, userName, roomType = 'video' }) => {
        try {
            console.log(`User ${userName} (${socket.id}) attempting to join room: ${roomId} [${roomType}]`);

            const user = users.get(socket.id);
            if (!user) {
                console.warn(`User ${socket.id} not found in global map on join-room attempt.`);
                socket.emit('error', { message: 'User data not initialized. Please refresh.' });
                return;
            }

            // Enhanced user leave handling for room switching
            if (user.roomId && user.roomId !== roomId) {
                console.log(`User ${user.name} (${socket.id}) leaving old room: ${user.roomId}`);
                socket.leave(user.roomId);
                handleUserLeave(socket);
            }

            // Update user information
            user.roomId = roomId;
            user.name = userName;
            user.isAudioEnabled = true;
            user.isVideoEnabled = (roomType === 'video');
            users.set(socket.id, user);

            // Join socket room
            socket.join(roomId);

            // Initialize room if it doesn't exist
            if (!rooms.has(roomId)) {
                rooms.set(roomId, {
                    id: roomId,
                    users: new Map(),
                    createdAt: new Date(),
                    roomType: roomType,
                    webrtcConfig: getWebRTCConfig()
                });
                io.emit('new-room-created', { 
                    id: roomId, 
                    roomType, 
                    createdAt: new Date()
                });
            }

            const room = rooms.get(roomId);
            
            // Get existing users information before adding current user
            const existingUsersInRoom = Array.from(room.users.values())
                .filter(u => u.id !== socket.id)
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    isAudioEnabled: u.isAudioEnabled,
                    isVideoEnabled: u.isVideoEnabled
                }));

            // Add current user to room's user map
            room.users.set(socket.id, user);

            // Send joined-room event to the user with existing users info
            socket.emit('joined-room', {
                roomId,
                userId: socket.id,
                userName: user.name,
                roomType: room.roomType,
                users: existingUsersInRoom,
                webrtcConfig: getWebRTCConfig()
            });

            // Notify existing users about the new user
            socket.to(roomId).emit('user-joined', {
                userId: socket.id,
                userName: user.name,
                isAudioEnabled: user.isAudioEnabled,
                isVideoEnabled: user.isVideoEnabled
            });

            console.log(`User ${user.name} (${socket.id}) successfully joined room ${roomId}. Room now has ${room.users.size} users.`);

            // Update room info
            io.emit('room-updated', {
                id: roomId,
                userCount: room.users.size,
                createdAt: room.createdAt,
                roomType: room.roomType
            });
        } catch (error) {
            console.error(`Error for user ${socket.id} joining room ${roomId}:`, error);
            socket.emit('error', { message: `Failed to join room ${roomId}: ${error.message}` });
        }
    });

    // Event: Enhanced offer handling with more details for debugging
    socket.on('offer', ({ offer, targetUserId }) => {
        const fromUser = users.get(socket.id);
        if (fromUser) {
            const targetSocket = io.sockets.sockets.get(targetUserId);
            const targetUser = users.get(targetUserId);

            if (targetSocket && targetUser && fromUser.roomId === targetUser.roomId) {
                console.log(`Forwarding offer from ${fromUser.name} (${socket.id}) to ${targetUser.name} (${targetUserId})`);
                
                // Track the offer in metrics
                const metrics = connectionMetrics.get(socket.id);
                if (metrics) {
                    metrics.pendingOffers++;
                }
                
                // Add additional debugging information to help trace issues
                targetSocket.emit('offer', {
                    offer,
                    fromUserId: socket.id,
                    fromUserName: fromUser.name,
                    timestamp: Date.now(),
                    webrtcConfig: getWebRTCConfig()
                });
            } else {
                console.warn(`Offer: Target user ${targetUserId} not found or not in same room as ${socket.id}.`);
                socket.emit('call-failed', { 
                    error: `Could not send offer to ${targetUserId}. User not available or in a different room.`
                });
            }
        }
    });

    // Event: Enhanced answer handling with tracking
    socket.on('answer', ({ answer, targetUserId }) => {
        const fromUser = users.get(socket.id);
        if (fromUser) {
            const targetSocket = io.sockets.sockets.get(targetUserId);
            const targetUser = users.get(targetUserId);

            if (targetSocket && targetUser && fromUser.roomId === targetUser.roomId) {
                console.log(`Forwarding answer from ${fromUser.name} (${socket.id}) to ${targetUser.name} (${targetUserId})`);
                
                // Track the completed offer in metrics
                const metrics = connectionMetrics.get(targetUserId);
                if (metrics && metrics.pendingOffers > 0) {
                    metrics.pendingOffers--;
                    metrics.successfulConnections++;
                }
                
                targetSocket.emit('answer', {
                    answer,
                    fromUserId: socket.id,
                    fromUserName: fromUser.name,
                    timestamp: Date.now()
                });
            } else {
                console.warn(`Answer: Target user ${targetUserId} not found or not in same room as ${socket.id}.`);
                socket.emit('call-failed', { 
                    error: `Could not send answer to ${targetUserId}. User not available or in a different room.`
                });
            }
        }
    });

    // Event: Enhanced ICE candidate handling with better logging
    socket.on('ice-candidate', ({ candidate, targetUserId }) => {
        const fromUser = users.get(socket.id);
        if (fromUser) {
            const targetSocket = io.sockets.sockets.get(targetUserId);
            const targetUser = users.get(targetUserId);

            if (targetSocket && targetUser && fromUser.roomId === targetUser.roomId) {
                console.log(`Forwarding ICE candidate from ${fromUser.name} (${socket.id}) to ${targetUser.name} (${targetUserId})`);
                
                // Include extra data to help debug connection issues
                targetSocket.emit('ice-candidate', {
                    candidate,
                    fromUserId: socket.id,
                    fromUserName: fromUser.name,
                    timestamp: Date.now()
                });
            } else {
                console.warn(`ICE candidate: Target user ${targetUserId} not found or not in same room as ${socket.id}.`);
            }
        }
    });

    // Event: Get WebRTC configuration
    socket.on('get-webrtc-config', () => {
        socket.emit('webrtc-config', getWebRTCConfig());
    });

    // Event: Report connection status to server (for monitoring and debugging)
    socket.on('connection-status', ({ peerId, status, streamInfo }) => {
        const user = users.get(socket.id);
        if (user && user.roomId) {
            console.log(`Connection status from ${user.name} (${socket.id}) to ${peerId}: ${status}`);
            
            // Update connection metrics
            const metrics = connectionMetrics.get(socket.id);
            if (metrics) {
                metrics.lastPing = Date.now();
                
                if (status === 'failed') {
                    metrics.iceFailures++;
                } else if (status === 'connected') {
                    metrics.successfulConnections++;
                }
            }
        }
    });

    // Event: Media state changes (audio/video toggle)
    socket.on('media-state-change', ({ isAudioEnabled, isVideoEnabled, isScreenSharing }) => {
        const user = users.get(socket.id);
        if (user && user.roomId) {
            user.isAudioEnabled = isAudioEnabled;
            user.isVideoEnabled = isVideoEnabled;
            user.isScreenSharing = isScreenSharing;
            
            socket.to(user.roomId).emit('user-media-state-change', {
                userId: socket.id,
                userName: user.name,
                isAudioEnabled,
                isVideoEnabled,
                isScreenSharing
            });
        }
    });

    // Event: audio toggle (simplified version)
    socket.on('audio-toggle', ({ isEnabled }) => {
        const user = users.get(socket.id);
        if (user && user.roomId) {
            user.isAudioEnabled = isEnabled;
            socket.to(user.roomId).emit('user-audio-toggle', {
                userId: socket.id,
                isEnabled
            });
        }
    });

    // Event: video toggle (simplified version)
    socket.on('video-toggle', ({ isEnabled }) => {
        const user = users.get(socket.id);
        if (user && user.roomId) {
            user.isVideoEnabled = isEnabled;
            socket.to(user.roomId).emit('user-video-toggle', {
                userId: socket.id,
                isEnabled
            });
        }
    });

    // Event: Chat messages
    socket.on('chat-message', ({ message, roomId }) => {
        const user = users.get(socket.id);
        if (user && user.roomId === roomId) {
            const messageData = {
                id: Date.now(),
                userId: socket.id,
                userName: user.name,
                message,
                timestamp: new Date().toISOString()
            };
            io.to(roomId).emit('chat-message', messageData);
        }
    });

    // Event: Leave room
    socket.on('leave-room', () => {
        handleUserLeave(socket);
    });

    // Event: Disconnect
    socket.on('disconnect', (reason) => {
        const user = users.get(socket.id);
        console.log(`User ${user?.name || 'Unknown'} (${socket.id}) disconnected: ${reason}`);
        handleUserLeave(socket);
    });

    // Connection testing events
    socket.on('connection-test', (data) => {
        socket.emit('connection-test-response', { 
            ...data, 
            response: 'Connection test successful',
            serverTimestamp: Date.now(),
            webrtcConfig: getWebRTCConfig()
        });
    });
});

// --- Server Startup ---
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => { 
    console.log(`\n🚀 Video Call Server running on port ${PORT}`);
    console.log(`📡 Server IPs:`, getServerIPs());
    console.log(`💬 WebRTC Config:`, JSON.stringify(getWebRTCConfig(), null, 2));
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    });
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});