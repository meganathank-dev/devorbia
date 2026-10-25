import { randomUUID } from 'node:crypto';
import { repository } from '../repositories/tenant.js';
import { identity } from '../repositories/identity.js';
import { env } from '../config/env.js';
import { encrypt } from '../utils/security.js';
import { id, unique } from '../utils/domain.js';
export async function activity(ctx, action, resourceType, resource, session) {
  return repository(ctx, 'Activity', session).create({
    actorId: ctx.userId,
    action,
    resourceType,
    resourceId: id(resource),
    summary: `${action}: ${resource.title || resource.name || resourceType}`
  });
}
export async function notify(ctx, employeeIds, {
  title,
  message,
  path = '',
  eventKey = randomUUID()
}, session) {
  const recipients = await repository(ctx, 'Employee', session).find({
    _id: {
      $in: unique(employeeIds)
    },
    status: 'ACTIVE'
  }, {
    limit: 500
  });
  for (const employee of recipients) {
    const key = `${eventKey}:${id(employee)}`;
    const repo = repository(ctx, 'Notification', session);
    if (!(await repo.one({
      userId: employee.userId,
      eventKey: key
    }))) await repo.create({
      userId: employee.userId,
      title,
      message,
      path,
      eventKey: key
    });
    await identity.enqueue({
      organizationId: ctx.organizationId,
      to: employee.email,
      subject: title,
      encryptedBody: encrypt(`${message}\n\n${env.CLIENT_URL}${path}`, env.APP_SECRET),
      eventKey: key
    }, session);
  }
}
