# Project Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?appName=AppName
```

**Note:** The MongoDB URI can also be configured directly in `server.js` if you prefer.

### 3. Start the Application

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Dev Server:**
```bash
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

## Project Architecture

### Frontend (Port 3000)
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router
- **Styling:** Tailwind CSS (via CDN)

### Backend (Port 3001)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **API:** RESTful endpoints

### Key Features
- Real-time voice interaction with Gemini Live API
- Text chat support
- Conversation history management
- Admin dashboard for configuration
- Automatic MongoDB reconnection
- LocalStorage fallback for offline support

## File Structure

```
ozosoft-assistant/
├── components/          # Reusable React components
│   ├── AdminDashboard.tsx
│   ├── ConfigPanel.tsx
│   ├── ConversationsPanel.tsx
│   ├── LoginModal.tsx
│   └── Visualizer.tsx
├── pages/              # Page-level components
│   ├── AdminPage.tsx
│   └── AssistantPage.tsx
├── hooks/              # Custom React hooks
│   └── useGeminiLive.ts
├── utils/              # Utility functions
│   ├── audioUtils.ts
│   └── storageUtils.ts
├── server.js           # Express backend server
├── App.tsx             # Main React application
├── index.tsx           # React entry point
└── types.ts            # TypeScript definitions
```

## API Endpoints

### Configuration
- `GET /api/config` - Get company configuration
- `POST /api/config` - Update company configuration

### Conversations
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Save a conversation
- `GET /api/conversations/:sessionId` - Get specific conversation
- `DELETE /api/conversations/:sessionId` - Delete conversation

### System
- `GET /api/health` - Server health check
- `POST /api/reconnect` - Manually trigger MongoDB reconnection

## Troubleshooting

### MongoDB Connection Issues
- Check connection string format
- Verify network connectivity
- Check MongoDB Atlas IP whitelist
- Server automatically retries connection

### Port Conflicts
- Frontend port: Change in `vite.config.ts`
- Backend port: Change `PORT` in `server.js`

### Environment Variables
- Ensure `.env.local` exists
- Restart dev server after changes
- Check API key permissions

## Development Tips

1. **Hot Reload:** Both frontend and backend support hot reload
2. **Error Handling:** Check browser console and server logs
3. **Database:** Use MongoDB Atlas for cloud database
4. **Testing:** Test with different network conditions

## Production Deployment

1. Build frontend: `npm run build`
2. Set production environment variables
3. Deploy `dist/` folder (frontend)
4. Deploy `server.js` with Node.js (backend)
5. Configure MongoDB connection for production
6. Set up process manager (PM2 recommended)

