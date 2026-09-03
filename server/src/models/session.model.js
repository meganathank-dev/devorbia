const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Automatically remove document when expiresAt is reached
      index: { expires: 0 },
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find a specific session by user and tokenHash
sessionSchema.index({ user: 1, tokenHash: 1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
