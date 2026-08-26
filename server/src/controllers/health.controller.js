const mongoose = require('mongoose');

const getHealthStatus = async (req, res, next) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    res.status(200).json({
      success: true,
      data: {
        status: 'UP',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: {
          connected: isDbConnected,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHealthStatus };
