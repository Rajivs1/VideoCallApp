import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import './App.css';

// Components
import Home from './components/Home';
import VideoCall from './components/VideoCall';
import AudioCall from './components/AudioCall';
import JoinRoom from './components/JoinRoom';
import Navbar from './components/Navbar';

// Context
import { RoomProvider } from './context/RoomContext';
const checking ="just checking"
const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
`;

const MainContent = styled.main`
  padding-top: 80px; /* Account for fixed navbar */
  min-height: calc(100vh - 80px);
`;

function App() {
  return (
    <RoomProvider>
      <AppContainer>
        <Router>
          <Navbar />
          <MainContent>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/join" element={<JoinRoom />} />
              <Route path="/video/:roomId" element={<VideoCall />} />
              <Route path="/audio/:roomId" element={<AudioCall />} />
            </Routes>
          </MainContent>
        </Router>
      </AppContainer>
    </RoomProvider>
  );
}

export default App; 