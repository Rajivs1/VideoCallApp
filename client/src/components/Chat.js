// import React, { useState, useEffect, useRef } from 'react';
// import styled from 'styled-components';

// const ChatContainer = styled.div`
//   background: rgba(0, 0, 0, 0.3);
//   border-radius: 12px;
//   display: flex;
//   flex-direction: column;
//   height: ${props => props.isExpanded ? '350px' : '50px'};
//   overflow: hidden;
//   transition: height 0.3s ease;
//   position: absolute;
//   bottom: 90px;
//   right: 20px;
//   width: 350px;
//   backdrop-filter: blur(10px);
//   z-index: 100;
//   box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
// `;

// const ChatHeader = styled.div`
//   padding: 12px 15px;
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   background: rgba(0, 0, 0, 0.2);
//   cursor: pointer;
// `;

// const ChatTitle = styled.div`
//   font-weight: 600;
//   color: white;
//   display: flex;
//   align-items: center;
//   gap: 8px;
// `;

// const ChatToggle = styled.button`
//   background: transparent;
//   border: none;
//   color: white;
//   font-size: 18px;
//   cursor: pointer;
//   padding: 0;
// `;

// const ChatMessages = styled.div`
//   flex: 1;
//   padding: 12px 15px;
//   overflow-y: auto;
//   display: flex;
//   flex-direction: column;
//   gap: 8px;
// `;

// const ChatInput = styled.div`
//   padding: 12px 15px;
//   background: rgba(0, 0, 0, 0.2);
//   display: flex;
//   gap: 8px;
// `;

// const MessageInput = styled.input`
//   flex: 1;
//   padding: 8px 12px;
//   border-radius: 20px;
//   border: 1px solid rgba(255, 255, 255, 0.1);
//   background: rgba(255, 255, 255, 0.1);
//   color: white;
//   font-size: 14px;
  
//   &::placeholder {
//     color: rgba(255, 255, 255, 0.5);
//   }
  
//   &:focus {
//     outline: none;
//     border-color: rgba(255, 255, 255, 0.3);
//   }
// `;

// const SendButton = styled.button`
//   padding: 8px 12px;
//   border-radius: 20px;
//   border: none;
//   background: #667eea;
//   color: white;
//   font-weight: 600;
//   cursor: pointer;
//   transition: all 0.3s ease;
  
//   &:hover {
//     background: #764ba2;
//   }
  
//   &:disabled {
//     opacity: 0.5;
//     cursor: not-allowed;
//   }
// `;

// const MessageBubble = styled.div`
//   padding: 8px 12px;
//   border-radius: 18px;
//   max-width: 80%;
//   word-break: break-word;
//   position: relative;
  
//   background: ${props => props.isOwn ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.1)'};
//   color: white;
//   align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
// `;

// const MessageMeta = styled.div`
//   font-size: 0.7rem;
//   opacity: 0.7;
//   margin-top: 4px;
//   display: flex;
//   justify-content: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
// `;

// const NewMessageBadge = styled.div`
//   position: absolute;
//   right: 15px;
//   top: 12px;
//   background: #dc3545;
//   color: white;
//   border-radius: 50%;
//   width: 20px;
//   height: 20px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   font-size: 0.7rem;
//   font-weight: bold;
// `;

// const SystemMessage = styled.div`
//   text-align: center;
//   color: rgba(255, 255, 255, 0.6);
//   font-size: 0.8rem;
//   padding: 4px 0;
// `;

// const Chat = ({ socket, roomId, userName }) => {
//   const [isExpanded, setIsExpanded] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [unreadCount, setUnreadCount] = useState(0);
//   const messagesEndRef = useRef(null);
  
//   // Listen for chat messages
//   useEffect(() => {
//     if (!socket) {
//       console.warn('Chat component: Socket not available');
//       return;
//     }
    
//     console.log('Chat: Setting up socket event listeners');
    
