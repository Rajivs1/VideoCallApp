import { useState, useEffect, useRef, useCallback } from 'react';

export const useMedia = (isVideoCall = true) => {
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasPermissions, setHasPermissions] = useState({
    audio: false,
    video: false
  });
  const [devices, setDevices] = useState({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: []
  });

  const localVideoRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Check if browser supports getUserMedia
  const checkMediaSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const error = 'Your browser does not support media devices access. Please try a different browser like Chrome, Firefox or Edge.';
      console.error(error);
      setMediaError(error);
      return false;
    }
    return true;
  }, []);

  // Get available media devices
  const getDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceList.filter(device => device.kind === 'audioinput');
      const videoInputs = deviceList.filter(device => device.kind === 'videoinput');
      const audioOutputs = deviceList.filter(device => device.kind === 'audiooutput');
      
      setDevices({ audioInputs, videoInputs, audioOutputs });
      
      console.log('Available devices:', {
        audioInputs: audioInputs.length,
        videoInputs: videoInputs.length,
        audioOutputs: audioOutputs.length
      });
      
      // If no devices found, show appropriate error
      if (isVideoCall && videoInputs.length === 0) {
        setMediaError('No camera detected. Please connect a camera and try again.');
      } else if (audioInputs.length === 0) {
        setMediaError('No microphone detected. Please connect a microphone and try again.');
      }
    } catch (error) {
      console.error('Error getting devices:', error);
      setMediaError('Failed to get media devices. Please check your browser permissions.');
    }
  }, [isVideoCall]);

  // Get user media stream
  const getUserMedia = useCallback(async (videoEnabled = isVideoCall, audioEnabled = true) => {
    if (!checkMediaSupport()) {
      throw new Error('Media devices not supported');
    }
    
    setMediaError(null);
    setIsInitializing(true);

    // Stop any existing tracks first
    if (localStream) {
      console.log('Stopping existing tracks before requesting new ones');
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }

    try {
      console.log(`Requesting media access: video=${videoEnabled}, audio=${audioEnabled}`);
      
      // Configure audio constraints for better quality
      const audioConstraints = audioEnabled ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : false;
      
      // Configure video constraints with reasonable defaults
      const videoConstraints = videoEnabled ? {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
        facingMode: "user"
      } : false;
      
      // Get both audio and video in one call
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints
      });
      
      console.log('Media access granted:', stream);
      
      // Check what tracks we actually got
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      console.log(`Got ${audioTracks.length} audio tracks and ${videoTracks.length} video tracks`);
      
      // Update state with the stream and track states
      setLocalStream(stream);
      setIsAudioEnabled(audioEnabled && audioTracks.length > 0);
      setIsVideoEnabled(videoEnabled && videoTracks.length > 0);
      
      // Attach to video element if it exists
      if (localVideoRef.current && videoTracks.length > 0) {
        localVideoRef.current.srcObject = stream;
        console.log('Attached stream to video element');
      }
      
      // Update permissions state
      setHasPermissions({
        audio: audioTracks.length > 0,
        video: videoTracks.length > 0
      });
      
      // Get full list of devices now that we have permissions
      await getDevices();
      
      setIsInitializing(false);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setIsInitializing(false);
      
      let errorMessage = 'Failed to access media devices';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions in your browser settings and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = videoEnabled 
          ? 'Camera and/or microphone not found. Please check your connections.' 
          : 'Microphone not found. Please check your connection.';
      } else if (error.name === 'NotReadableError' || error.name === 'AbortError') {
        errorMessage = 'Camera or microphone is being used by another application. Please close other applications using your camera/microphone and try again.';
      }
      
      setMediaError(errorMessage);
      throw error;
    }
  }, [checkMediaSupport, getDevices, isVideoCall, localStream]);

  // Toggle audio track
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`Audio ${track.enabled ? 'enabled' : 'disabled'}`);
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  }, [localStream, isAudioEnabled]);

  // Toggle video track
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`Video ${track.enabled ? 'enabled' : 'disabled'}`);
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localStream, isVideoEnabled]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      console.log('Requesting screen sharing');
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: true
      });

      console.log('Screen sharing access granted');
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      // Listen for screen share end
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen sharing ended by user');
        stopScreenShare();
      });

      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      
      let errorMessage = 'Failed to start screen sharing';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Screen sharing was denied. Please allow screen sharing to continue.';
      }
      
      setMediaError(errorMessage);
      throw error;
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      console.log('Stopping screen sharing');
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
  }, []);

  // Stop all media tracks
  const stopMedia = useCallback(() => {
    if (localStream) {
      console.log('Stopping all media tracks');
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
    }
    
    if (screenStreamRef.current) {
      console.log('Stopping screen sharing');
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
  }, [localStream]);

  // Initialize media on mount
  useEffect(() => {
    checkMediaSupport();
    getDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
      stopMedia();
    };
  }, [checkMediaSupport, getDevices, stopMedia]);

  // Attempt to retry getUserMedia if failed
  const retryGetUserMedia = useCallback(async (videoEnabled = isVideoCall, audioEnabled = true) => {
    setMediaError(null);
    return getUserMedia(videoEnabled, audioEnabled);
  }, [getUserMedia, isVideoCall]);

  return {
    localStream,
    localVideoRef,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isInitializing,
    mediaError,
    hasPermissions,
    devices,
    getUserMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    stopMedia,
    retryGetUserMedia
  };
}; 