import mongoose from 'mongoose';
import { Organization, User, Employee, Session } from '../models/index.js';
import { identity } from '../repositories/identity.js';
import { repository } from '../repositories/tenant.js';
import { transaction, tenantTransaction } from '../config/database.js';
import { issueActionToken } from './auth.js';
import { requireEmployee } from './resources.js';
import { activity } from './notifications.js';
import { assert, missing } from '../utils/errors.js';
import { same } from '../utils/domain.js';
import { verifyPassword } from '../utils/security.js';
export async function listOrganizations(ctx, q) {
  assert(ctx.role === 'SUPER_ADMIN', 403, 'Platform access required.');
  const where = q.q ? {
    name: {
      $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      $options: 'i'
    }
  } : {};
  const [items, total, totalUsers, activeOrganizations] = await Promise.all([Organization.find(where).sort({
    createdAt: -1
  }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Organization.countDocuments(where), User.countDocuments({
    role: {
      $ne: 'SUPER_ADMIN'
    }
  }), Organization.countDocuments({
    active: true
  })]);
  const counts = await User.aggregate([{
    $match: {
      organizationId: {
        $in: items.map(x => x._id)
      }
    }
  }, {
    $group: {
      _id: '$organizationId',
      count: {
        $sum: 1
      }
    }
  }]);
  return {
    items: items.map(x => ({
      ...x,
      userCount: counts.find(c => same(c._id, x._id))?.count || 0
    })),
    total,
    page: q.page,
    limit: q.limit,
    pages: Math.ceil(total / q.limit),
    totalUsers,
    activeOrganizations
  };
}
export async function createOrganization(ctx, data) {
  assert(ctx.role === 'SUPER_ADMIN', 403, 'Platform access required.');
  return transaction(async session => {
    const {
      adminName,
      adminEmail,
      ...orgData
    } = data;
    const adminUserId = new mongoose.Types.ObjectId();
    const org = (await Organization.create([{
      ...orgData,
      adminUserId
    }], {
      session
    }))[0].toObject();
    const user = await identity.createUser({
      _id: adminUserId,
      organizationId: org._id,
      name: adminName,
      email: adminEmail,
      role: 'ORGANIZATION_ADMIN'
    }, session);
    await Employee.create([{
      organizationId: org._id,
      userId: user._id,
      name: adminName,
      email: adminEmail,
      role: 'ORGANIZATION_ADMIN',
      jobTitle: 'Organization Administrator'
    }], {
      session
    });
    await issueActionToken(user, 'INVITATION', session);
    return org;
  });
}
export async function updateOrganization(ctx, recordId, data) {
  assert(ctx.role === 'SUPER_ADMIN', 403, 'Platform access required.');
  return transaction(async session => {
    const {
      revision,
      ...changes
    } = data;
    const org = await Organization.findOneAndUpdate({
      _id: recordId,
      revision
    }, {
      $set: changes,
      $inc: {
        revision: 1
      }
    }, {
      new: true,
      runValidators: true,
      session
    }).lean();
    assert(org, 409, 'This organization changed or is unavailable. Refresh and try again.');
    if (changes.active === false) {
      const users = await User.find({
        organizationId: recordId
      }).select('_id').session(session).limit(10001).lean();
      assert(users.length <= 10000, 413, 'Organization user count exceeds the supported administrative batch.');
      await Session.deleteMany({
        userId: {
          $in: users.map(x => x._id)
        }
      }, {
        session
      });
    }
    return org;
  });
}
export async function resendAdminInvitation(ctx, recordId) {
  assert(ctx.role === 'SUPER_ADMIN', 403, 'Platform access required.');
  return transaction(async session => {
    const user = await User.findOne({
      organizationId: recordId,
      role: 'ORGANIZATION_ADMIN',
      status: 'INVITED'
    }).session(session).lean();
    if (!user) throw missing();
    await issueActionToken(user, 'INVITATION', session);
    return {
      message: 'Administrator invitation queued.'
    };
  });
}
export async function saveSettings(ctx, data) {
  assert(ctx.role === 'ORGANIZATION_ADMIN', 403, 'Only the organization administrator can change settings.');
  return tenantTransaction(ctx, async session => {
    await requireEmployee(ctx, data.leaveDelegateId, session, ['PROJECT_MANAGER']);
    const {
      revision,
      ...changes
    } = data;
    const org = await Organization.findOneAndUpdate({
      _id: ctx.organizationId,
      revision
    }, {
      $set: changes,
      $inc: {
        revision: 1
      }
    }, {
      new: true,
      runValidators: true,
      session
    }).lean();
    assert(org, 409, 'Organization settings changed. Refresh and try again.');
    await activity(ctx, 'Organization settings updated', 'Organization', org, session);
    return org;
  });
}
export async function transferAdmin(ctx, {
  employeeId,
  password
}) {
  assert(ctx.role === 'ORGANIZATION_ADMIN', 403, 'Only the current administrator can transfer administration.');
  const current = await identity.userByEmail(ctx.user.email);
  assert(await verifyPassword(password, current.passwordHash), 401, 'Your password is incorrect.');
  assert(!same(employeeId, ctx.employeeId), 422, 'Choose another employee.');
  await tenantTransaction(ctx, async session => {
    const employee = await requireEmployee(ctx, employeeId, session, ['PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE']);
    assert(!(await repository(ctx, 'Team', session).count({
      leaderId: employeeId,
      archived: false
    })), 409, 'Assign another team leader before transferring administration.');
    assert(!(await repository(ctx, 'Project', session).count({
      managerId: employeeId,
      archived: false
    })), 409, 'Assign another project manager before transferring administration.');
    await Organization.updateOne({
      _id: ctx.organizationId,
      adminUserId: ctx.userId
    }, {
      $inc: {
        revision: 1
      },
      $set: {
        adminUserId: employee.userId,
        leaveDelegateId: ctx.employeeId
      }
    }, {
      session
    });
    await identity.updateUser(ctx.userId, {
      role: 'PROJECT_MANAGER'
    }, session);
    await identity.updateUser(employee.userId, {
      role: 'ORGANIZATION_ADMIN'
    }, session);
    await repository(ctx, 'Employee', session).update({
      reportsToId: ctx.employeeId,
      _id: {
        $ne: employeeId
      }
    }, {
      $set: {
        reportsToId: employeeId
      },
      $inc: {
        revision: 1
      }
    });
    await repository(ctx, 'Employee', session).update({
      _id: ctx.employeeId
    }, {
      $set: {
        role: 'PROJECT_MANAGER',
        reportsToId: employeeId
      },
      $inc: {
        revision: 1
      }
    });
    await repository(ctx, 'Employee', session).update({
      _id: employeeId
    }, {
      $set: {
        role: 'ORGANIZATION_ADMIN',
        reportsToId: null
      },
      $inc: {
        revision: 1
      }
    });
    await identity.revoke(ctx.userId, session);
    await identity.revoke(employee.userId, session);
    await activity(ctx, 'Administrator transferred', 'Employee', employee, session);
  });
  return {
    message: 'Administration transferred. Both users must sign in again.'
  };
}