//     const handleChatMessage = (message) => {
//       console.log('Chat: Received message:', message);
//       setMessages(prev => [...prev, message]);
      
//       // Increment unread count if chat is collapsed
//       if (!isExpanded) {
//         setUnreadCount(prev => prev + 1);
//       }
//     };
    
//     const handleUserJoined = ({ userId, userName }) => {
//       console.log('Chat: User joined:', userName);
//       const systemMessage = {
//         id: `system-${Date.now()}`,
//         type: 'system',
//         message: `${userName} joined the room`,
//         timestamp: new Date()
//       };
      
//       setMessages(prev => [...prev, systemMessage]);
//     };
    
//     const handleUserLeft = ({ userId, userName }) => {
//       console.log('Chat: User left:', userName);
//       const systemMessage = {
//         id: `system-${Date.now()}`,
//         type: 'system',
//         message: `${userName} left the room`,
//         timestamp: new Date()
//       };
      
//       setMessages(prev => [...prev, systemMessage]);
//     };
    
//     // Register event handlers
//     socket.on('chat-message', handleChatMessage);
//     socket.on('user-joined', handleUserJoined);
//     socket.on('user-left', handleUserLeft);
    
//     // Add system message when chat is initialized
//     const initMessage = {
//       id: `system-init-${Date.now()}`,
//       type: 'system',
//       message: 'Chat initialized. Messages are only visible to people in this call.',
//       timestamp: new Date()
//     };
//     setMessages(prev => [...prev, initMessage]);
    
//     return () => {
//       // Clean up event handlers
//       socket.off('chat-message', handleChatMessage);
//       socket.off('user-joined', handleUserJoined);
//       socket.off('user-left', handleUserLeft);
//     };
//   }, [socket, isExpanded]);
  
//   // Auto scroll to bottom on new message
//   useEffect(() => {
//     if (isExpanded && messagesEndRef.current) {
//       messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
//     }
//   }, [messages, isExpanded]);
  
//   // Reset unread count when expanded
//   useEffect(() => {
//     if (isExpanded) {
//       setUnreadCount(0);
//     }
//   }, [isExpanded]);
  
//   const toggleChat = () => {
//     setIsExpanded(prev => !prev);
//   };
  
//   const sendMessage = (e) => {
//     e.preventDefault();
    
//     if (!newMessage.trim() || !socket) {
//       console.warn('Cannot send message: empty message or socket not connected');
//       return;
//     }
    
//     console.log('Sending chat message:', newMessage.trim());
    
//     // Send the message
//     socket.emit('chat-message', {
//       roomId,
//       message: newMessage.trim()
//     });
    
//     // Add message locally for immediate feedback (optional)
//     const localMessage = {
//       id: `local-${Date.now()}`,
//       userId: 'local',
//       userName: `${userName} (You)`,
//       message: newMessage.trim(),
//       timestamp: new Date()
//     };
//     setMessages(prev => [...prev, localMessage]);
    
//     // Clear input
//     setNewMessage('');
//   };
  
//   const formatTime = (timestamp) => {
//     if (!timestamp) return '';
    
//     const date = new Date(timestamp);
//     return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   };
  
//   return (
//     <ChatContainer isExpanded={isExpanded}>
//       <ChatHeader onClick={toggleChat}>
//         <ChatTitle>
//           <span>💬</span>
//           Chat
//         </ChatTitle>
//         {unreadCount > 0 && !isExpanded && (
//           <NewMessageBadge>{unreadCount}</NewMessageBadge>
//         )}
//         <ChatToggle>
//           {isExpanded ? '▼' : '▲'}
//         </ChatToggle>
//       </ChatHeader>
      
//       {isExpanded && (
//         <>
//           <ChatMessages>
//             {messages.length === 0 ? (
//               <SystemMessage>No messages yet</SystemMessage>
//             ) : (
//               messages.map((message) => {
//                 // System message
//                 if (message.type === 'system') {
//                   return (
//                     <SystemMessage key={message.id}>
//                       {message.message}
//                     </SystemMessage>
//                   );
//                 }
                
