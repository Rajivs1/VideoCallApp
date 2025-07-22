



import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { usePeerConnection } from '../hooks/usePeerConnection';
import { useSocket } from '../hooks/useSocket';

// Styled Components
const AudioContainer = styled.div`
  height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  display: flex;
  flex-direction: column;
  position: relative;
`;

const ParticipantsGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  padding: 2rem;
  align-items: center;
  justify-items: center;
`;

const ParticipantCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 180px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
`;

const Avatar = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  margin-bottom: 1rem;
  position: relative;
  color: white;
  font-weight: bold;
  
  ${props => props.isSpeaking && `
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
  `}
  
  @keyframes pulse {
    0% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
    50% { box-shadow: 0 0 50px rgba(102, 126, 234, 0.8); }
    100% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
  }
`;

const ParticipantName = styled.div`
  color: white;
  font-weight: 600;
  font-size: 1.1rem;
  text-align: center;
  margin-bottom: 0.5rem;
`;

const ParticipantStatus = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
`;

const ControlButton = styled.button`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &.audio {
    background: ${props => props.active ? '#28a745' : '#dc3545'};
    color: white;
  }
  
  &.hang-up {
    background: #dc3545;
    color: white;
    width: 80px;
    height: 80px;
    font-size: 2rem;
  }
  
  &.settings {
    background: #6c757d;
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
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  z-index: 100;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CopyButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: #0056b3;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const CenterInfo = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 10;
  pointer-events: none;
`;

const RoomTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  opacity: 0.9;
`;

const RoomSubtitle = styled.p`
  font-size: 1.2rem;
  opacity: 0.7;
`;

const Toast = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${props => props.type === 'error' ? '#dc3545' : '#28a745'};
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  z-index: 1000;
  animation: slideIn 0.3s ease;
  
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Hidden audio elements for remote streams
const RemoteAudio = styled.audio`
  display: none;
