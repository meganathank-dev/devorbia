import mongoose from 'mongoose';
import { models } from '../models/index.js';
import { assert, missing } from '../utils/errors.js';
const allowed = ['Employee', 'Department', 'Team', 'Project', 'Task', 'LeaveRequest', 'Notification', 'Activity'];
export function repository(ctx, name, session = null) {
  assert(ctx.organizationId && ctx.role !== 'SUPER_ADMIN', 403, 'An active organization is required.');
  assert(allowed.includes(name), 500, 'Invalid repository.');
  const model = models[name],
    orgId = new mongoose.Types.ObjectId(ctx.organizationId);
  const where = query => ({
    $and: [{
      organizationId: orgId
    }, query || {}]
  });
  const run = query => query.session(session).maxTimeMS(10000);
  return {
    async one(query, projection) {
      return run(model.findOne(where(query)).select(projection || '').lean());
    },
    async get(recordId, projection) {
      const record = await this.one({
        _id: recordId
      }, projection);
      if (!record) throw missing();
      return record;
    },
    async find(query = {}, {
      limit = 100,
      skip = 0,
      sort = {
        createdAt: -1
      },
      projection = ''
    } = {}) {
      assert(limit >= 1 && limit <= 10001, 500, 'Invalid internal query bound.');
      return run(model.find(where(query)).select(projection).sort(sort).skip(skip).limit(limit).lean());
    },
    async count(query = {}) {
      return run(model.countDocuments(where(query)));
    },
    async create(data) {
      return (await model.create([{
        ...data,
        organizationId: orgId
      }], {
        session
      }))[0].toObject();
    },
    async patch(recordId, revision, changes) {
      const record = await run(model.findOneAndUpdate(where({
        _id: recordId,
        revision
      }), {
        $set: changes,
        $inc: {
          revision: 1
        }
      }, {
        new: true,
        runValidators: true
      }).lean());
      assert(record, 409, 'This record changed. Refresh and try again.', 'REVISION_CONFLICT');
      return record;
    },
    async lock(recordId) {
      const record = await run(model.findOneAndUpdate(where({
        _id: recordId
      }), {
        $inc: {
          revision: 1
        }
      }, {
        new: true
      }).lean());
      if (!record) throw missing();
      return record;
    },
    async update(query, changes) {
      return run(model.updateMany(where(query), changes, {
        runValidators: true
      }));
    },
    async aggregate(stages) {
      return model.aggregate([{
        $match: {
          organizationId: orgId
        }
      }, ...stages]).session(session).option({
        maxTimeMS: 10000
      });
    }
  };
}
