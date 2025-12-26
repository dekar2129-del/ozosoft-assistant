# OZOSOFT AI Voice Assistant

A modern AI-powered voice assistant application built with React, Express, MongoDB, and Google's Gemini Live API.

## 🚀 Features

- **Real-time Voice Interaction** - Connect and interact with AI using voice
- **Text Chat Support** - Type messages when voice isn't available
- **Conversation History** - View and manage all conversations
- **Admin Dashboard** - Configure assistant settings and view analytics
- **MongoDB Integration** - Persistent storage for configurations and conversations
- **Graceful Error Handling** - Works offline with localStorage fallback

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB Atlas** account (or local MongoDB instance)
- **Google Gemini API Key**

## 🛠️ Installation

1. **Clone or download the project**
   ```bash
   cd ozosoft-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?appName=AppName
   ```

   Or copy from example:
   ```bash
   cp .env.example .env.local
   ```

4. **Configure MongoDB**
   
   Update the `MONGO_URI` in `server.js` or set it in `.env.local`:
   ```env
   MONGO_URI=mongodb+srv://datauser:password@cluster0.y92agb7.mongodb.net/ozosoft?appName=Cluster0
   ```

## 🏃 Running the Application

### Development Mode

The application runs on **two different ports**:
- **Frontend:** Port `3000` (Vite dev server)
- **Backend:** Port `3001` (Express API server)

The frontend automatically proxies all `/api/*` requests to the backend.

**Terminal 1 - Start Backend Server:**
```bash
npm run server
# or
node server.js
```

The backend server will run on `http://localhost:3001`

**Terminal 2 - Start Frontend Dev Server:**
```bash
npm run dev
# or
npm start
```

The frontend will run on `http://localhost:3000`

**Note:** You need both servers running simultaneously. The frontend proxies API requests to the backend automatically.

### Production Build

```bash
# Build the frontend
npm run build

# Preview the production build
npm run preview
```

## 📁 Project Structure

```
ozosoft-assistant/
├── components/          # React components
│   ├── AdminDashboard.tsx
│   ├── ConfigPanel.tsx
│   ├── ConversationsPanel.tsx
│   ├── LoginModal.tsx
│   └── Visualizer.tsx
├── pages/              # Page components
│   ├── AdminPage.tsx
│   └── AssistantPage.tsx
├── hooks/              # Custom React hooks
│   └── useGeminiLive.ts
├── utils/              # Utility functions
│   ├── audioUtils.ts
│   └── storageUtils.ts
├── public/             # Static assets
├── server.js           # Express backend server
├── App.tsx             # Main React app
├── index.tsx           # React entry point
├── index.html          # HTML template
├── types.ts            # TypeScript type definitions
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## 🔧 Configuration

### Backend Configuration

The backend server (`server.js`) handles:
- MongoDB connection and management
- API endpoints for configuration and conversations
- Automatic reconnection on database disconnection

**API Endpoints:**
- `GET /api/health` - Server health check
- `GET /api/config` - Get company configuration
- `POST /api/config` - Update company configuration
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Save a conversation
- `GET /api/conversations/:sessionId` - Get specific conversation
- `DELETE /api/conversations/:sessionId` - Delete conversation
- `POST /api/reconnect` - Manually trigger MongoDB reconnection

### Frontend Configuration

The frontend uses Vite with:
- React 19
- TypeScript
- Proxy configuration for API calls
- Environment variable support

## 🎯 Usage

1. **Access the Application**
   - Open `http://localhost:3000` in your browser

2. **Configure the Assistant** (Admin Panel)
   - Navigate to `/admin`
   - Set up company information, industry, tone, and knowledge base
   - Configuration is saved to MongoDB

3. **Start a Conversation**
   - Click "Start Conversation" button
   - Grant microphone permissions when prompted
   - Speak or type messages
   - Conversations are automatically saved

4. **View Conversation History**
   - Access the admin panel
   - View all saved conversations
   - Click on a conversation to see details

## 🔒 Security Notes

- Store sensitive credentials in `.env.local` (not committed to git)
- Use environment variables for API keys
- MongoDB connection string should be kept secure
- In production, use proper authentication and authorization

## 🐛 Troubleshooting

### MongoDB Connection Issues

If you see "Database temporarily unavailable":
- Check your MongoDB connection string
- Verify network connectivity
- Check MongoDB Atlas IP whitelist settings
- The app will fallback to localStorage automatically

### Port Conflicts

If ports 3000 or 3001 are in use:
- Change the port in `vite.config.ts` (frontend)
- Change `PORT` in `server.js` (backend)
- Update the proxy target if frontend port changes

### API Key Issues

- Ensure `GEMINI_API_KEY` is set in `.env.local`
- Restart the dev server after adding environment variables
- Check API key permissions in Google Cloud Console

## 📝 Environment Variables

Create `.env.local` file:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_api_key_here

# MongoDB Connection String (optional, can be set in server.js)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db?appName=App
```

## 🚀 Deployment

### Frontend Deployment

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to your hosting service

### Backend Deployment

1. Set environment variables on your hosting platform
2. Ensure MongoDB is accessible from your server
3. Deploy `server.js` and run with Node.js
4. Consider using PM2 or similar for process management

## 📄 License

MIT License

## 👥 Support

For issues and questions, please contact: contact@ozosoft.com

---

**Built with ❤️ by OZOSOFT**
