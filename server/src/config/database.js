import mongoose from 'mongoose';
import { env } from './env.js';
import { models } from '../models/index.js';
import { assert } from '../utils/errors.js';
import { id, unique } from '../utils/domain.js';
export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10000,
    autoIndex: false
  });
  const hello = await mongoose.connection.db.admin().command({
    hello: 1
  });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MongoDB must use a replica set for atomic workflows. Use npm run db:local or MongoDB Atlas.');
  for (const model of Object.values(models)) await model.createIndexes();
}
export const transaction = fn => mongoose.connection.transaction(fn);
export const tenantTransaction = (ctx, fn) => transaction(async session => {
  // Serialize organizational writes to prevent membership/leave/workflow write skew.
  // Independent organizations and all reads remain concurrent.
  const org = await models.Organization.findOneAndUpdate({
    _id: ctx.organizationId,
    active: true
  }, {
    $inc: {
      operationVersion: 1
    }
  }, {
    new: true,
    session
  }).lean();
  assert(org, 403, 'Organization access is inactive.');
  const user = await models.User.findOne({
    _id: ctx.userId,
    organizationId: ctx.organizationId,
    status: 'ACTIVE',
    role: ctx.role
  }).session(session).lean();
  assert(user, 403, 'Your access changed. Sign in again.');
  const employee = await models.Employee.findOne({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    status: 'ACTIVE'
  }).session(session).lean();
  assert(employee, 403, 'Employee access is inactive.');
  if (ctx.role === 'ORGANIZATION_ADMIN') assert(id(org.adminUserId) === ctx.userId, 403, 'Administrator ownership changed.');
  const led = ctx.role === 'TEAM_LEADER' ? await models.Team.find({
    organizationId: ctx.organizationId,
    leaderId: employee._id,
    archived: false
  }).select('_id').limit(100).session(session).lean() : [];
  ctx.organization = org;
  ctx.employee = employee;
  ctx.employeeId = id(employee);
  ctx.ledTeamIds = led.map(id);
  ctx.teamIds = unique([employee.teamId, ...ctx.ledTeamIds]);
  return fn(session);
});
