         import { useState, useRef, useCallback, useEffect } from 'react';

// Enhanced ICE servers configuration with more reliable servers
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // More reliable TURN servers
  {
    urls: 'turn:numb.viagenie.ca',
    credential: 'muazkh',
    username: 'webrtc@live.com'
  },
  {
    urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
    credential: 'webrtc',
    username: 'webrtc'
  },
  // Additional TURN servers for better reliability
  {
    urls: 'turn:openrelay.metered.ca:80',
    credential: 'openrelayproject',
    username: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    credential: 'openrelayproject',
    username: 'openrelayproject'
  }
];

// Connection timeout constants
const CONNECTION_TIMEOUT = 30000; // 30 seconds
const ICE_GATHERING_TIMEOUT = 10000; // 10 seconds

export const usePeerConnection = () => {
  const [remotePeers, setRemotePeers] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [connectionStatus, setConnectionStatus] = useState({});
  const [connectionError, setConnectionError] = useState(null);

  const peerConnectionsRef = useRef({});
  const iceCandidatesQueueRef = useRef({});
  const remoteStreamsRef = useRef({});
  const connectionTimeoutsRef = useRef({});

  // Check browser WebRTC support
  const checkWebRTCSupport = useCallback(() => {
    if (!window.RTCPeerConnection) {
      const error = 'WebRTC is not supported in this browser';
      console.error(error);
      setConnectionError(error);
      return false;
    }
    return true;
  }, []);

  // Process queued ICE candidates
  const processIceCandidateQueue = useCallback(async (peerId) => {
    const pc = peerConnectionsRef.current[peerId];
    const queue = iceCandidatesQueueRef.current[peerId] || [];
    
    if (pc && pc.remoteDescription && queue.length > 0) {
      console.log(`Processing ${queue.length} queued ICE candidates for ${peerId}`);
      
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`Added queued ICE candidate for ${peerId}`);
        } catch (error) {
          console.warn(`Failed to add ICE candidate for ${peerId}:`, error);
        }
      }
      
      iceCandidatesQueueRef.current[peerId] = [];
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(async (peerId, localStream, onIceCandidate) => {
    if (!checkWebRTCSupport()) return null;

    try {
      console.log(`Creating peer connection for: ${peerId}`);
      
      const configuration = {
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        sdpSemantics: 'unified-plan'
      };

      // Close any existing connection
      if (peerConnectionsRef.current[peerId]) {
        console.log(`Closing existing peer connection for: ${peerId}`);
        peerConnectionsRef.current[peerId].close();
      }

      const pc = new RTCPeerConnection(configuration);
      peerConnectionsRef.current[peerId] = pc;
      
      // Initialize queues
      if (!iceCandidatesQueueRef.current[peerId]) {
        iceCandidatesQueueRef.current[peerId] = [];
      }
      
      setConnectionStatus(prev => ({ ...prev, [peerId]: 'connecting' }));
      
      // Set connection timeout
      connectionTimeoutsRef.current[peerId] = setTimeout(() => {
        if (pc.connectionState === 'connecting' || pc.connectionState === 'new') {
          console.warn(`Connection timeout for ${peerId}`);
          setConnectionError(`Connection timeout for ${peerId}`);
          closePeerConnection(peerId);
        }
      }, CONNECTION_TIMEOUT);

      // Add local tracks
      if (localStream) {
        for (const track of localStream.getTracks()) {
          try {
            console.log(`Adding local ${track.kind} track to ${peerId}`);
            pc.addTrack(track, localStream);
          } catch (err) {
            console.error(`Error adding ${track.kind} track:`, err);
          }
        }
      }

      // ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`ICE candidate for ${peerId}:`, event.candidate.type);
          onIceCandidate?.(event.candidate);
        }
      };

      // ICE gathering state handler
      pc.onicegatheringstatechange = () => {
        console.log(`ICE gathering state (${peerId}): ${pc.iceGatheringState}`);
      };
      
      // ICE connection state handler
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log(`ICE state (${peerId}): ${state}`);
        
        setConnectionStatus(prev => ({ ...prev, [peerId]: state }));
        
        if (state === 'connected' || state === 'completed') {
          // Clear connection timeout
          if (connectionTimeoutsRef.current[peerId]) {
            clearTimeout(connectionTimeoutsRef.current[peerId]);
            delete connectionTimeoutsRef.current[peerId];
          }
        } else if (state === 'failed') {
          console.warn(`ICE failed for ${peerId}, attempting restart...`);
          
          // Try to restart ICE
          setTimeout(() => {
            if (pc.signalingState === 'stable') {
              pc.restartIce();
            }
          }, 1000);
        }
      };

      // Connection state handler
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`Connection state (${peerId}): ${state}`);
        
        if (state === 'failed') {
          setConnectionError(`Connection failed for ${peerId}`);
        }
      };

      // CRITICAL: Track event handler for receiving remote streams
      pc.ontrack = (event) => {
        console.log(`Received ${event.track.kind} track from ${peerId}`);
        
        const [remoteStream] = event.streams;
        if (!remoteStream) {
          console.warn(`No remote stream found in track event from ${peerId}`);
          return;
        }
        
        console.log(`Stream ID: ${remoteStream.id}, Audio tracks: ${remoteStream.getAudioTracks().length}, Video tracks: ${remoteStream.getVideoTracks().length}`);
        
        // Store the remote stream
        remoteStreamsRef.current[peerId] = remoteStream;
        
        // Update the state
        setRemoteStreams(prev => {
          // IMPORTANT: Create a new object to trigger a state update
          return { ...prev, [peerId]: remoteStream };
        });
        
        // Ensure track is enabled
        event.track.onended = () => {
          console.log(`Track ended: ${event.track.kind} from ${peerId}`);
        };
        
        event.track.onunmute = () => {
          console.log(`Track unmuted: ${event.track.kind} from ${peerId}`);
          event.track.enabled = true;
        };
      };

      return pc;
    } catch (error) {
      console.error(`Peer connection creation failed (${peerId}):`, error);
      setConnectionError(`Connection failed: ${error.message}`);
      return null;
    }
  }, [checkWebRTCSupport]);

  // Create offer
  const createOffer = useCallback(async (peerId) => {
    const pc = peerConnectionsRef.current[peerId];
    if (!pc) return null;

    try {
      console.log(`Creating offer for ${peerId}`);
      
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: false
      };

      const offer = await pc.createOffer(offerOptions);
      
      // IMPORTANT: Set local description
      await pc.setLocalDescription(offer);
      console.log(`Local description set for ${peerId}`);
      
      // Set ICE gathering timeout
      connectionTimeoutsRef.current[`${peerId}_ice`] = setTimeout(() => {
        if (pc.iceGatheringState !== 'complete') {
          console.warn(`ICE gathering timeout for ${peerId}`);
          
          // Use the current SDP even if gathering isn't complete
          const currentDescription = pc.localDescription;
          console.log(`Using current description for ${peerId}`);
          return currentDescription;
        }
      }, ICE_GATHERING_TIMEOUT);
      
      setRemotePeers(prev => ({ 
        ...prev, 
        [peerId]: { type: 'offer', connected: false } 
      }));
      
      return pc.localDescription;
    } catch (error) {
      console.error(`Offer creation failed (${peerId}):`, error);
      setConnectionError(`Offer failed: ${error.message}`);
      return null;
    }
  }, []);

  // Handle offer
  const handleOffer = useCallback(async (peerId, offer, localStream, onIceCandidate) => {
    try {
      let pc = peerConnectionsRef.current[peerId];
      if (!pc) {
        pc = await createPeerConnection(peerId, localStream, onIceCandidate);
        if (!pc) return null;
      }
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`Remote description set for ${peerId}`);
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`Local description (answer) set for ${peerId}`);
      
      // Process queued ICE candidates
      await processIceCandidateQueue(peerId);
      
      setRemotePeers(prev => ({
        ...prev,
        [peerId]: { type: 'answer', connected: true }
      }));
      
      return pc.localDescription;
    } catch (error) {
      console.error(`Offer handling failed (${peerId}):`, error);
      setConnectionError(`Offer processing failed: ${error.message}`);
      return null;
    }
  }, [createPeerConnection, processIceCandidateQueue]);

  // Handle answer
  const handleAnswer = useCallback(async (peerId, answer) => {
    const pc = peerConnectionsRef.current[peerId];
    if (!pc) return false;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`Remote description (answer) set for ${peerId}`);
      
      // Process queued ICE candidates
      await processIceCandidateQueue(peerId);
      
      setRemotePeers(prev => ({
        ...prev,
        [peerId]: { ...prev[peerId], connected: true }
      }));
      
      return true;
    } catch (error) {
      console.error(`Answer handling failed (${peerId}):`, error);
      return false;
    }
  }, [processIceCandidateQueue]);

  // Add ICE candidate
  const addIceCandidate = useCallback(async (peerId, candidate) => {
    const pc = peerConnectionsRef.current[peerId];
    
    // Queue the candidate if no connection or remote description
    if (!pc || !pc.remoteDescription) {
      if (!iceCandidatesQueueRef.current[peerId]) {
        iceCandidatesQueueRef.current[peerId] = [];
      }
      
      iceCandidatesQueueRef.current[peerId].push(candidate);
      console.log(`Queued ICE candidate for ${peerId}`);
      return false;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`Added ICE candidate for ${peerId}`);
      return true;
    } catch (error) {
      console.error(`ICE candidate error (${peerId}):`, error);
      return false;
    }
  }, []);

  // Update stream (e.g., for screen sharing)
  const updateStream = useCallback(async (peerId, newStream) => {
    const pc = peerConnectionsRef.current[peerId];
    if (!pc) return false;

    try {
      const senders = pc.getSenders();
      
      // Replace tracks
      for (const track of newStream.getTracks()) {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          console.log(`Replacing ${track.kind} track for ${peerId}`);
          await sender.replaceTrack(track);
        } else {
          console.log(`Adding new ${track.kind} track for ${peerId}`);
          pc.addTrack(track, newStream);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Stream update failed (${peerId}):`, error);
      return false;
    }
  }, []);

  // Close peer connection
  const closePeerConnection = useCallback((peerId) => {
    const pc = peerConnectionsRef.current[peerId];
    if (!pc) return false;

    console.log(`Closing peer connection for ${peerId}`);
    
    // Clear timeouts
    if (connectionTimeoutsRef.current[peerId]) {
      clearTimeout(connectionTimeoutsRef.current[peerId]);
      delete connectionTimeoutsRef.current[peerId];
    }
    
    if (connectionTimeoutsRef.current[`${peerId}_ice`]) {
      clearTimeout(connectionTimeoutsRef.current[`${peerId}_ice`]);
      delete connectionTimeoutsRef.current[`${peerId}_ice`];
    }
    
    // Close connection
    pc.close();
    
    // Clean up references
    delete peerConnectionsRef.current[peerId];
    delete iceCandidatesQueueRef.current[peerId];
    delete remoteStreamsRef.current[peerId];
    
    // Update state
    setRemotePeers(prev => {
      const newPeers = { ...prev };
      delete newPeers[peerId];
      return newPeers;
    });
    
    setRemoteStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[peerId];
      return newStreams;
    });
    
    setConnectionStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[peerId];
      return newStatus;
    });
    
    return true;
  }, []);

  // Close all connections
  const closeAllPeerConnections = useCallback(() => {
    Object.keys(peerConnectionsRef.current).forEach(closePeerConnection);
    setRemotePeers({});
    setRemoteStreams({});
    setConnectionStatus({});
  }, [closePeerConnection]);

  // Check if connection exists
  const hasPeerConnection = useCallback((peerId) => {
    return !!peerConnectionsRef.current[peerId];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeAllPeerConnections();
      Object.values(connectionTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [closeAllPeerConnections]);

  return {
    remotePeers,
    remoteStreams,
    connectionStatus,
    connectionError,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    closePeerConnection,
    closeAllPeerConnections,
    updateStream,
    hasPeerConnection
  };
};