//                 // Regular message
//                 const isOwn = message.userId === 'local' || 
//                              socket && message.userId === socket.id;
                
//                 return (
//                   <div key={message.id}>
//                     <MessageBubble isOwn={isOwn}>
//                       {!isOwn && <strong>{message.userName}: </strong>}
//                       {message.message}
//                     </MessageBubble>
//                     <MessageMeta isOwn={isOwn}>
//                       {formatTime(message.timestamp)}
//                     </MessageMeta>
//                   </div>
//                 );
//               })
//             )}
//             <div ref={messagesEndRef} />
//           </ChatMessages>
          
//           <form onSubmit={sendMessage}>
//             <ChatInput>
//               <MessageInput
//                 type="text"
//                 placeholder="Type a message..."
//                 value={newMessage}
//                 onChange={(e) => setNewMessage(e.target.value)}
//                 autoFocus
//               />
//               <SendButton 
//                 type="submit"
//                 disabled={!newMessage.trim() || !socket}
//               >
//                 Send
//               </SendButton>
//             </ChatInput>
//           </form>
//         </>
//       )}
//     </ChatContainer>
//   );
// };

// export default Chat; 











// // import React, { useState, useEffect, useRef } from 'react';
// // import styled from 'styled-components';

// // const ChatContainer = styled.div`
// //   background: rgba(0, 0, 0, 0.3);
// //   border-radius: 12px;
// //   display: flex;
// //   flex-direction: column;
// //   height: ${props => props.isExpanded ? '350px' : '50px'};
// //   overflow: hidden;
// //   transition: height 0.3s ease;
// //   position: absolute;
// //   bottom: 90px;
// //   right: 20px;
// //   width: 350px;
// //   backdrop-filter: blur(10px);
// //   z-index: 100;
// //   box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
// // `;

// // const ChatHeader = styled.div`
// //   padding: 12px 15px;
// //   display: flex;
// //   justify-content: space-between;
// //   align-items: center;
// //   background: rgba(0, 0, 0, 0.2);
// //   cursor: pointer;
// // `;

// // const ChatTitle = styled.div`
// //   font-weight: 600;
// //   color: white;
// //   display: flex;
// //   align-items: center;
// //   gap: 8px;
// // `;

// // const ChatToggle = styled.button`
// //   background: transparent;
// //   border: none;
// //   color: white;
// //   font-size: 18px;
// //   cursor: pointer;
// //   padding: 0;
// // `;

// // const ChatMessages = styled.div`
// //   flex: 1;
// //   padding: 12px 15px;
// //   overflow-y: auto;
// //   display: flex;
// //   flex-direction: column;
// //   gap: 8px;
// // `;

// // const ChatInput = styled.div`
// //   padding: 12px 15px;
// //   background: rgba(0, 0, 0, 0.2);
// //   display: flex;
// //   gap: 8px;
// // `;

// // const MessageInput = styled.input`
// //   flex: 1;
// //   padding: 8px 12px;
// //   border-radius: 20px;
// //   border: 1px solid rgba(255, 255, 255, 0.1);
// //   background: rgba(255, 255, 255, 0.1);
// //   color: white;
// //   font-size: 14px;
  
// //   &::placeholder {
// //     color: rgba(255, 255, 255, 0.5);
// //   }
  
// //   &:focus {
// //     outline: none;
// //     border-color: rgba(255, 255, 255, 0.3);
// //   }
// // `;

// // const SendButton = styled.button`
// //   padding: 8px 12px;
// //   border-radius: 20px;
// //   border: none;
// //   background: #667eea;
// //   color: white;
// //   font-weight: 600;
// //   cursor: pointer;
// //   transition: all 0.3s ease;
  
// //   &:hover {
// //     background: #764ba2;
// //   }
  
