import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const JoinContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
`;

const JoinCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 3rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 500px;
  width: 100%;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: white;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
  font-size: 1.1rem;
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  color: white;
  margin-bottom: 0.5rem;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  backdrop-filter: blur(10px);
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  flex: 1;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 8px;
  
  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.2);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RecentRooms = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
`;

const RecentRoomItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const JoinRoom = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [callType, setCallType] = useState('video');

  // Get recent rooms from localStorage
  const getRecentRooms = () => {
    const recent = localStorage.getItem('recentRooms');
    return recent ? JSON.parse(recent) : [];
  };

  const saveToRecentRooms = (roomId, userName) => {
    const recent = getRecentRooms();
    const newRoom = {
      id: roomId,
      userName,
      timestamp: Date.now()
    };
    
    // Remove if already exists and add to beginning
    const filtered = recent.filter(room => room.id !== roomId);
    filtered.unshift(newRoom);
    
    // Keep only last 5 rooms
    const updated = filtered.slice(0, 5);
    localStorage.setItem('recentRooms', JSON.stringify(updated));
  };

  const joinRoom = () => {
    if (roomId.trim() && userName.trim()) {
      saveToRecentRooms(roomId.trim(), userName.trim());
      
      const route = callType === 'video' ? `/video/${roomId.trim()}` : `/audio/${roomId.trim()}`;
      navigate(route, { 
        state: { userName: userName.trim() } 
      });
    }
  };

  const joinRecentRoom = (recentRoom) => {
    setRoomId(recentRoom.id);
    setUserName(recentRoom.userName);
  };

  const recentRooms = getRecentRooms();

  return (
    <JoinContainer>
      <JoinCard>
        <Title>Join Room</Title>
        <Subtitle>
          Enter the room ID and your name to join an existing conversation
        </Subtitle>

        <InputGroup>
          <Label>Your Name</Label>
          <Input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </InputGroup>

        <InputGroup>
          <Label>Room ID</Label>
          <Input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
          />
        </InputGroup>

        <InputGroup>
          <Label>Call Type</Label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
              <input
                type="radio"
                value="video"
                checked={callType === 'video'}
                onChange={(e) => setCallType(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              Video Call
            </label>
            <label style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
              <input
                type="radio"
                value="audio"
                checked={callType === 'audio'}
                onChange={(e) => setCallType(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              Audio Call
            </label>
          </div>
        </InputGroup>

        <ButtonGroup>
          <Button 
            className="secondary" 
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
          <Button 
            className="primary" 
            onClick={joinRoom}
            disabled={!roomId.trim() || !userName.trim()}
          >
            Join Room
          </Button>
        </ButtonGroup>

        {recentRooms.length > 0 && (
          <RecentRooms>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Recent Rooms</h3>
            {recentRooms.map((room, index) => (
              <RecentRoomItem 
                key={index} 
                onClick={() => joinRecentRoom(room)}
              >
                <div>
                  <div style={{ color: 'white', fontWeight: '600' }}>
                    Room: {room.id}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                    Last used as: {room.userName}
                  </div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                  {new Date(room.timestamp).toLocaleDateString()}
                </div>
              </RecentRoomItem>
            ))}
          </RecentRooms>
        )}
      </JoinCard>
    </JoinContainer>
  );
};

export default JoinRoom; 