import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { Mail, Organization, User } from '../models/index.js';
import { env, root } from '../config/env.js';
import { decrypt } from '../utils/security.js';
import { id, dayEnd } from '../utils/domain.js';
import { repository } from '../repositories/tenant.js';
import { notify } from './notifications.js';
import { contextFor } from './auth.js';
import { overview } from './intelligence.js';
let transport,
  mailRunning = false,
  alertsRunning = false;
export async function processMail() {
  if (mailRunning) return;
  mailRunning = true;
  try {
    for (let i = 0; i < 20; i++) {
      const now = new Date();
      const mail = await Mail.findOneAndUpdate({
        sentAt: null,
        attempts: {
          $lt: 5
        },
        availableAt: {
          $lte: now
        },
        $or: [{
          lockedUntil: null
        }, {
          lockedUntil: {
            $lt: now
          }
        }]
      }, {
        $set: {
          lockedUntil: new Date(Date.now() + 120000)
        },
        $inc: {
          attempts: 1
        }
      }, {
        new: true,
        sort: {
          createdAt: 1
        }
      }).lean();
      if (!mail) break;
      try {
        const text = decrypt(mail.encryptedBody, env.APP_SECRET);
        if (env.MAIL_TRANSPORT === 'file') {
          const dir = path.join(root, '.local-mail');
          await mkdir(dir, {
            recursive: true,
            mode: 0o700
          });
          await writeFile(path.join(dir, `${id(mail)}.eml`), `To: ${mail.to}\nSubject: ${mail.subject}\n\n${text}`, {
            mode: 0o600
          });
        } else {
          transport ||= nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE === 'true',
            requireTLS: env.SMTP_SECURE !== 'true',
            auth: env.SMTP_USER ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASSWORD
            } : undefined,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
          });
          await transport.sendMail({
            from: env.MAIL_FROM,
            to: mail.to,
            subject: mail.subject,
            text
          });
        }
        await Mail.updateOne({
          _id: mail._id
        }, {
          $set: {
            sentAt: new Date(),
            lockedUntil: null,
            lastError: ''
          }
        });
      } catch (error) {
        await Mail.updateOne({
          _id: mail._id
        }, {
          $set: {
            lockedUntil: null,
            availableAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** mail.attempts)),
            lastError: String(error.code || 'DELIVERY_FAILED').slice(0, 100)
          }
        });
      }
    }
  } finally {
    mailRunning = false;
  }
}
export async function sendAlerts() {
  if (alertsRunning) return;
  alertsRunning = true;
  try {
    const day = new Date().toISOString().slice(0, 10);
    for await (const org of Organization.find({
      active: true
    }).select('_id').cursor({
      batchSize: 10
    })) {
      const user = await User.findOne({
        organizationId: org._id,
        role: 'ORGANIZATION_ADMIN',
        status: 'ACTIVE'
      }).lean();
      if (!user) continue;
      try {
        const ctx = await contextFor(user),
          limit = 200;
        let last;
        const inactive = await repository(ctx, 'Project').find({
          $or: [{
            archived: true
          }, {
            status: 'CANCELLED'
          }]
        }, {
          limit: 10001,
          projection: '_id'
        });
        if (inactive.length > 10000) continue;
        for (;;) {
          const query = {
            status: {
              $ne: 'DONE'
            },
            projectId: {
              $nin: inactive.map(p => p._id)
            },
            assigneeId: {
              $ne: null
            },
            dueDate: {
              $lte: new Date(Date.now() + 2 * 86400000)
            }
          };
          if (last) query._id = {
            $gt: last
          };
          const tasks = await repository(ctx, 'Task').find(query, {
            limit,
            sort: {
              _id: 1
            }
          });
          for (const task of tasks) {
            const title = dayEnd(task.dueDate) < new Date() ? 'Task overdue' : 'Task deadline approaching';
            await notify(ctx, [task.assigneeId], {
              title,
              message: task.title,
              path: `/app/tasks?task=${id(task)}`,
              eventKey: `deadline:${id(task)}:${day}`
            });
          }
          if (tasks.length < limit) break;
          last = tasks.at(-1)._id;
        }
        const data = await overview(ctx);
        for (const load of data.workload.filter(x => x.overloaded)) await notify(ctx, [load.employeeId], {
          title: 'Capacity needs attention',
          message: `Planned work is ${load.usage}% of your available capacity in the next 14 days.`,
          path: '/app/workload',
          eventKey: `load:${load.employeeId}:${day}`
        });
        for (const risk of data.health.filter(x => x.level === 'HIGH_RISK')) {
          const project = await repository(ctx, 'Project').get(risk.projectId);
          await notify(ctx, [project.managerId], {
            title: 'Project risk warning',
            message: `${project.name}: ${risk.reasons.join(' ')}`.slice(0, 1000),
            path: `/app/projects/${risk.projectId}`,
            eventKey: `risk:${risk.projectId}:${day}`
          });
        }
      } catch (error) {
        console.error(JSON.stringify({
          event: 'alert_job_failed',
          organizationId: id(org),
          code: error.code || 'JOB_FAILED'
        }));
      }
    }
  } finally {
    alertsRunning = false;
  }
}
export function startJobs() {
  if (env.JOBS_ENABLED !== 'true') return () => {};
  const safely = fn => fn().catch(() => console.error(JSON.stringify({
    event: 'background_job_failed'
  })));
  const mail = setInterval(() => safely(processMail), 10000),
    alerts = setInterval(() => safely(sendAlerts), 3600000);
  const initial = setTimeout(() => {
    safely(processMail);
    safely(sendAlerts);
  }, 3000);
  return () => {
    clearInterval(mail);
    clearInterval(alerts);
    clearTimeout(initial);
    transport?.close();
  };
}