// //   &:disabled {
// //     opacity: 0.5;
// //     cursor: not-allowed;
// //   }
// // `;

// // const MessageBubble = styled.div`
// //   padding: 8px 12px;
// //   border-radius: 18px;
// //   max-width: 80%;
// //   word-break: break-word;
// //   position: relative;
  
// //   background: ${props => props.isOwn ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.1)'};
// //   color: white;
// //   align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
// // `;

// // const MessageMeta = styled.div`
// //   font-size: 0.7rem;
// //   opacity: 0.7;
// //   margin-top: 4px;
// //   display: flex;
// //   justify-content: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
// // `;

// // const NewMessageBadge = styled.div`
// //   position: absolute;
// //   right: 15px;
// //   top: 12px;
// //   background: #dc3545;
// //   color: white;
// //   border-radius: 50%;
// //   width: 20px;
// //   height: 20px;
// //   display: flex;
// //   align-items: center;
// //   justify-content: center;
// //   font-size: 0.7rem;
// //   font-weight: bold;
// // `;

// // const SystemMessage = styled.div`
// //   text-align: center;
// //   color: rgba(255, 255, 255, 0.6);
// //   font-size: 0.8rem;
// //   padding: 4px 0;
// // `;

// // const Chat = ({ socket, roomId, userName }) => {
// //   const [isExpanded, setIsExpanded] = useState(false);
// //   const [messages, setMessages] = useState([]);
// //   const [newMessage, setNewMessage] = useState('');
// //   const [unreadCount, setUnreadCount] = useState(0);
// //   const messagesEndRef = useRef(null);
  
// //   // Listen for chat messages
// //   useEffect(() => {
// //     if (!socket) {
// //       console.warn('Chat component: Socket not available');
// //       return;
// //     }
    
// //     console.log('Chat: Setting up socket event listeners');
    
// //     const handleChatMessage = (message) => {
// //       console.log('Chat: Received message:', message);
// //       setMessages(prev => [...prev, message]);
      
// //       // Increment unread count if chat is collapsed
// //       if (!isExpanded) {
// //         setUnreadCount(prev => prev + 1);
// //       }
// //     };
    
// //     const handleUserJoined = ({ userId, userName }) => {
// //       console.log('Chat: User joined:', userName);
// //       const systemMessage = {
// //         id: `system-${Date.now()}`,
// //         type: 'system',
// //         message: `${userName} joined the room`,
// //         timestamp: new Date()
// //       };
      
// //       setMessages(prev => [...prev, systemMessage]);
// //     };
    
// //     const handleUserLeft = ({ userId, userName }) => {
// //       console.log('Chat: User left:', userName);
// //       const systemMessage = {
// //         id: `system-${Date.now()}`,
// //         type: 'system',
// //         message: `${userName} left the room`,
// //         timestamp: new Date()
// //       };
      
// //       setMessages(prev => [...prev, systemMessage]);
// //     };
    
// //     // Register event handlers
// //     socket.on('chat-message', handleChatMessage);
// //     socket.on('user-joined', handleUserJoined);
// //     socket.on('user-left', handleUserLeft);
    
// //     // Add system message when chat is initialized
// //     const initMessage = {
// //       id: `system-init-${Date.now()}`,
// //       type: 'system',
// //       message: 'Chat initialized. Messages are only visible to people in this call.',
// //       timestamp: new Date()
// //     };
// //     setMessages(prev => [...prev, initMessage]);
    
// //     return () => {
// //       // Clean up event handlers
// //       socket.off('chat-message', handleChatMessage);
// //       socket.off('user-joined', handleUserJoined);
// //       socket.off('user-left', handleUserLeft);
// //     };
// //   }, [socket, isExpanded]);
  
// //   // Auto scroll to bottom on new message
// //   useEffect(() => {
// //     if (isExpanded && messagesEndRef.current) {
// //       messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
// //     }
// //   }, [messages, isExpanded]);
  
