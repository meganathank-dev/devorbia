import { User, Employee, Organization, Session, ActionToken, Mail } from '../models/index.js';
export const identity = {
  userByEmail: (email, session) => User.findOne({
    email
  }).select('+passwordHash').session(session || null).lean(),
  userById: (id, session) => User.findById(id).session(session || null).lean(),
  organization: (id, session) => Organization.findById(id).session(session || null).lean(),
  employee: (userId, organizationId, session) => Employee.findOne({
    userId,
    organizationId
  }).session(session || null).lean(),
  createUser: async (data, session) => (await User.create([data], {
    session
  }))[0].toObject(),
  updateUser: (id, data, session) => User.updateOne({
    _id: id
  }, {
    $set: data
  }, {
    session,
    runValidators: true
  }),
  revoke: (userId, session) => Session.deleteMany({
    userId
  }, {
    session
  }),
  sessionByAccess: accessDigest => Session.findOne({
    accessDigest,
    accessExpiresAt: {
      $gt: new Date()
    },
    expiresAt: {
      $gt: new Date()
    }
  }).lean(),
  createSession: data => Session.create(data),
  rotateSession: (refreshDigest, data) => Session.findOneAndUpdate({
    refreshDigest,
    expiresAt: {
      $gt: new Date()
    }
  }, {
    $set: {
      ...data,
      previousRefreshDigest: refreshDigest
    }
  }, {
    new: true
  }).lean(),
  revokeReplay: previousRefreshDigest => Session.deleteMany({
    previousRefreshDigest
  }),
  removeSession: sessionId => Session.deleteOne({
    _id: sessionId
  }),
  clearTokens: (userId, purpose, session) => ActionToken.deleteMany({
    userId,
    purpose
  }, {
    session
  }),
  createToken: (data, session) => ActionToken.create([data], {
    session
  }),
  consumeToken: (digest, purpose, session) => ActionToken.findOneAndDelete({
    digest,
    purpose,
    expiresAt: {
      $gt: new Date()
    }
  }, {
    session
  }).lean(),
  enqueue: (data, session) => Mail.updateOne({
    eventKey: data.eventKey
  }, {
    $setOnInsert: data
  }, {
    upsert: true,
    session
  })
};
