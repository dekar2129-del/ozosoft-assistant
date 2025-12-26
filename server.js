import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
// Use environment variable for MongoDB URI, fallback to default
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://datauser:Ozosoft12%40@cluster0.y92agb7.mongodb.net/ozosoft?appName=Cluster0";

// Connection options optimized for reliability
const mongoOptions = {
  serverSelectionTimeoutMS: 30000, // Increased to 30s for initial connection
  socketTimeoutMS: 45000, // 45s socket timeout (was 0, now has reasonable timeout)
  connectTimeoutMS: 30000, // 30s to establish initial connection
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 1, // Reduced from 5 to allow connection even with limited resources
  maxIdleTimeMS: 300000, // Close idle connections after 5 minutes
  retryWrites: true, // Automatically retry write operations
  retryReads: true, // Automatically retry read operations
  heartbeatFrequencyMS: 10000, // Check server health every 10s
};

// Connect to MongoDB with retry logic
let isConnecting = false;
let lastConnectionAttempt = 0;
const CONNECTION_COOLDOWN = 5000; // Don't retry more than once every 5 seconds

const connectDB = async () => {
  const now = Date.now();
  
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return; // Silent return - already connecting
  }
  
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }
  
  if (mongoose.connection.readyState === 2) {
    return; // Connection in progress
  }
  
  // Cooldown to prevent too frequent retry attempts
  if (now - lastConnectionAttempt < CONNECTION_COOLDOWN) {
    return; // On cooldown
  }
  
  isConnecting = true;
  lastConnectionAttempt = now;
  let retries = 3; // Reduced retries, but with longer timeouts
  
  console.log('🔄 Connecting to MongoDB...');
  
  while (retries > 0) {
    try {
      // Only close if we have an active connection that's not disconnected
      if (mongoose.connection.readyState === 1) {
        // Already connected, exit
        isConnecting = false;
        return;
      }
      
      // If there's a stale connection, close it first
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.connection.close();
          // Small delay after closing
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (closeErr) {
          // Ignore close errors, continue with connection
        }
      }
      
      // Attempt connection
      await mongoose.connect(MONGO_URI, mongoOptions);
      console.log('✅ Connected to MongoDB Atlas');
      isConnecting = false;
      return; // Success
      
    } catch (err) {
      retries -= 1;
      const attemptNum = 3 - retries;
      
      // More detailed error logging
      if (err.name === 'MongoServerSelectionError') {
        console.error(`❌ MongoDB server selection failed (${attemptNum}/3):`, err.message.split('\n')[0]);
      } else if (err.name === 'MongoNetworkError') {
        console.error(`❌ MongoDB network error (${attemptNum}/3):`, err.message);
      } else {
        console.error(`❌ MongoDB connection error (${attemptNum}/3):`, err.message);
      }
      
      if (retries === 0) {
        console.error('❌ Could not connect to MongoDB after 3 attempts');
        console.log('💡 Check: MongoDB URI, network connection, IP whitelist, credentials');
        isConnecting = false;
        // Schedule another retry attempt after 60 seconds (longer wait)
        setTimeout(() => {
          console.log('🔄 Automatic reconnection attempt scheduled...');
          connectDB();
        }, 60000);
        return;
      }
      
      // Exponential backoff with longer delays
      const delay = attemptNum * 3000; // 3s, 6s
      console.log(`⏳ Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  isConnecting = false;
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
  // Don't exit, connection will be retried automatically
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
  console.log('⏳ Attempting to reconnect...');
  // Trigger manual reconnection immediately
  if (mongoose.connection.readyState === 0) {
    connectDB();
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ Mongoose reconnected to MongoDB');
});

mongoose.connection.on('reconnectFailed', () => {
  console.error('❌ Mongoose reconnection failed');
  // Try to reconnect manually after a delay
  setTimeout(() => {
    console.log('🔄 Manual reconnection attempt after failure...');
    connectDB();
  }, 5000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('👋 Mongoose connection closed through app termination');
  process.exit(0);
});

// Configure Mongoose to disable buffering
mongoose.set('bufferCommands', false);

// Initialize connection
connectDB();

// Periodic health check and auto-reconnect
setInterval(() => {
  const readyState = mongoose.connection.readyState;
  if (readyState === 0) {
    console.log('🔄 Periodic check: MongoDB disconnected, attempting reconnection...');
    connectDB();
  }
}, 30000); // Check every 30 seconds

// Schema Definition
const SettingsSchema = new mongoose.Schema({
  id: { type: String, default: 'company_config' }, // Singleton ID
  name: String,
  assistantName: String,
  industry: String,
  tone: String,
  knowledgeBase: String,
  updatedAt: { type: Date, default: Date.now }
});

const Settings = mongoose.model('Settings', SettingsSchema);

// Conversation Schema
const ConversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  clientName: String,
  clientPhone: String,
  messages: [{
    text: String,
    sender: { type: String, enum: ['user', 'model'] },
    timestamp: { type: Date, default: Date.now },
    isComplete: Boolean
  }],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  duration: Number, // in seconds
  messageCount: Number
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

// API Endpoints

// Middleware to check MongoDB connection
const checkDBConnection = (req, res, next) => {
  const readyState = mongoose.connection.readyState;
  
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (readyState === 0) {
    console.log('⚠️  Request blocked: MongoDB disconnected. Triggering reconnection...');
    // Trigger reconnection immediately (don't await, but log if it fails)
    connectDB().catch(err => {
      console.error('Background reconnection attempt failed:', err.message);
    });
    
    // For conversations endpoint, include empty arrays
    const response = { 
      error: 'Database temporarily unavailable',
      message: 'Connection lost. The server is attempting to reconnect. Please try again in a moment.',
      readyState: 'disconnected'
    };
    
    // Add conversations structure for /api/conversations endpoint
    if (req.path.includes('/conversations') && req.method === 'GET') {
      response.conversations = [];
      response.total = 0;
    }
    
    return res.status(503).json(response);
  }
  
  if (readyState === 2) {
    console.log('⏳ Request blocked: MongoDB connecting...');
    const response = { 
      error: 'Database connecting',
      message: 'Please wait, reconnecting to database...',
      readyState: 'connecting'
    };
    
    if (req.path.includes('/conversations') && req.method === 'GET') {
      response.conversations = [];
      response.total = 0;
    }
    
    return res.status(503).json(response);
  }
  
  if (readyState === 3) {
    console.log('⚠️  Request blocked: MongoDB disconnecting...');
    const response = { 
      error: 'Database disconnecting',
      message: 'Please try again in a moment.',
      readyState: 'disconnecting'
    };
    
    if (req.path.includes('/conversations') && req.method === 'GET') {
      response.conversations = [];
      response.total = 0;
    }
    
    return res.status(503).json(response);
  }
  
  // readyState === 1 (connected)
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  const healthStatus = {
    status: 'running',
    timestamp: new Date().toISOString(),
    mongodb: {
      state: readyStates[mongoose.connection.readyState],
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown'
    },
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.floor(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    }
  };
  
  const httpStatus = mongoose.connection.readyState === 1 ? 200 : 503;
  res.status(httpStatus).json(healthStatus);
});

// Manual reconnect endpoint
app.post('/api/reconnect', async (req, res) => {
  try {
    console.log('🔄 Manual reconnection requested...');
    await connectDB();
    const readyState = mongoose.connection.readyState;
    res.json({
      success: readyState === 1,
      message: readyState === 1 ? 'Connected to MongoDB' : 'Connection attempt initiated',
      readyState: readyState
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/config - Retrieve company settings
app.get('/api/config', checkDBConnection, async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'MongoDB connection is not available. Please try again later.'
      });
    }
    
    let settings = await Settings.findOne({ id: 'company_config' });
    
    // Return 404 if nothing found (client handles defaults)
    if (!settings) {
      return res.status(404).json({ message: 'No configuration found' });
    }
    
    // Strip internal fields
    const { name, assistantName, industry, tone, knowledgeBase } = settings;
    res.json({ name, assistantName, industry, tone, knowledgeBase });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// POST /api/config - Update company settings
app.post('/api/config', checkDBConnection, async (req, res) => {
  try {
    const { name, assistantName, industry, tone, knowledgeBase } = req.body;
    
    const settings = await Settings.findOneAndUpdate(
      { id: 'company_config' },
      { 
        name, 
        assistantName,
        industry, 
        tone, 
        knowledgeBase,
        updatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(settings);
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// POST /api/conversations - Save a conversation
app.post('/api/conversations', checkDBConnection, async (req, res) => {
  try {
    const { sessionId, messages, endedAt, clientName, clientPhone } = req.body;
    
    console.log(`📝 Saving conversation: ${sessionId} with ${messages?.length || 0} messages`);
    
    if (!sessionId || !messages || messages.length === 0) {
      console.log('❌ Invalid conversation data received');
      return res.status(400).json({ error: 'Invalid conversation data' });
    }
    
    const startTime = messages.length > 0 ? new Date(messages[0].timestamp) : new Date();
    const endTime = endedAt ? new Date(endedAt) : new Date();
    const duration = Math.floor((endTime - startTime) / 1000);
    
    const updateData = {
      messages,
      endedAt: endTime,
      duration,
      messageCount: messages.length
    };
    
    // Add client info if provided
    if (clientName) updateData.clientName = clientName;
    if (clientPhone) updateData.clientPhone = clientPhone;
    
    const conversation = await Conversation.findOneAndUpdate(
      { sessionId },
      updateData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    console.log(`✅ Conversation saved: ${sessionId}`);
    res.json(conversation);
  } catch (error) {
    console.error('❌ Error saving conversation:', error);
    res.status(500).json({ error: 'Failed to save conversation', details: error.message });
  }
});

// GET /api/conversations - Get all conversations
app.get('/api/conversations', checkDBConnection, async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'MongoDB connection is not available. Please try again later.',
        conversations: [],
        total: 0
      });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    
    const conversations = await Conversation.find()
      .sort({ startedAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const total = await Conversation.countDocuments();
    
    res.json({
      conversations,
      total,
      limit,
      skip
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: error.message,
      conversations: [],
      total: 0
    });
  }
});

// GET /api/conversations/:sessionId - Get a specific conversation
app.get('/api/conversations/:sessionId', checkDBConnection, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ sessionId: req.params.sessionId });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// DELETE /api/conversations/:sessionId - Delete a conversation
app.delete('/api/conversations/:sessionId', checkDBConnection, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`🗑️  Attempting to delete conversation: ${sessionId}`);
    
    const result = await Conversation.findOneAndDelete({ sessionId });
    
    if (!result) {
      console.log(`❌ Conversation not found: ${sessionId}`);
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    console.log(`✅ Conversation deleted: ${sessionId}`);
    res.json({ message: 'Conversation deleted successfully', sessionId });
  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation', details: error.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Also accessible via your domain/IP on port ${PORT}`);
});