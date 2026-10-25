import { repository } from '../repositories/tenant.js';
import { identity } from '../repositories/identity.js';
import { tenantTransaction } from '../config/database.js';
import { activity, notify } from './notifications.js';
import { id, same, utcDay, workdays, mayApproveLeave } from '../utils/domain.js';
import { assert, missing } from '../utils/errors.js';
export async function leaveScope(ctx, session) {
  if (ctx.role === 'ORGANIZATION_ADMIN') return {};
  const reports = await repository(ctx, 'Employee', session).find({
    reportsToId: ctx.employeeId
  }, {
    limit: 501
  });
  const permitted = reports.filter(e => mayApproveLeave(ctx, e, ctx.organization)).map(id);
  if (same(ctx.organization.leaveDelegateId, ctx.employeeId)) {
    const admin = await repository(ctx, 'Employee', session).one({
      role: 'ORGANIZATION_ADMIN'
    });
    if (admin) permitted.push(id(admin));
  }
  return {
    employeeId: {
      $in: [ctx.employeeId, ...permitted]
    }
  };
}
async function approvers(ctx, requester, session) {
  const managers = await repository(ctx, 'Employee', session).find({
    status: 'ACTIVE',
    $or: [{
      role: 'ORGANIZATION_ADMIN'
    }, {
      _id: requester.reportsToId
    }, {
      _id: ctx.organization.leaveDelegateId
    }]
  }, {
    limit: 10
  });
  return managers.filter(e => mayApproveLeave({
    ...ctx,
    employeeId: id(e),
    role: e.role
  }, requester, ctx.organization));
}
export async function listLeave(ctx, q) {
  const where = await leaveScope(ctx);
  if (q.status) {
    assert(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(q.status), 422, 'Invalid leave status.');
    where.status = q.status;
  }
  const repo = repository(ctx, 'LeaveRequest');
  const [items, total] = await Promise.all([repo.find(where, {
    limit: q.limit,
    skip: (q.page - 1) * q.limit
  }), repo.count(where)]);
  const employees = await repository(ctx, 'Employee').find({
    _id: {
      $in: items.map(item => item.employeeId)
    }
  }, {
    limit: q.limit
  });
  const byId = new Map(employees.map(employee => [id(employee), employee]));
  const enriched = items.map(item => {
    const employee = byId.get(id(item.employeeId));
    return {
      ...item,
      employeeName: employee?.name || 'Unavailable employee',
      canApprove: Boolean(employee && mayApproveLeave(ctx, employee, ctx.organization))
    };
  });
  return {
    items: enriched,
    total,
    page: q.page,
    limit: q.limit,
    pages: Math.ceil(total / q.limit)
  };
}
export async function balance(ctx, employeeId = ctx.employeeId, session) {
  const year = new Date().getUTCFullYear(),
    start = new Date(`${year}-01-01`),
    end = new Date(`${year + 1}-01-01`);
  const totals = await repository(ctx, 'LeaveRequest', session).aggregate([{
    $match: {
      employeeId: (await repository(ctx, 'Employee', session).get(employeeId))._id,
      type: 'PAID',
      startDate: {
        $gte: start,
        $lt: end
      },
      status: {
        $in: ['PENDING', 'APPROVED']
      }
    }
  }, {
    $group: {
      _id: '$status',
      days: {
        $sum: '$days'
      }
    }
  }]);
  const approved = totals.find(t => t._id === 'APPROVED')?.days || 0,
    pending = totals.find(t => t._id === 'PENDING')?.days || 0;
  return {
    year,
    entitlement: ctx.organization.settings.annualLeaveDays,
    approved,
    pending,
    available: Math.max(0, ctx.organization.settings.annualLeaveDays - approved)
  };
}
export async function createLeave(ctx, data) {
  return tenantTransaction(ctx, async session => {
    const requester = await repository(ctx, 'Employee', session).lock(ctx.employeeId);
    assert(utcDay(data.startDate) >= utcDay(new Date()), 422, 'New leave must start today or later.');
    assert(new Date(data.startDate).getUTCFullYear() === new Date(data.endDate).getUTCFullYear(), 422, 'Split requests that cross calendar years.');
    const days = workdays(data.startDate, data.endDate, ctx.organization.settings.workingDays);
    assert(days > 0 && days <= 60, 422, 'Choose between 1 and 60 working days.');
    const overlap = await repository(ctx, 'LeaveRequest', session).count({
      employeeId: ctx.employeeId,
      status: {
        $in: ['PENDING', 'APPROVED']
      },
      startDate: {
        $lte: new Date(data.endDate)
      },
      endDate: {
        $gte: new Date(data.startDate)
      }
    });
    assert(!overlap, 409, 'This overlaps an existing pending or approved leave request.');
    const recipients = await approvers(ctx, requester, session);
    assert(recipients.length, 422, 'Ask the organization administrator to configure an eligible leave approver.');
    const record = await repository(ctx, 'LeaveRequest', session).create({
      ...data,
      employeeId: ctx.employeeId,
      days
    });
    await activity(ctx, 'Leave requested', 'LeaveRequest', record, session);
    await notify(ctx, recipients.map(id), {
      title: 'Leave approval requested',
      message: `${requester.name} requested ${days} working day(s) of leave.`,
      path: '/app/leave',
      eventKey: `leave:${id(record)}:0`
    }, session);
    return record;
  });
}
export async function decideLeave(ctx, recordId, data) {
  return tenantTransaction(ctx, async session => {
    const repo = repository(ctx, 'LeaveRequest', session),
      record = await repo.get(recordId);
    const requester = await repository(ctx, 'Employee', session).lock(id(record.employeeId));
    const own = same(requester, ctx.employeeId),
      canApprove = mayApproveLeave(ctx, requester, ctx.organization);
    if (!own && !canApprove) throw missing();
    assert(data.revision === record.revision, 409, 'This request changed. Refresh and try again.');
    if (data.status === 'CANCELLED') {
      assert(own, 403, 'Only the requester can cancel leave.');
      assert(record.status === 'PENDING' || record.status === 'APPROVED' && utcDay(record.startDate) > utcDay(new Date()), 409, 'Only pending requests or future approved leave can be cancelled.');
    } else {
      assert(canApprove, 403, 'You cannot approve your own leave or leave outside your reporting authority.');
      assert(record.status === 'PENDING', 409, 'This request already has a decision.');
      if (data.status === 'REJECTED') assert(data.decisionNote.trim().length >= 4, 422, 'Provide a short reason for rejecting this request.');
      if (data.status === 'APPROVED' && record.type === 'PAID') {
        const year = new Date(record.startDate).getUTCFullYear();
        const existing = await repo.aggregate([{
          $match: {
            employeeId: record.employeeId,
            type: 'PAID',
            status: 'APPROVED',
            startDate: {
              $gte: new Date(`${year}-01-01`),
              $lt: new Date(`${year + 1}-01-01`)
            }
          }
        }, {
          $group: {
            _id: null,
            days: {
              $sum: '$days'
            }
          }
        }]);
        const organization = await identity.organization(ctx.organizationId, session);
        assert((existing[0]?.days || 0) + record.days <= organization.settings.annualLeaveDays, 422, 'Paid leave entitlement would be exceeded. Discuss another leave type or update the policy.');
      }
    }
    const updated = await repo.patch(recordId, data.revision, {
      status: data.status,
      decisionNote: data.decisionNote,
      decidedBy: ctx.employeeId,
      decidedAt: new Date()
    });
    await activity(ctx, `Leave ${data.status.toLowerCase()}`, 'LeaveRequest', updated, session);
    await notify(ctx, [requester._id, ...(await approvers(ctx, requester, session)).map(id)], {
      title: `Leave ${data.status.toLowerCase()}`,
      message: `${requester.name} · ${new Date(record.startDate).toISOString().slice(0, 10)} to ${new Date(record.endDate).toISOString().slice(0, 10)}. ${data.decisionNote}`,
      path: '/app/leave',
      eventKey: `leave:${recordId}:${updated.revision}`
    }, session);
    return updated;
  });
}