`;

// Main AudioCall Component
const AudioCall = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State
  const [participants, setParticipants] = useState([]);
  const [userName] = useState(location.state?.userName || `User${Math.floor(Math.random() * 1000)}`);
  const [speakingParticipants, setSpeakingParticipants] = useState(new Set());
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [toast, setToast] = useState(null);
  const [roomJoined, setRoomJoined] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteAudioElements, setRemoteAudioElements] = useState(new Map());
  
  // Refs
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const speakingTimeoutRef = useRef(new Map());
  const audioAnalysersRef = useRef(new Map());
  const speakingIntervalRef = useRef(null);
  
  // Hooks
  const {
    remoteStreams,
    connectionStatus,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    closePeerConnection,
    closeAllPeerConnections
  } = usePeerConnection();
  
  const {
    socket,
    isConnected,
    connectionError: socketError,
    emit,
    on,
    off
  } = useSocket();

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      showToast('Room code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy room code:', err);
      showToast('Failed to copy room code', 'error');
    }
  };

  // Get user media with retry mechanism
  const getUserMedia = useCallback(async () => {
    try {
      // First try to get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        },
        video: false
      });
      
      console.log('Got user media stream:', stream);
      localStreamRef.current = stream;
      
      // Setup audio analyser for local stream
      setTimeout(() => {
        setupAudioAnalyser(stream, 'self');
      }, 100);
      
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to access microphone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application. Please close other applications and try again.';
      }
      
      throw new Error(errorMessage);
    }
  }, []);

  // Setup audio analyser with improved error handling
  const setupAudioAnalyser = useCallback((stream, userId) => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create audio context:', error);
        return;
      }
    }
    
    if (!stream) {
      console.warn('No stream provided for audio analyser setup');
      return;
    }
    
    try {
      // Clean up existing analyser
      if (audioAnalysersRef.current.has(userId)) {
        const { source } = audioAnalysersRef.current.get(userId);
        source?.disconnect();
      }
      
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn('No audio tracks found in stream');
        return;
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioAnalysersRef.current.set(userId, { source, analyser, dataArray });
      
      console.log(`Audio analyser setup for user: ${userId}`);
    } catch (error) {
      console.error('Error setting up audio analyser:', error);
    }
  }, []);

  // Improved speaking detection
  const detectSpeaking = useCallback(() => {
    if (!audioAnalysersRef.current.size) return;
    
    audioAnalysersRef.current.forEach(({ analyser, dataArray }, userId) => {
      if (!analyser || !dataArray) return;
      
      try {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS for better voice detection
        const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length);
        const threshold = 25; // Adjusted threshold
        
        if (rms > threshold) {
          setSpeakingParticipants(prev => {
            const updated = new Set(prev);
            updated.add(userId);
            return updated;
          });
          
          // Clear existing timeout
          if (speakingTimeoutRef.current.has(userId)) {
            clearTimeout(speakingTimeoutRef.current.get(userId));
          }
          
          // Set new timeout
          const timeoutId = setTimeout(() => {
            setSpeakingParticipants(prev => {
              const updated = new Set(prev);
              updated.delete(userId);
              return updated;
            });
            speakingTimeoutRef.current.delete(userId);
          }, 1000);
          
          speakingTimeoutRef.current.set(userId, timeoutId);
        }
      } catch (error) {
        console.error('Error in speaking detection:', error);
      }
    });
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
      
      if (isAudioEnabled) {
        showToast('Microphone muted');
      } else {
        showToast('Microphone unmuted');
      }
    }
  }, [isAudioEnabled, showToast]);

  // Handle hang up
  const handleHangUp = useCallback(() => {
    console.log('Hanging up call...');
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped local track:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    // Close all peer connections
    closeAllPeerConnections();
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Clear speaking detection interval
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    
    // Leave room
    if (socket && isConnected) {
      emit('leave-room', { roomId, userId: socket.id });
    }
    
    // Clean up timeouts
    speakingTimeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    speakingTimeoutRef.current.clear();
    
    // Clean up audio elements
    remoteAudioElements.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    setRemoteAudioElements(new Map());
    
    navigate('/');
  }, [roomId, navigate, closeAllPeerConnections, socket, isConnected, emit, remoteAudioElements]);

  // Handle socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleRoomJoined = (data) => {
      console.log('Room joined successfully:', data);
      setParticipants(data.users || []);
      setRoomJoined(true);
      setIsConnecting(false);
      showToast('Successfully joined the call');
    };

    const handleUserJoined = async (data) => {
      const { userId, userName: newUserName } = data;
      console.log(`User joined: ${newUserName} (${userId})`);
      
      setParticipants(prev => {
        const exists = prev.find(p => p.id === userId);
        if (!exists) {
          return [...prev, { id: userId, name: newUserName }];
        }
        return prev;
      });
      
      showToast(`${newUserName} joined the call`);
      
      // Wait a bit before creating peer connection
      setTimeout(async () => {
        if (localStreamRef.current) {
          try {
            await createPeerConnection(userId, localStreamRef.current, (candidate) => {
              console.log('Sending ICE candidate to:', userId);
              emit('ice-candidate', { candidate, targetUserId: userId });
            });
            
            const offer = await createOffer(userId);
            if (offer) {
              console.log('Sending offer to:', userId);
              emit('offer', { offer, targetUserId: userId });
            }
          } catch (error) {
            console.error('Error creating peer connection:', error);
          }
        }
      }, 500);
    };

    const handleUserLeft = (data) => {
      const { userId, userName: leftUserName } = data;
      console.log(`User left: ${leftUserName} (${userId})`);
      
      setParticipants(prev => prev.filter(p => p.id !== userId));
      showToast(`${leftUserName} left the call`);
      
      // Clean up peer connection
      closePeerConnection(userId);
      
      // Clean up audio analyser
      if (audioAnalysersRef.current.has(userId)) {
        const { source } = audioAnalysersRef.current.get(userId);
        source?.disconnect();
        audioAnalysersRef.current.delete(userId);
      }
      
      // Clean up audio element
      if (remoteAudioElements.has(userId)) {
        const audio = remoteAudioElements.get(userId);
        audio.pause();
        audio.srcObject = null;
        setRemoteAudioElements(prev => {
          const updated = new Map(prev);
          updated.delete(userId);
          return updated;
        });
      }
      
      // Remove from speaking participants
      setSpeakingParticipants(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    };

    const handleOfferReceived = async (data) => {
      const { offer, fromUserId, userName: offerUserName } = data;
      console.log(`Received offer from: ${offerUserName} (${fromUserId})`);
      
      if (!localStreamRef.current) {
        console.error('No local stream available');
        return;
      }
      
      try {
        // Create peer connection if it doesn't exist
        if (!connectionStatus[fromUserId]) {
          await createPeerConnection(fromUserId, localStreamRef.current, (candidate) => {
            console.log('Sending ICE candidate to:', fromUserId);
            emit('ice-candidate', { candidate, targetUserId: fromUserId });
          });
        }
        
        const answer = await handleOffer(fromUserId, offer);
        if (answer) {
          console.log('Sending answer to:', fromUserId);
          emit('answer', { answer, targetUserId: fromUserId });
        }
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    };

    const handleAnswerReceived = async (data) => {
      const { answer, fromUserId } = data;
      console.log(`Received answer from: ${fromUserId}`);
      
      try {
        await handleAnswer(fromUserId, answer);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    };

    const handleIceCandidateReceived = async (data) => {
      const { candidate, fromUserId } = data;
      console.log(`Received ICE candidate from: ${fromUserId}`);
      
      try {
        await addIceCandidate(fromUserId, candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    };

    const handleError = (error) => {
      console.error('Socket error:', error);
      setConnectionError(error.message || 'Connection error occurred');
      showToast(error.message || 'Connection error occurred', 'error');
    };

    // Setup event listeners
    on('room-joined', handleRoomJoined);
    on('user-joined', handleUserJoined);
    on('user-left', handleUserLeft);
    on('offer', handleOfferReceived);
    on('answer', handleAnswerReceived);
    on('ice-candidate', handleIceCandidateReceived);
    on('error', handleError);

    return () => {
      // Clean up listeners
      off('room-joined', handleRoomJoined);
      off('user-joined', handleUserJoined);
      off('user-left', handleUserLeft);
      off('offer', handleOfferReceived);
      off('answer', handleAnswerReceived);
      off('ice-candidate', handleIceCandidateReceived);
      off('error', handleError);
    };
  }, [
    socket, 
    isConnected,
    emit, 
    on, 
    off, 
    showToast, 
    createPeerConnection, 
    createOffer, 
    handleOffer, 
    handleAnswer, 
    addIceCandidate,
    closePeerConnection,
    connectionStatus,
    remoteAudioElements
  ]);

  // Initialize call
  useEffect(() => {
    let mounted = true;
    
    const initializeCall = async () => {
      try {
        setIsConnecting(true);
        setConnectionError(null);
        
        console.log('Initializing call for room:', roomId);
        
        // Get user media first
        const stream = await getUserMedia();
        
        if (!mounted) return;
        
        // Wait for socket connection
        if (!socket || !isConnected) {
          console.log('Waiting for socket connection...');
          return;
        }
        
        // Join room
        console.log('Joining room:', roomId);
        emit('join-room', {
          roomId,
          userName,
          roomType: 'audio'
        });
        
        // Start speaking detection
        speakingIntervalRef.current = setInterval(detectSpeaking, 100);
        
      } catch (error) {
        console.error('Error initializing call:', error);
        if (mounted) {
          setConnectionError(error.message);
          setIsConnecting(false);
          showToast(error.message, 'error');
        }
      }
    };
    
    if (socket && isConnected) {
      initializeCall();
    }
    
    return () => {
      mounted = false;
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
        speakingIntervalRef.current = null;
      }
    };
  }, [roomId, userName, getUserMedia, detectSpeaking, socket, isConnected, emit, showToast]);

  // Handle socket connection status
  useEffect(() => {
    if (socketError) {
      console.error('Socket connection error:', socketError);
      setConnectionError(`Connection failed: ${socketError}`);
      showToast(`Connection failed: ${socketError}`, 'error');
    }
  }, [socketError, showToast]);

  // Setup remote audio elements and analysers
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (stream) {
        // Create audio element if it doesn't exist
        if (!remoteAudioElements.has(userId)) {
          const audio = new Audio();
          audio.autoplay = true;
          audio.srcObject = stream;
          
          // Handle audio play promise
          audio.play().catch(error => {
            console.error('Error playing remote audio:', error);
          });
          
          setRemoteAudioElements(prev => {
            const updated = new Map(prev);
            updated.set(userId, audio);
            return updated;
          });
        }
        
        // Setup audio analyser
        if (!audioAnalysersRef.current.has(userId)) {
          setTimeout(() => {
            setupAudioAnalyser(stream, userId);
          }, 100);
        }
      }
    });
  }, [remoteStreams, setupAudioAnalyser, remoteAudioElements]);

  // Render participants
  const renderParticipants = () => {
    const allParticipants = [
      { id: 'self', name: `${userName} (You)` },
      ...participants
    ];

    return allParticipants.map(participant => {
      const isSpeaking = speakingParticipants.has(participant.id);
      const status = connectionStatus[participant.id] || (participant.id === 'self' ? 'connected' : 'disconnected');
      
      let statusText = '🔇 Quiet';
      if (isSpeaking) statusText = '🎤 Speaking';
      if (status === 'connecting') statusText = '🔌 Connecting...';
      if (status === 'connected' && !isSpeaking) statusText = '✅ Connected';
      if (status === 'failed') statusText = '❌ Connection failed';
      
      return (
        <ParticipantCard key={participant.id}>
          <Avatar isSpeaking={isSpeaking}>
            {participant.name.charAt(0).toUpperCase()}
          </Avatar>
          <ParticipantName>{participant.name}</ParticipantName>
          <ParticipantStatus>
            {statusText}
          </ParticipantStatus>
        </ParticipantCard>
      );
    });
  };

  return (
    <AudioContainer>
      {/* Toast notifications */}
      {toast && (
        <Toast type={toast.type}>
          {toast.message}
        </Toast>
      )}
      
      {/* Hidden audio elements for remote streams */}
      {Array.from(remoteAudioElements.entries()).map(([userId, audio]) => (
        <RemoteAudio key={userId} ref={el => { if (el) el.srcObject = audio.srcObject; }} />
      ))}
      
      {/* Room info with copy button */}
      <RoomInfo>
        <div>Room: {roomId}</div>
        <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
        <div>Participants: {participants.length + 1}</div>
        <CopyButton onClick={copyRoomCode}>
          📋 Copy Room Code
        </CopyButton>
      </RoomInfo>
      
      {/* Center loading/error info */}
      {isConnecting && (
        <CenterInfo>
          <LoadingSpinner />
          <RoomTitle>Connecting...</RoomTitle>
          <RoomSubtitle>Please wait while we connect you to the call</RoomSubtitle>
        </CenterInfo>
      )}
      
      {connectionError && (
        <CenterInfo>
          <RoomTitle>Connection Error</RoomTitle>
          <RoomSubtitle>{connectionError}</RoomSubtitle>
        </CenterInfo>
      )}
      
      {/* Participants grid */}
      {!isConnecting && !connectionError && (
        <ParticipantsGrid>
          {renderParticipants()}
        </ParticipantsGrid>
      )}
      
      {/* Controls */}
      <Controls>
        <ControlButton 
          className="audio" 
          active={isAudioEnabled}
          onClick={toggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </ControlButton>
        
        <ControlButton 
          className="hang-up"
          onClick={handleHangUp}
          title="End call"
        >
          📞
        </ControlButton>
        
        <ControlButton 
          className="settings"
          onClick={() => showToast('Settings not implemented yet')}
          title="Settings"
        >
          ⚙️
        </ControlButton>
      </Controls>
    </AudioContainer>
  );
};

export default AudioCall;