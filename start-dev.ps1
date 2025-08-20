# Start the server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; node index.js"

# Start the client
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
