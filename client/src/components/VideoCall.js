import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../hooks/useSocket';
import { useMedia } from '../hooks/useMedia';
import { usePeerConnection } from '../hooks/usePeerConnection';
import Chat from './Chat';

const VideoContainer = styled.div`
  height: 100vh;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const VideoGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
  overflow: auto;
`;

const VideoCard = styled.div`
  position: relative;
  background: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: ${props => props.mirrored ? 'scaleX(-1)' : 'none'};
  will-change: transform; /* Optimize GPU rendering */
  transition: opacity 0.2s ease;
  opacity: ${props => props.loading ? 0.5 : 1};
`;

const VideoPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: white;
  font-size: 3rem;
`;

const UserLabel = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.8);
`;

const ControlButton = styled.button`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &.audio {
    background: ${props => props.active ? '#28a745' : '#dc3545'};
    color: white;
  }
  
  &.video {
    background: ${props => props.active ? '#28a745' : '#dc3545'};
    color: white;
  }
  
  &.hang-up {
    background: #dc3545;
    color: white;
    width: 70px;
    height: 70px;
  }
  
  &.screen-share {
    background: ${props => props.active ? '#007bff' : '#6c757d'};
    color: white;
  }
  
  &:hover {
    transform: scale(1.1);
  }
`;

const RoomInfo = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  z-index: 100;
`;

const ErrorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 1000;
  padding: 2rem;
  text-align: center;
`;

const ErrorHeading = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: #dc3545;
`;

const ErrorMessage = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  max-width: 600px;
`;

const RetryButton = styled.button`
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #218838;
    transform: scale(1.05);
  }
`;

const Toast = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  background: ${props => props.type === 'error' ? '#dc3545' : props.type === 'success' ? '#28a745' : '#17a2b8'};
  color: white;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out forwards;
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;

const UsernameModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const UsernameForm = styled.div`
  background: #2a2a2a;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  text-align: center;
`;

const UsernameInput = styled.input`
  width: 100%;
  padding: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  margin: 1rem 0;
  backdrop-filter: blur(10px);
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const UsernameButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

// Add a diagnostic button to troubleshoot video and audio issues
const DiagnosticButton = styled.button`
  position: absolute;
  bottom: 100px;
  right: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 18px;
  cursor: pointer;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }
`;

// Diagnostic overlay component
const DiagnosticOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 20px;
  z-index: 1000;
  overflow-y: auto;
  font-family: monospace;
`;

const DiagnosticTitle = styled.h2`
  color: #28a745;
  margin-bottom: 20px;
`;

const DiagnosticSection = styled.div`
  margin-bottom: 15px;
  border-bottom: 1px solid #444;
  padding-bottom: 15px;
`;

const DiagnosticClose = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 15px;
  cursor: pointer;
  
  &:hover {
    background: #bd2130;
  }
