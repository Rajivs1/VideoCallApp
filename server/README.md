# AudioVideo App - Server

This is the backend server for the AudioVideo App, a WebRTC-based video conferencing application.

## Deployment on Render

### Environment Variables

Set the following environment variables in your Render dashboard:

- `PORT`: Will be provided by Render automatically
- `CLIENT_URL`: Your frontend application URL (e.g., https://audiovideo-app-frontend.onrender.com)
- `NODE_ENV`: Set to `production`

### Build Commands

- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Resource Settings

- **Runtime Environment**: Node
- **Region**: Choose closest to your users
- **Plan**: Free (for testing), Scale up as needed
- **Branch**: main

## Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   CLIENT_URL=http://localhost:3000
   NODE_ENV=development
   ```
4. Run `npm run dev` to start the development server 