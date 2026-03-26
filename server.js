require('dotenv').config(); // Load env variables

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Use env variables
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MONGODB_URL = process.env.MONGODB_URL;

// Validate env variables (important!)
if (!ADMIN_PASSWORD || !MONGODB_URL) {
  console.error('❌ Missing environment variables. Check your .env file.');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URL, { dbName: 'Send2T' })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Message schema
const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname))); // safer path

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

// POST — send message
app.post('/api/messages', async (req, res) => {
  try {
    const { content } = req.body || {};

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    await Message.create({ content: content.trim() });

    res.status(201).json({ success: true, message: 'Message sent!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET — admin fetch messages
app.get('/api/messages', async (req, res) => {
  try {
    if (req.query.password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await Message.find().sort({ createdAt: 1 });

    res.json({
      messages: messages.map(m => ({
        id: m._id,
        content: m.content,
        createdAt: m.createdAt.toISOString()
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE — admin delete message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    if (req.query.password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deleted = await Message.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message: 'Message deleted' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running`);
});
