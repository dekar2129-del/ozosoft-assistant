# Port Configuration Guide

## Current Port Setup

### Frontend (Vite Dev Server)
- **Port:** `3000`
- **URL:** `http://localhost:3000`
- **Configuration:** `vite.config.ts`

### Backend (Express Server)
- **Port:** `3001`
- **URL:** `http://localhost:3001`
- **Configuration:** `server.js` (line 7: `const PORT = 3001`)

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ All requests
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Vite Dev Server (Port 3000)                            │
│  - Serves React app                                     │
│  - Proxies /api/* requests to backend                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ /api/* requests
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Express Backend (Port 3001)                           │
│  - Handles API requests                                 │
│  - MongoDB connection                                  │
│  - Business logic                                      │
└─────────────────────────────────────────────────────────┘
```

## Proxy Configuration

The Vite proxy automatically forwards all `/api/*` requests from the frontend (port 3000) to the backend (port 3001).

**Example:**
- Frontend request: `http://localhost:3000/api/config`
- Gets proxied to: `http://localhost:3001/api/config`
- Response returns to frontend

## Changing Ports

### Change Frontend Port

Edit `vite.config.ts`:
```typescript
server: {
  port: 3000,  // Change this to your desired port
  // ...
}
```

### Change Backend Port

Edit `server.js`:
```javascript
const PORT = 3001;  // Change this to your desired port
```

**Important:** If you change the backend port, also update the proxy target in `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:NEW_PORT',  // Update this
    changeOrigin: true,
  },
}
```

## Verifying Ports

### Check if ports are in use:
```bash
# Check port 3000 (frontend)
lsof -ti:3000

# Check port 3001 (backend)
lsof -ti:3001
```

### Test the setup:

1. **Start Backend:**
   ```bash
   npm run server
   ```
   Should see: `🚀 Server running on http://localhost:3001`

2. **Start Frontend:**
   ```bash
   npm run dev
   ```
   Should see: `Local: http://localhost:3000/`

3. **Test API Proxy:**
   ```bash
   # This should work from browser
   curl http://localhost:3000/api/health
   
   # This should also work directly
   curl http://localhost:3001/api/health
   ```

## Troubleshooting

### Port Already in Use

If you get "port already in use" error:

1. **Find the process:**
   ```bash
   lsof -ti:3000  # or 3001
   ```

2. **Kill the process:**
   ```bash
   kill -9 <PID>
   ```

3. **Or change the port** (see "Changing Ports" above)

### Proxy Not Working

If API requests fail:

1. Make sure backend is running on port 3001
2. Check `vite.config.ts` proxy configuration
3. Verify the proxy target matches backend port
4. Restart both servers

### CORS Issues

If you see CORS errors:
- Backend has CORS enabled (see `server.js` line 10)
- Make sure backend is running
- Check that requests are going through the proxy (use `/api/...` not `http://localhost:3001/api/...`)

## Production Deployment

In production:
- Frontend: Build with `npm run build` and serve from any port
- Backend: Can run on any port, configure reverse proxy (nginx/Apache) to route `/api/*` to backend
- Or use same domain with path-based routing