// //   // Reset unread count when expanded
// //   useEffect(() => {
// //     if (isExpanded) {
// //       setUnreadCount(0);
// //     }
// //   }, [isExpanded]);
  
// //   const toggleChat = () => {
// //     setIsExpanded(prev => !prev);
// //   };
  
// //   const sendMessage = (e) => {
// //     e.preventDefault();
    
// //     if (!newMessage.trim() || !socket) {
// //       console.warn('Cannot send message: empty message or socket not connected');
// //       return;
// //     }
    
// //     console.log('Sending chat message:', newMessage.trim());
    
// //     // Send the message - the server will broadcast it back to all clients including sender
// //     socket.emit('chat-message', {
// //       roomId,
// //       message: newMessage.trim()
// //     });
    
// //     // Clear input immediately for better UX
// //     setNewMessage('');
// //   };
  
// //   const formatTime = (timestamp) => {
// //     if (!timestamp) return '';
    
// //     const date = new Date(timestamp);
// //     return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// //   };
  
// //   return (
// //     <ChatContainer isExpanded={isExpanded}>
// //       <ChatHeader onClick={toggleChat}>
// //         <ChatTitle>
// //           <span>💬</span>
// //           Chat
// //         </ChatTitle>
// //         {unreadCount > 0 && !isExpanded && (
// //           <NewMessageBadge>{unreadCount}</NewMessageBadge>
// //         )}
// //         <ChatToggle>
// //           {isExpanded ? '▼' : '▲'}
// //         </ChatToggle>
// //       </ChatHeader>
      
// //       {isExpanded && (
// //         <>
// //           <ChatMessages>
// //             {messages.length === 0 ? (
// //               <SystemMessage>No messages yet</SystemMessage>
// //             ) : (
// //               messages.map((message) => {
// //                 // System message
// //                 if (message.type === 'system') {
// //                   return (
// //                     <SystemMessage key={message.id}>
// //                       {message.message}
// //                     </SystemMessage>
// //                   );
// //                 }
                
// //                 // Regular message
// //                 const isOwn = socket && message.userId === socket.id;
                
// //                 return (
// //                   <div key={message.id}>
// //                     <MessageBubble isOwn={isOwn}>
// //                       {!isOwn && <strong>{message.userName}: </strong>}
// //                       {message.message}
// //                     </MessageBubble>
// //                     <MessageMeta isOwn={isOwn}>
// //                       {formatTime(message.timestamp)}
// //                     </MessageMeta>
// //                   </div>
// //                 );
// //               })
// //             )}
// //             <div ref={messagesEndRef} />
// //           </ChatMessages>
          
// //           <form onSubmit={sendMessage}>
// //             <ChatInput>
// //               <MessageInput
// //                 type="text"
// //                 placeholder="Type a message..."
// //                 value={newMessage}
// //                 onChange={(e) => setNewMessage(e.target.value)}
// //                 autoFocus
// //               />
// //               <SendButton 
// //                 type="submit"
// //                 disabled={!newMessage.trim() || !socket}
// //               >
// //                 Send
// //               </SendButton>
// //             </ChatInput>
// //           </form>
// //         </>
// //       )}
// //     </ChatContainer>
// //   );
// // };

// // export default Chat;



import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const ChatContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: ${props => props.isExpanded ? '350px' : '50px'};
  overflow: hidden;
  transition: height 0.3s ease;
  position: absolute;
  bottom: 90px;
  right: 20px;
  width: 350px;
  backdrop-filter: blur(10px);
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const ChatHeader = styled.div`
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
`;

const ChatTitle = styled.div`
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChatToggle = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: 12px 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChatInput = styled.div`
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  gap: 8px;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const SendButton = styled.button`
  padding: 8px 12px;
  border-radius: 20px;
  border: none;
  background: #667eea;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #764ba2;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MessageBubble = styled.div`
  padding: 8px 12px;
  border-radius: 18px;
  max-width: 80%;
  word-break: break-word;
  position: relative;
  
  background: ${props => props.isOwn ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.1)'};
  color: white;
  align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
