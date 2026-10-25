import { env } from '../config/env.js';
import { authenticate } from '../services/auth.js';
import { assert } from '../utils/errors.js';
export function mutationGuard(req, _res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    assert(req.get('X-Requested-With') === 'DevOrbia', 403, 'Missing request verification header.', 'CSRF_REJECTED');
    const origin = req.get('Origin');
    assert(!origin || origin === new URL(env.CLIENT_URL).origin, 403, 'This request origin is not allowed.', 'CSRF_REJECTED');
    assert(req.get('Sec-Fetch-Site') !== 'cross-site', 403, 'Cross-site requests are not supported.', 'CSRF_REJECTED');
  }
  next();
}
export async function requireAuth(req, _res, next) {
  const {
    context,
    session
  } = await authenticate(req.cookies.do_access);
  req.ctx = context;
  req.authSession = session;
  if (!['GET', 'HEAD'].includes(req.method)) assert(req.get('X-CSRF-Token') === session.csrf && req.cookies.do_csrf === session.csrf, 403, 'Session verification failed. Reload and try again.', 'CSRF_REJECTED');
  next();
}
export const roles = (...allowed) => (req, _res, next) => {
  assert(allowed.includes(req.ctx.role), 403, 'You do not have permission for this action.');
  next();
};
export const tenant = (req, _res, next) => {
  assert(req.ctx.organizationId && req.ctx.role !== 'SUPER_ADMIN', 403, 'This workspace is for organization members.');
  next();
};
