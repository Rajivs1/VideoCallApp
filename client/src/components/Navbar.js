import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const NavbarContainer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: 1000;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
`;

const Logo = styled(Link)`
  font-size: 1.8rem;
  font-weight: bold;
  text-decoration: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;

  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const NavLink = styled(Link)`
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }

  &.active {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }
`;

const Navbar = () => {
  const location = useLocation();

  return (
    <NavbarContainer>
      <Logo to="/">
        🎥 AudioVideo App
      </Logo>
      <NavLinks>
        <NavLink 
          to="/" 
          className={location.pathname === '/' ? 'active' : ''}
        >
          Home
        </NavLink>
        <NavLink 
          to="/join" 
          className={location.pathname === '/join' ? 'active' : ''}
        >
          Join Room
        </NavLink>
      </NavLinks>
    </NavbarContainer>
  );
};

export default Navbar; 