import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
// Note: In production, use environment variables for credentials.
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://datauser:Ozosoft12%40@cluster0.y92agb7.mongodb.net/ozosoft?appName=Cluster0";

// Connection options for better reliability
const mongoOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  retryWrites: true, // Automatically retry write operations
  retryReads: true, // Automatically retry read operations
};

// Connect to MongoDB with retry logic
const connectDB = async () => {
  let retries = 5;
  
  while (retries) {
    try {
      await mongoose.connect(MONGO_URI, mongoOptions);
      console.log('✅ Connected to MongoDB Atlas');
      break;
    } catch (err) {
      retries -= 1;
      console.error(`❌ MongoDB connection error (${5 - retries}/5):`, err.message);
      
      if (retries === 0) {
        console.error('❌ Could not connect to MongoDB after 5 attempts');
        // Continue running server even if MongoDB fails
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = (5 - retries) * 2000; // 2s, 4s, 6s, 8s
      console.log(`⏳ Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('👋 Mongoose connection closed through app termination');
  process.exit(0);
});

// Initialize connection
connectDB();

// Schema Definition
const SettingsSchema = new mongoose.Schema({
  id: { type: String, default: 'company_config' }, // Singleton ID
  name: String,
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
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database temporarily unavailable',
      message: 'Please try again in a moment' 
    });
  }
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  };
  
  res.json(healthStatus);
});

// GET /api/config - Retrieve company settings
app.get('/api/config', checkDBConnection, async (req, res) => {
  try {
    let settings = await Settings.findOne({ id: 'company_config' });
    
    // Return default empty object if nothing found (client handles defaults)
    if (!settings) {
      return res.status(404).json({ message: 'No configuration found' });
    }
    
    // Strip internal fields
    const { name, industry, tone, knowledgeBase } = settings;
    res.json({ name, industry, tone, knowledgeBase });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/config - Update company settings
app.post('/api/config', checkDBConnection, async (req, res) => {
  try {
    const { name, industry, tone, knowledgeBase } = req.body;
    
    const settings = await Settings.findOneAndUpdate(
      { id: 'company_config' },
      { 
        name, 
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
    res.status(500).json({ error: 'Failed to fetch conversations' });
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