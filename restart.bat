@echo off
echo Starting VideoCallApp server and client...

:: Kill any existing processes on ports 3000 and 3001 (client and server)
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000') DO TaskKill /PID %%P /F
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3001') DO TaskKill /PID %%P /F

:: Start the server in a new window
start cmd /k "cd server && npm start"

:: Give the server a moment to start
timeout /t 3

:: Start the client in a new window
start cmd /k "cd client && npm start"

echo Server and client should be starting now.
echo Client will be available at http://localhost:3000
echo.
echo Make sure to allow access if the firewall prompt appears.
echo. 