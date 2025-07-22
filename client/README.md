# AudioVideo App - Frontend

This is the frontend for the AudioVideo App, a WebRTC-based video conferencing application.

## Environment Variables for Deployment

When deploying to Vercel, make sure to configure the following environment variable:

- `REACT_APP_SERVER_URL`: The URL of your backend server (e.g., `https://your-backend.onrender.com`)

## How to Fix Mobile Connection Issues

If you're experiencing WebSocket connection errors on mobile devices:

1. Ensure your backend server is properly deployed and running on Render
2. Make sure your backend has CORS configured to allow requests from your Vercel frontend domain
3. Check that the environment variable `REACT_APP_SERVER_URL` is correctly set in Vercel
4. The backend should use HTTPS for secure WebSocket connections

## Vercel Environment Variables Setup

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add a new variable:
   - Name: `REACT_APP_SERVER_URL`
   - Value: Your Render backend URL (e.g., `https://audiovideo-app-backend.onrender.com`)
4. Save and redeploy your application

## Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `.env` file with:
   ```
   REACT_APP_SERVER_URL=http://localhost:5000
   ```
4. Run `npm start` to start the development server 