`;

const MessageMeta = styled.div`
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 4px;
  display: flex;
  justify-content: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
`;

const NewMessageBadge = styled.div`
  position: absolute;
  right: 15px;
  top: 12px;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
`;

const SystemMessage = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  padding: 4px 0;
`;

const Chat = ({ socket, roomId, userName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  
  // Listen for chat messages
  useEffect(() => {
    if (!socket) {
      console.warn('Chat component: Socket not available');
      return;
    }
    
    console.log('Chat: Setting up socket event listeners');
    
    const handleChatMessage = (message) => {
      console.log('Chat: Received message:', message);
      setMessages(prev => [...prev, message]);
      
      // Increment unread count if chat is collapsed
      if (!isExpanded) {
        setUnreadCount(prev => prev + 1);
      }
    };
    
    const handleUserJoined = ({ userId, userName }) => {
      console.log('Chat: User joined:', userName);
      const systemMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        message: `${userName} joined the room`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, systemMessage]);
    };
    
    const handleUserLeft = ({ userId, userName }) => {
      console.log('Chat: User left:', userName);
      const systemMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        message: `${userName} left the room`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, systemMessage]);
    };
    
    // Register event handlers
    socket.on('chat-message', handleChatMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    
    // Add system message when chat is initialized
    const initMessage = {
      id: `system-init-${Date.now()}`,
      type: 'system',
      message: 'Chat initialized. Messages are only visible to people in this call.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, initMessage]);
    
    return () => {
      // Clean up event handlers
      socket.off('chat-message', handleChatMessage);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, isExpanded]);
  
  // Auto scroll to bottom on new message
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);
  
  // Reset unread count when expanded
  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
    }
  }, [isExpanded]);
  
  const toggleChat = () => {
    setIsExpanded(prev => !prev);
  };
  
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket) {
      console.warn('Cannot send message: empty message or socket not connected');
      return;
    }
    
    console.log('Sending chat message:', newMessage.trim());
    
    // Only emit to server - don't add locally
    // The server will echo it back and it will be added via the 'chat-message' event handler
    socket.emit('chat-message', {
      roomId,
      message: newMessage.trim()
    });
    
    // Clear input
    setNewMessage('');
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <ChatContainer isExpanded={isExpanded}>
      <ChatHeader onClick={toggleChat}>
        <ChatTitle>
          <span>💬</span>
          Chat
        </ChatTitle>
        {unreadCount > 0 && !isExpanded && (
          <NewMessageBadge>{unreadCount}</NewMessageBadge>
        )}
        <ChatToggle>
          {isExpanded ? '▼' : '▲'}
        </ChatToggle>
      </ChatHeader>
      
      {isExpanded && (
        <>
          <ChatMessages>
            {messages.length === 0 ? (
              <SystemMessage>No messages yet</SystemMessage>
            ) : (
              messages.map((message) => {
                // System message
                if (message.type === 'system') {
                  return (
                    <SystemMessage key={message.id}>
                      {message.message}
                    </SystemMessage>
                  );
                }
                
                // Regular message
                const isOwn = socket && message.userId === socket.id;
                
                return (
                  <div key={message.id}>
                    <MessageBubble isOwn={isOwn}>
                      {!isOwn && <strong>{message.userName}: </strong>}
                      {message.message}
                    </MessageBubble>
                    <MessageMeta isOwn={isOwn}>
                      {formatTime(message.timestamp)}
                    </MessageMeta>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </ChatMessages>
          
          <form onSubmit={sendMessage}>
            <ChatInput>
              <MessageInput
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                autoFocus
              />
              <SendButton 
                type="submit"
                disabled={!newMessage.trim() || !socket}
              >
                Send
              </SendButton>
            </ChatInput>
          </form>
        </>
      )}
    </ChatContainer>
  );
};

export default Chat;