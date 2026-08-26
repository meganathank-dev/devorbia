const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not defined in environment variables.');
    // Don't throw immediately, let the application run without DB for Phase 0 health checks if DB is not available
    // throw new Error('MONGODB_URI is required');
    console.warn('Running without MongoDB connection for Phase 0 demonstration purposes.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Only warn to allow application startup even if DB is unreachable in Phase 0
    console.warn('MongoDB is not available. Some features will not work.');
  }
};

module.exports = { connectDB };
