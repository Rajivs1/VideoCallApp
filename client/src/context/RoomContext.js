import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

const RoomContext = createContext();

export const useRoomContext = () => useContext(RoomContext);

export const RoomProvider = ({ children }) => {
  const { socket, isConnected, emit, on, off } = useSocket();
  const [activeRooms, setActiveRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [roomError, setRoomError] = useState(null);

  // Fetch active rooms
  useEffect(() => {
    if (socket && isConnected) {
      emit('get-active-rooms');

      on('active-rooms', (rooms) => {
        setActiveRooms(rooms);
      });

      // Room update events
      on('room-created', (room) => {
        setActiveRooms(prev => [...prev, room].sort((a, b) => b.userCount - a.userCount));
      });

      on('room-updated', (updatedRoom) => {
        setActiveRooms(prev => {
          const filtered = prev.filter(room => room.id !== updatedRoom.id);
          return [...filtered, updatedRoom].sort((a, b) => b.userCount - a.userCount);
        });

        // Update current room if it's the one that was updated
        if (currentRoom && currentRoom.id === updatedRoom.id) {
          setCurrentRoom(updatedRoom);
        }
      });

      on('room-deleted', (roomId) => {
        setActiveRooms(prev => prev.filter(room => room.id !== roomId));
      });

      // Error handling
      on('room-error', (error) => {
        console.error('Room error:', error);
        setRoomError(error.message || 'An error occurred with the room');
      });

      return () => {
        off('active-rooms');
        off('room-created');
        off('room-updated');
        off('room-deleted');
        off('room-error');
      };
    }
  }, [socket, isConnected, emit, on, off, currentRoom]);

  // Join a room
  const joinRoom = async (roomId, userName, roomType = 'video') => {
    if (!socket || !isConnected) {
      setRoomError('Not connected to server');
      return false;
    }

    setRoomError(null);

    try {
      // Leave current room if any
      if (currentRoom) {
        leaveRoom();
      }

      emit('join-room', { roomId, userName, roomType });
      setCurrentRoom({ id: roomId, type: roomType });
      saveRecentRoom(roomId, userName, roomType);
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      setRoomError(error.message || 'Failed to join room');
      return false;
    }
  };

  // Create a new room
  const createRoom = (roomType = 'video') => {
    if (!socket || !isConnected) {
      setRoomError('Not connected to server');
      return null;
    }

    // Generate random room ID
    const roomId = Math.random().toString(36).substring(2, 15);
    return roomId;
  };

  // Leave current room
  const leaveRoom = () => {
    if (socket && isConnected && currentRoom) {
      emit('leave-room');
      setCurrentRoom(null);
      setParticipants([]);
      setRoomError(null);
    }
  };

  // Save recent room to localStorage
  const saveRecentRoom = (roomId, userName, roomType) => {
    try {
      const recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]');
      
      const newRoom = {
        id: roomId,
        userName,
        roomType,
        timestamp: Date.now()
      };
      
      // Remove if already exists and add to beginning
      const filtered = recentRooms.filter(room => room.id !== roomId);
      filtered.unshift(newRoom);
      
      // Keep only last 5 rooms
      const updated = filtered.slice(0, 5);
      localStorage.setItem('recentRooms', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent room:', error);
    }
  };

  // Get recent rooms from localStorage
  const getRecentRooms = () => {
    try {
      return JSON.parse(localStorage.getItem('recentRooms') || '[]');
    } catch (error) {
      console.error('Error getting recent rooms:', error);
      return [];
    }
  };

  const contextValue = {
    socket,
    isConnected,
    activeRooms,
    currentRoom,
    participants,
    roomError,
    joinRoom,
    createRoom,
    leaveRoom,
    saveRecentRoom,
    getRecentRooms,
    setParticipants,
    setCurrentRoom
  };

  return (
    <RoomContext.Provider value={contextValue}>
      {children}
    </RoomContext.Provider>
  );
}; 