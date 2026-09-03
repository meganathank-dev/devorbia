const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Use the local system binary to bypass network download timeouts
process.env.MONGOMS_SYSTEM_BINARY = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';

let mongoServer;

/**
 * Connect to the in-memory database.
 */
const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri);
};

/**
 * Drop database, close the connection and stop mongod.
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Remove all data from all collections.
 */
const clearDB = async () => {
  if (mongoose.connection.readyState === 0) return;
  
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  clearDB,
};
