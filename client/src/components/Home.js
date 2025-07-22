import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 3rem;
  max-width: 600px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const ActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  min-width: 200px;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const ButtonIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const ButtonText = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
`;

const RoomSection = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 400px;
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  margin-bottom: 1rem;
  backdrop-filter: blur(10px);
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const JoinButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
`;

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const startVideoCall = () => {
    const newRoomId = generateRoomId();
    navigate(`/video/${newRoomId}`);
  };

  const startAudioCall = () => {
    const newRoomId = generateRoomId();
    navigate(`/audio/${newRoomId}`);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      navigate(`/video/${roomId.trim()}`);
    }
  };

  return (
    <HomeContainer>
      <Title>Welcome to AudioVideo App</Title>
      <Subtitle>
        Connect with friends and family through high-quality video and audio calls. 
        Start a new conversation or join an existing room.
      </Subtitle>

      <ButtonGroup>
        <ActionButton onClick={startVideoCall}>
          <ButtonIcon>🎥</ButtonIcon>
          <ButtonText>Start Video Call</ButtonText>
        </ActionButton>
        <ActionButton onClick={startAudioCall}>
          <ButtonIcon>🎵</ButtonIcon>
          <ButtonText>Start Audio Call</ButtonText>
        </ActionButton>
      </ButtonGroup>

      <RoomSection>
        <h3 style={{ marginBottom: '1rem', color: 'white' }}>Join Existing Room</h3>
        <Input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
        />
        <JoinButton onClick={joinRoom} disabled={!roomId.trim()}>
          Join Room
        </JoinButton>
      </RoomSection>
    </HomeContainer>
  );
};

export default Home; 