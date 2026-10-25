import { identity } from '../repositories/identity.js';
import { repository } from '../repositories/tenant.js';
import { transaction } from '../config/database.js';
import { env } from '../config/env.js';
import { assert } from '../utils/errors.js';
import { id } from '../utils/domain.js';
import { randomToken, digest, verifyPassword, hashPassword, encrypt } from '../utils/security.js';
const ACCESS_MS = 15 * 60000,
  REFRESH_MS = 7 * 86400000;
let dummyHash;
async function activeUser(user) {
  assert(user && user.status === 'ACTIVE', 401, 'Your session is unavailable. Please sign in.', 'UNAUTHENTICATED');
  if (user.role !== 'SUPER_ADMIN') {
    const org = await identity.organization(user.organizationId);
    assert(org?.active, 403, 'Your organization access is inactive. Contact your administrator.');
    assert(user.role === 'ORGANIZATION_ADMIN' === (id(org.adminUserId) === id(user)), 403, 'Administrator ownership changed. Please sign in again.');
  }
  return user;
}
export async function contextFor(user) {
  await activeUser(user);
  const base = {
    userId: id(user),
    organizationId: id(user.organizationId),
    role: user.role,
    employeeId: null,
    teamIds: [],
    ledTeamIds: []
  };
  if (user.role === 'SUPER_ADMIN') return {
    ...base,
    user: {
      _id: id(user),
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
  const [employee, organization] = await Promise.all([identity.employee(user._id, user.organizationId), identity.organization(user.organizationId)]);
  assert(employee?.status === 'ACTIVE', 403, 'Your employee profile is inactive.');
  base.employeeId = id(employee);
  base.teamIds = employee.teamId ? [id(employee.teamId)] : [];
  if (user.role === 'TEAM_LEADER') {
    const teams = await repository(base, 'Team').find({
      leaderId: employee._id,
      archived: false
    }, {
      limit: 100
    });
    base.ledTeamIds = teams.map(id);
    base.teamIds = [...new Set([...base.teamIds, ...base.ledTeamIds])];
  }
  return {
    ...base,
    employee,
    organization,
    user: {
      _id: id(user),
      name: employee.name,
      email: user.email,
      role: user.role,
      employeeId: id(employee),
      organizationId: id(organization),
      organizationName: organization.name
    }
  };
}
function newSecrets() {
  const access = randomToken(),
    refresh = randomToken(),
    csrf = randomToken();
  return {
    access,
    refresh,
    csrf,
    stored: {
      accessDigest: digest(access),
      refreshDigest: digest(refresh),
      csrf,
      accessExpiresAt: new Date(Date.now() + ACCESS_MS)
    }
  };
}
export async function login({
  email,
  password
}) {
  const user = await identity.userByEmail(email);
  dummyHash ||= hashPassword(randomToken());
  const verified = await verifyPassword(password, user?.passwordHash || (await dummyHash));
  assert(verified && user?.status === 'ACTIVE', 401, 'Email or password is incorrect, or your invitation has not been accepted.', 'INVALID_CREDENTIALS');
  const context = await contextFor(user),
    secrets = newSecrets();
  await identity.createSession({
    ...secrets.stored,
    userId: user._id,
    expiresAt: new Date(Date.now() + REFRESH_MS)
  });
  return {
    ...secrets,
    user: context.user
  };
}
export async function authenticate(access) {
  assert(typeof access === 'string' && access.length < 100, 401, 'Please sign in.', 'UNAUTHENTICATED');
  const session = await identity.sessionByAccess(digest(access));
  assert(session, 401, 'Your session has expired.', 'UNAUTHENTICATED');
  const user = await identity.userById(session.userId);
  return {
    context: await contextFor(user),
    session
  };
}
export async function refresh(token) {
  assert(typeof token === 'string' && token.length < 100, 401, 'Please sign in again.', 'UNAUTHENTICATED');
  const secrets = newSecrets(),
    session = await identity.rotateSession(digest(token), secrets.stored);
  if (!session) {
    await identity.revokeReplay(digest(token));
    assert(false, 401, 'Please sign in again.', 'UNAUTHENTICATED');
  }
  const user = await identity.userById(session.userId);
  try {
    const context = await contextFor(user);
    return {
      ...secrets,
      user: context.user,
      refreshMaxAge: Math.max(0, new Date(session.expiresAt) - Date.now())
    };
  } catch (error) {
    await identity.removeSession(session._id);
    throw error;
  }
}
export async function issueActionToken(user, purpose, session) {
  const token = randomToken();
  await identity.clearTokens(user._id, purpose, session);
  await identity.createToken({
    userId: user._id,
    digest: digest(token),
    purpose,
    expiresAt: new Date(Date.now() + (purpose === 'RESET' ? 3600000 : 72 * 3600000))
  }, session);
  const route = purpose === 'RESET' ? 'reset-password' : 'accept-invitation';
  const url = `${env.CLIENT_URL}/${route}#token=${token}`;
  const subject = purpose === 'RESET' ? 'Reset your DevOrbia password' : 'You are invited to DevOrbia';
  await identity.enqueue({
    organizationId: user.organizationId,
    to: user.email,
    subject,
    encryptedBody: encrypt(`Hello ${user.name},\n\n${subject}:\n${url}\n\nThis link is single-use and expires in ${purpose === 'RESET' ? 'one hour' : '72 hours'}. If you did not expect this message, ignore it.`, env.APP_SECRET),
    eventKey: `${purpose}:${digest(token)}`
  }, session);
}
export async function forgotPassword({
  email
}) {
  const user = await identity.userByEmail(email);
  if (user?.status === 'ACTIVE') {
    const org = user.role === 'SUPER_ADMIN' ? {
      active: true
    } : await identity.organization(user.organizationId);
    if (org?.active) await transaction(session => issueActionToken(user, 'RESET', session));
  }
  return {
    message: 'If an active account exists, password recovery instructions have been queued.'
  };
}
export async function acceptToken({
  token,
  password
}, purpose) {
  const passwordHash = await hashPassword(password);
  await transaction(async session => {
    const record = await identity.consumeToken(digest(token), purpose, session);
    assert(record, 400, 'This link is invalid or expired. Request a new link.');
    const user = await identity.userById(record.userId, session);
    assert(user && user.status === (purpose === 'INVITATION' ? 'INVITED' : 'ACTIVE'), 400, 'This link is no longer valid.');
    if (user.role !== 'SUPER_ADMIN') assert((await identity.organization(user.organizationId, session))?.active, 403, 'Organization access is inactive.');
    await identity.updateUser(user._id, {
      passwordHash,
      status: 'ACTIVE',
      passwordChangedAt: new Date()
    }, session);
    if (user.organizationId) await repository({
      organizationId: id(user.organizationId),
      role: user.role
    }, 'Employee', session).update({
      userId: user._id
    }, {
      $set: {
        status: 'ACTIVE'
      },
      $inc: {
        revision: 1
      }
    });
    await identity.revoke(user._id, session);
    await identity.clearTokens(user._id, 'RESET', session);
    await identity.clearTokens(user._id, 'INVITATION', session);
  });
  return {
    message: 'Your password is set. You can now sign in.'
  };
}
export const logout = sessionId => identity.removeSession(sessionId);
export function writeCookies(res, secrets) {
  const common = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1'
  };
  res.cookie('do_access', secrets.access, {
    ...common,
    maxAge: ACCESS_MS
  });
  res.cookie('do_refresh', secrets.refresh, {
    ...common,
    path: '/api/v1/auth',
    maxAge: secrets.refreshMaxAge ?? REFRESH_MS
  });
  res.cookie('do_csrf', secrets.csrf, {
    secure: common.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: secrets.refreshMaxAge ?? REFRESH_MS
  });
}
export function clearCookies(res) {
  const common = {
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax'
  };
  res.clearCookie('do_access', {
    ...common,
    httpOnly: true,
    path: '/api/v1'
  });
  res.clearCookie('do_refresh', {
    ...common,
    httpOnly: true,
    path: '/api/v1/auth'
  });
  res.clearCookie('do_csrf', {
    ...common,
    path: '/'
  });
}