`;

const DiagnosticItem = styled.div`
  margin-bottom: 8px;
  display: flex;
  
  &.success { color: #28a745; }
  &.warning { color: #ffc107; }
  &.error { color: #dc3545; }
  &.info { color: #17a2b8; }
`;

const VideoCall = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Component state
  const [userName, setUserName] = useState('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [isUserNameSet, setIsUserNameSet] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [toast, setToast] = useState(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState(null);
  
  // Component lifecycle tracking with refs
  const isMountedRef = useRef(true);
  const hasJoinedRef = useRef(false);
  const hasSetupEventHandlersRef = useRef(false);
  const cleanupInProgressRef = useRef(false);
  
  // Custom hooks for WebRTC
  const { 
    socket, 
    isConnected, 
    connectionError: socketError, 
    emit, 
    on, 
    off 
  } = useSocket();
  
  const { 
    localStream, 
    localVideoRef, 
    isVideoEnabled, 
    isAudioEnabled,
    isScreenSharing,
    mediaError,
    getUserMedia, 
    toggleVideo, 
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    stopMedia
  } = useMedia(true); // Always initialize with video=true for video calls
  
  const { 
    remoteStreams, 
    connectionStatus,
    connectionError: peerError,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    closePeerConnection,
    closeAllPeerConnections,
    hasPeerConnection,
    updateStream
  } = usePeerConnection();

  // Remote video references
  const remoteVideoRefs = useRef(new Map());

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Track component mount status for safer effect cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check if we need to prompt for username
  useEffect(() => {
    if (location.state?.userName) {
      setUserName(location.state.userName);
      setIsUserNameSet(true);
      return;
    }
    
    try {
      const recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]');
      const matchingRoom = recentRooms.find(room => room.id === roomId);
      
      if (matchingRoom && matchingRoom.userName) {
        setUserName(matchingRoom.userName);
        setIsUserNameSet(true);
        return;
      }
    } catch (error) {
      console.error('Error checking recent rooms:', error);
    }
    
    setShowUsernamePrompt(true);
  }, [location.state, roomId]);

  // Handle username submission
  const handleUsernameSubmit = useCallback(() => {
    if (userName.trim()) {
      setIsUserNameSet(true);
      setShowUsernamePrompt(false);
      
      // Save to recent rooms
      try {
        const recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]');
        const roomExists = recentRooms.some(room => room.id === roomId);
        
        if (!roomExists) {
          const newRoom = {
            id: roomId,
            userName: userName.trim(),
            timestamp: Date.now()
          };
          
          recentRooms.unshift(newRoom);
          localStorage.setItem('recentRooms', JSON.stringify(recentRooms.slice(0, 5)));
        }
      } catch (error) {
        console.error('Error saving to recent rooms:', error);
      }
    }
  }, [userName, roomId]);

  // Initialize media first
  useEffect(() => {
    if (!isUserNameSet) return;
    
    const initializeMedia = async () => {
      try {
        console.log("Getting user media...");
        await getUserMedia(true, true); // Always request both audio and video
        console.log("Got user media successfully");
        setIsMediaReady(true);
      } catch (error) {
        console.error('Error getting user media:', error);
        setConnectionError(error.message || 'Failed to access camera/microphone');
      }
    };

    initializeMedia();
  }, [getUserMedia, isUserNameSet]);

  // Join room after media is ready
  useEffect(() => {
    // Only join when all prerequisites are met
    if (!socket || !isConnected || !isMediaReady || !localStream || !isUserNameSet || hasJoinedRef.current) {
      return;
    }
    
    console.log("All prerequisites met, joining room:", roomId);
    emit('join-room', { roomId, userName, roomType: 'video' });
    hasJoinedRef.current = true;
    
    // Cleanup function
    return () => {
      if (hasJoinedRef.current && isMountedRef.current) {
        console.log("Cleaning up room connection...");
        emit('leave-room');
        hasJoinedRef.current = false;
      }
    };
  }, [socket, isConnected, roomId, userName, emit, isUserNameSet, isMediaReady, localStream]);

  // Set up socket event listeners once
  useEffect(() => {
    // Wait until all needed resources are available
    if (!socket || !isConnected || !localStream || hasSetupEventHandlersRef.current) {
      return;
    }
    
    console.log("Setting up WebRTC event handlers");
    hasSetupEventHandlersRef.current = true;

    // User joined the room
    const handleUserJoined = ({ userId, userName }) => {
      console.log(`User joined: ${userName} (${userId})`);
      showToast(`${userName} joined the call`);
      
      setTimeout(() => {
        if (localStream && isMountedRef.current) {
          // Create peer connection for this user
          const handleIceCandidate = (candidate) => {
            emit('ice-candidate', { candidate, targetUserId: userId });
          };
          
          createPeerConnection(userId, localStream, handleIceCandidate)
            .then(() => createOffer(userId))
            .then(offer => {
              if (offer) {
                console.log("Sending offer to:", userId);
                emit('offer', { offer, targetUserId: userId });
              }
            })
            .catch(err => {
              console.error("Error creating peer connection:", err);
            });
        }
      }, 1000);
    };
    
    // Handle incoming WebRTC offer
    const handleOffer = async ({ offer, fromUserId, fromUserName }) => {
      console.log(`Received offer from: ${fromUserName} (${fromUserId})`);
      
      try {
        // Send ICE candidates to the peer
        const handleIceCandidate = (candidate) => {
          emit('ice-candidate', { candidate, targetUserId: fromUserId });
        };
        
        // Close existing connection if any
        if (hasPeerConnection(fromUserId)) {
          console.log("Closing existing peer connection before handling offer");
          closePeerConnection(fromUserId);
        }
        
        // Create new peer connection and handle offer
        console.log("Creating new peer connection for offer");
        const answer = await handleOffer(fromUserId, offer, localStream, handleIceCandidate);
        
        if (answer) {
          console.log("Sending answer to:", fromUserId);
          emit('answer', { answer, targetUserId: fromUserId });
          
          // Make sure the participant is added to our list
          setParticipants(prev => {
            if (!prev.some(p => p.id === fromUserId)) {
              return [...prev, { id: fromUserId, name: fromUserName }];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };
    
    // Handle incoming WebRTC answer
    const handleAnswer = ({ answer, fromUserId }) => {
      console.log(`Received answer from: ${fromUserId}`);
      handleAnswer(fromUserId, answer);
    };
    
    // Handle incoming ICE candidates
    const handleIceCandidate = ({ candidate, fromUserId }) => {
      console.log(`Received ICE candidate from: ${fromUserId}`);
      addIceCandidate(fromUserId, candidate);
    };
    
    // Handle user leaving the room
    const handleUserLeft = ({ userId, userName }) => {
      console.log(`User left: ${userName} (${userId})`);
      showToast(`${userName} left the call`);
      
      // Clean up the peer connection
      closePeerConnection(userId);
      
      // Remove from participants list
      setParticipants(prev => prev.filter(p => p.id !== userId));
    };
    
    // Joined room successfully
    const handleJoinedRoom = ({ users }) => {
      console.log('Joined room successfully, existing users:', users);
      setParticipants(users);
      setIsConnecting(false);
    };

    // Register all event listeners
    on('user-joined', handleUserJoined);
    on('offer', handleOffer);
    on('answer', handleAnswer);
    on('ice-candidate', handleIceCandidate);
    on('user-left', handleUserLeft);
    on('joined-room', handleJoinedRoom);

    // Cleanup when unmounting
    return () => {
      if (hasSetupEventHandlersRef.current) {
        console.log("Removing event listeners");
        off('user-joined', handleUserJoined);
        off('offer', handleOffer);
        off('answer', handleAnswer);
        off('ice-candidate', handleIceCandidate);
        off('user-left', handleUserLeft);
        off('joined-room', handleJoinedRoom);
        
        hasSetupEventHandlersRef.current = false;
      }
    };
  }, [
    socket, isConnected, localStream, createPeerConnection, createOffer,
    handleOffer, handleAnswer, addIceCandidate, closePeerConnection,
    hasPeerConnection, emit, on, off, showToast
  ]);

  // Handle errors from hooks
  useEffect(() => {
    if (socketError) {
      setConnectionError(`Server connection error: ${socketError}`);
    } else if (mediaError) {
      setConnectionError(`Media error: ${mediaError}`);
    } else if (peerError) {
      setConnectionError(`Connection error: ${peerError}`);
    }
  }, [socketError, mediaError, peerError]);

  // Handle toggle audio
  const handleToggleAudio = useCallback(() => {
    toggleAudio();
    emit('audio-toggle', { isEnabled: !isAudioEnabled });
  }, [toggleAudio, isAudioEnabled, emit]);

  // Handle toggle video
  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    emit('video-toggle', { isEnabled: !isVideoEnabled });
  }, [toggleVideo, isVideoEnabled, emit]);

  // Handle toggle screen share
  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        stopScreenShare();
      } else {
        const screenStream = await startScreenShare();
        
        if (screenStream) {
          // Update all peer connections with new stream
          Object.keys(connectionStatus).forEach(peerId => {
            if (connectionStatus[peerId] === 'connected') {
              updateStream(peerId, screenStream);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      showToast('Failed to share screen', 'error');
    }
  }, [isScreenSharing, stopScreenShare, startScreenShare, connectionStatus, updateStream, showToast]);

  // Hang up and leave the call
  const hangUp = useCallback(() => {
    emit('leave-room');
    stopMedia();
    closeAllPeerConnections();
    navigate('/');
  }, [emit, stopMedia, closeAllPeerConnections, navigate]);

  // Run diagnostics
  const runDiagnostics = useCallback(async () => {
    setDiagnosticData(null);
    setShowDiagnostics(true);
    
    const data = {
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        webrtcSupport: !!window.RTCPeerConnection,
        mediaDevicesSupport: !!navigator.mediaDevices?.getUserMedia
      },
      socket: {
        connected: isConnected,
        socketId: socket?.id || 'Not connected',
        error: socketError || 'None'
      },
      media: {
        localStream: localStream ? {
          id: localStream.id,
          active: localStream.active,
          audioTracks: localStream.getAudioTracks().map(t => ({
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted
          })),
          videoTracks: localStream.getVideoTracks().map(t => ({
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted
          }))
        } : 'No local stream',
        error: mediaError || 'None'
      },
      room: {
        id: roomId,
        participants: participants.length
      },
      peers: {
        connections: Object.keys(connectionStatus).length,
        status: connectionStatus,
        remoteStreams: Object.entries(remoteStreams).map(([id, stream]) => ({
          id,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          active: stream.active
        }))
      }
    };
    
    setDiagnosticData(data);
    
    // Try to fix common issues with remote streams
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = true;
        });
      }
      
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = true;
        });
      }
    });
  }, [socket, isConnected, socketError, localStream, mediaError, roomId, participants, connectionStatus, remoteStreams]);

  // VideoComponent to render video streams with better error handling
  const VideoComponent = React.memo(({ userId, stream, name }) => {
    const videoRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Store ref in map for later access
    useEffect(() => {
      if (userId !== 'local') {
        remoteVideoRefs.current.set(userId, videoRef);
      }
      
      return () => {
        if (userId !== 'local') {
          remoteVideoRefs.current.delete(userId);
        }
      };
    }, [userId]);
    
    // Connect stream to video element
    useEffect(() => {
      if (!stream || !videoRef.current) return;
      
      console.log(`Setting up video for ${userId} with stream:`, stream.id);
      
      try {
        // For remote streams, create a new MediaStream to avoid issues
        if (userId !== 'local') {
          const newStream = new MediaStream();
          
          // Add all tracks from the original stream
          stream.getTracks().forEach(track => {
            console.log(`Adding ${track.kind} track to new stream for ${userId}`);
            newStream.addTrack(track);
            track.enabled = true;
          });
          
          videoRef.current.srcObject = newStream;
          
          // IMPORTANT: Make sure remote videos are NOT muted
          videoRef.current.muted = false;
        } else {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true; // Mute local video to avoid echo
        }
        
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
          console.log(`Video loaded for ${userId}`);
          
          // Ensure playback starts
          videoRef.current.play().catch(e => {
            console.warn(`Error playing video for ${userId}:`, e);
          });
        };
      } catch (err) {
        console.error(`Error attaching stream for ${userId}:`, err);
      }
      
      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }, [stream, userId]);
    
    return (
      <VideoCard>
        {stream ? (
          <>
            <Video
              ref={videoRef}
              autoPlay
              playsInline
              muted={userId === 'local'} // Only mute local video
              mirrored={userId === 'local'}
            />
            {isLoading && (
              <VideoPlaceholder>
                {name?.charAt(0)?.toUpperCase() || '?'}
              </VideoPlaceholder>
            )}
          </>
        ) : (
          <VideoPlaceholder>
            {name?.charAt(0)?.toUpperCase() || '?'}
          </VideoPlaceholder>
        )}
        <UserLabel>{name || 'Unknown'}</UserLabel>
      </VideoCard>
    );
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMountedRef.current) {
        console.log("Component unmounting - final cleanup");
        stopMedia();
        closeAllPeerConnections();
        if (hasJoinedRef.current) {
          emit('leave-room');
        }
      }
    };
  }, [stopMedia, closeAllPeerConnections, emit]);

  // Render diagnostics overlay
  const renderDiagnostics = () => {
    if (!diagnosticData) return <p>Loading diagnostics...</p>;
    
    return (
      <>
        <DiagnosticTitle>WebRTC Diagnostics</DiagnosticTitle>
        
        <DiagnosticSection>
          <h3>Browser</h3>
          <DiagnosticItem className={diagnosticData.browser.webrtcSupport ? "success" : "error"}>
            WebRTC Support: {diagnosticData.browser.webrtcSupport ? "✅ Yes" : "❌ No"}
          </DiagnosticItem>
          <DiagnosticItem className={diagnosticData.browser.mediaDevicesSupport ? "success" : "error"}>
            Media Devices API: {diagnosticData.browser.mediaDevicesSupport ? "✅ Yes" : "❌ No"}
          </DiagnosticItem>
        </DiagnosticSection>
        
        <DiagnosticSection>
          <h3>Socket Connection</h3>
          <DiagnosticItem className={diagnosticData.socket.connected ? "success" : "error"}>
            Connected: {diagnosticData.socket.connected ? "✅ Yes" : "❌ No"}
          </DiagnosticItem>
          <DiagnosticItem className="info">Socket ID: {diagnosticData.socket.socketId}</DiagnosticItem>
        </DiagnosticSection>
        
        <DiagnosticSection>
          <h3>Media Status</h3>
          {typeof diagnosticData.media.localStream === 'string' ? (
            <DiagnosticItem className="error">{diagnosticData.media.localStream}</DiagnosticItem>
          ) : (
            <>
              <DiagnosticItem className="info">Stream ID: {diagnosticData.media.localStream.id}</DiagnosticItem>
              <DiagnosticItem className={diagnosticData.media.localStream.active ? "success" : "error"}>
                Stream Active: {diagnosticData.media.localStream.active ? "✅ Yes" : "❌ No"}
              </DiagnosticItem>
              
              <h4>Audio Tracks ({diagnosticData.media.localStream.audioTracks.length})</h4>
              {diagnosticData.media.localStream.audioTracks.map((track, i) => (
                <div key={`audio-${i}`}>
                  <DiagnosticItem className={track.enabled ? "success" : "error"}>
                    Enabled: {track.enabled ? "✅ Yes" : "❌ No"}
                  </DiagnosticItem>
                </div>
              ))}
              
              <h4>Video Tracks ({diagnosticData.media.localStream.videoTracks.length})</h4>
              {diagnosticData.media.localStream.videoTracks.map((track, i) => (
                <div key={`video-${i}`}>
                  <DiagnosticItem className={track.enabled ? "success" : "error"}>
                    Enabled: {track.enabled ? "✅ Yes" : "❌ No"}
                  </DiagnosticItem>
                </div>
              ))}
            </>
          )}
        </DiagnosticSection>
        
        <DiagnosticSection>
          <h3>Remote Peers</h3>
          <DiagnosticItem className="info">
            Total Connections: {diagnosticData.peers.connections}
          </DiagnosticItem>
          
          <h4>Remote Streams</h4>
          {diagnosticData.peers.remoteStreams.length === 0 ? (
            <DiagnosticItem className="error">❌ No remote streams found</DiagnosticItem>
          ) : (
            diagnosticData.peers.remoteStreams.map((stream, i) => (
              <div key={`stream-${i}`}>
                <DiagnosticItem className={stream.active ? "success" : "error"}>
                  Stream {i+1} Active: {stream.active ? "✅ Yes" : "❌ No"}
                </DiagnosticItem>
                <DiagnosticItem className={stream.audioTracks > 0 ? "success" : "error"}>
                  Audio Tracks: {stream.audioTracks || "❌ None"}
                </DiagnosticItem>
                <DiagnosticItem className={stream.videoTracks > 0 ? "success" : "error"}>
                  Video Tracks: {stream.videoTracks || "❌ None"}
                </DiagnosticItem>
              </div>
            ))
          )}
        </DiagnosticSection>
      </>
    );
  };

  // Show username prompt first
  if (showUsernamePrompt) {
    return (
      <UsernameModal>
        <UsernameForm>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Enter Your Name</h2>
          <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
            Please enter your name to join the video call
          </p>
          <UsernameInput
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
            autoFocus
          />
          <UsernameButton 
            onClick={handleUsernameSubmit}
            disabled={!userName.trim()}
          >
            Join Call
          </UsernameButton>
        </UsernameForm>
      </UsernameModal>
    );
  }

  // Main video call UI
  return (
    <VideoContainer>
      {/* Room info */}
      <RoomInfo>
        <div>Room: {roomId} <button onClick={() => navigator.clipboard.writeText(roomId)}>Copy</button></div>
        <div>Participants: {participants.length + 1}</div>
      </RoomInfo>
      
      {/* Video grid */}
      <VideoGrid>
        {/* Local video */}
        <VideoComponent 
          key="local"
          userId="local" 
          stream={localStream} 
          name={`${userName} (You)`} 
        />
        
        {/* Remote videos */}
        {Object.entries(remoteStreams).map(([userId, stream]) => {
          const participant = participants.find(p => p.id === userId) || { name: "Unknown User" };
          return (
            <VideoComponent 
              key={userId}
              userId={userId} 
              stream={stream} 
              name={participant?.name} 
            />
          );
        })}
      </VideoGrid>
      
      {/* Controls */}
      <Controls>
        <ControlButton 
          className="audio" 
          active={isAudioEnabled}
          onClick={handleToggleAudio}
          title={isAudioEnabled ? "Mute Audio" : "Unmute Audio"}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </ControlButton>
        
        <ControlButton 
          className="video" 
          active={isVideoEnabled}
          onClick={handleToggleVideo}
          title={isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
        >
          {isVideoEnabled ? '📹' : '📷'}
        </ControlButton>
        
        <ControlButton 
          className="hang-up"
          onClick={hangUp}
          title="Leave Call"
        >
          📞
        </ControlButton>
        
        <ControlButton 
          className="screen-share"
          active={isScreenSharing}
          onClick={handleToggleScreenShare}
          title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
        >
          {isScreenSharing ? '📵' : '🖥️'}
        </ControlButton>
      </Controls>
      
      {/* Chat component */}
      <Chat socket={socket} roomId={roomId} userName={userName} />
      
      {/* Error overlay */}
      {connectionError && (
        <ErrorOverlay>
          <ErrorHeading>Connection Error</ErrorHeading>
          <ErrorMessage>{connectionError}</ErrorMessage>
          <RetryButton onClick={() => window.location.reload()}>Try Again</RetryButton>
        </ErrorOverlay>
      )}
      
      {/* Loading indicator */}
      {isConnecting && !connectionError && (
        <ErrorOverlay>
          <ErrorHeading>Connecting...</ErrorHeading>
          <ErrorMessage>Setting up your video call</ErrorMessage>
        </ErrorOverlay>
      )}
      
      {/* Toast notification */}
      {toast && (
        <Toast type={toast.type}>{toast.message}</Toast>
      )}
      
      {/* Diagnostic button */}
      <DiagnosticButton onClick={runDiagnostics} title="Diagnostics">
        🔧
      </DiagnosticButton>
      
      {/* Diagnostic overlay */}
      {showDiagnostics && (
        <DiagnosticOverlay>
          {renderDiagnostics()}
          <DiagnosticClose onClick={() => setShowDiagnostics(false)}>Close</DiagnosticClose>
        </DiagnosticOverlay>
      )}
    </VideoContainer>
  );
};

export default VideoCall;