import mongoose from 'mongoose';
import { ROLES, STATUSES, PRIORITIES } from '../utils/domain.js';
const {
  Schema
} = mongoose;
const ref = (name, required = false) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required,
  default: required ? undefined : null
});
const refs = name => [{
  type: Schema.Types.ObjectId,
  ref: name
}];
const tenant = {
  organizationId: ref('Organization', true),
  revision: {
    type: Number,
    default: 0,
    min: 0
  }
};
const text = (max, required = false) => ({
  type: String,
  trim: true,
  maxlength: max,
  required,
  default: required ? undefined : ''
});
function model(name, fields, indexes = []) {
  const schema = new Schema(fields, {
    timestamps: true,
    strict: 'throw',
    versionKey: false
  });
  for (const [keys, options] of indexes) schema.index(keys, options || {});
  return mongoose.models[name] || mongoose.model(name, schema);
}
export const Organization = model('Organization', {
  name: text(120, true),
  slug: {
    ...text(50, true),
    lowercase: true
  },
  description: text(2000),
  email: text(254),
  website: text(300),
  logoUrl: text(300),
  active: {
    type: Boolean,
    default: true
  },
  revision: {
    type: Number,
    default: 0
  },
  operationVersion: {
    type: Number,
    default: 0
  },
  adminUserId: ref('User', true),
  settings: {
    hoursPerDay: {
      type: Number,
      default: 8
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5]
    },
    annualLeaveDays: {
      type: Number,
      default: 20
    }
  },
  leaveDelegateId: ref('Employee')
}, [[{
  slug: 1
}, {
  unique: true
}], [{
  adminUserId: 1
}, {
  unique: true
}]]);
export const User = model('User', {
  organizationId: ref('Organization'),
  email: {
    ...text(254, true),
    lowercase: true
  },
  role: {
    type: String,
    enum: ROLES,
    required: true
  },
  status: {
    type: String,
    enum: ['INVITED', 'ACTIVE', 'DISABLED'],
    default: 'INVITED'
  },
  passwordHash: {
    type: String,
    select: false
  },
  name: text(100, true),
  passwordChangedAt: Date
}, [[{
  email: 1
}, {
  unique: true
}], [{
  role: 1
}, {
  unique: true,
  partialFilterExpression: {
    role: 'SUPER_ADMIN'
  }
}], [{
  organizationId: 1,
  role: 1
}]]);
export const Employee = model('Employee', {
  ...tenant,
  userId: ref('User', true),
  name: text(100, true),
  email: text(254, true),
  jobTitle: text(120),
  role: {
    type: String,
    enum: ROLES.slice(1),
    required: true
  },
  status: {
    type: String,
    enum: ['INVITED', 'ACTIVE', 'DISABLED'],
    default: 'INVITED'
  },
  departmentId: ref('Department'),
  teamId: ref('Team'),
  reportsToId: ref('Employee'),
  skills: {
    type: [String],
    default: []
  },
  experienceYears: {
    type: Number,
    default: 0,
    min: 0,
    max: 60
  },
  hoursPerWeek: {
    type: Number,
    default: 40,
    min: 1,
    max: 80
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  profileImage: text(300)
}, [[{
  userId: 1
}, {
  unique: true
}], [{
  organizationId: 1,
  teamId: 1
}], [{
  organizationId: 1,
  departmentId: 1
}], [{
  organizationId: 1,
  status: 1
}]]);
export const Department = model('Department', {
  ...tenant,
  name: text(100, true),
  description: text(2000),
  headId: ref('Employee'),
  archived: {
    type: Boolean,
    default: false
  }
}, [[{
  organizationId: 1,
  name: 1
}, {
  unique: true
}]]);
export const Team = model('Team', {
  ...tenant,
  name: text(100, true),
  description: text(2000),
  departmentId: ref('Department', true),
  leaderId: ref('Employee'),
  archived: {
    type: Boolean,
    default: false
  }
}, [[{
  organizationId: 1,
  name: 1
}, {
  unique: true
}], [{
  organizationId: 1,
  departmentId: 1
}]]);
export const Project = model('Project', {
  ...tenant,
  name: text(150, true),
  code: {
    ...text(20, true),
    uppercase: true
  },
  description: text(5000),
  managerId: ref('Employee', true),
  teamIds: refs('Team'),
  memberIds: refs('Employee'),
  requiredSkills: [String],
  tags: [String],
  startDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: PRIORITIES,
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
    default: 'PLANNING'
  },
  archived: {
    type: Boolean,
    default: false
  },
  createdBy: ref('User', true),
  completedAt: Date
}, [[{
  organizationId: 1,
  code: 1
}, {
  unique: true
}], [{
  organizationId: 1,
  managerId: 1,
  status: 1
}], [{
  organizationId: 1,
  teamIds: 1
}], [{
  organizationId: 1,
  memberIds: 1
}]]);
export const Task = model('Task', {
  ...tenant,
  projectId: ref('Project', true),
  title: text(180, true),
  description: text(8000),
  assigneeId: ref('Employee'),
  teamId: ref('Team'),
  createdBy: ref('User', true),
  priority: {
    type: String,
    enum: PRIORITIES,
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: STATUSES,
    default: 'BACKLOG'
  },
  startDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  estimatedHours: {
    type: Number,
    default: 8,
    min: 0.25,
    max: 1000
  },
  remainingHours: {
    type: Number,
    default: 8,
    min: 0,
    max: 1000
  },
  complexity: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  requiredSkills: [String],
  tags: [String],
  dependencies: refs('Task'),
  blockedReason: text(1000),
  completedAt: Date,
  completedBy: ref('Employee'),
  completedAssigneeId: ref('Employee'),
  reopenedCount: {
    type: Number,
    default: 0
  }
}, [[{
  organizationId: 1,
  projectId: 1,
  status: 1
}], [{
  organizationId: 1,
  assigneeId: 1,
  status: 1,
  dueDate: 1
}], [{
  organizationId: 1,
  teamId: 1
}], [{
  organizationId: 1,
  dueDate: 1
}]]);
export const LeaveRequest = model('LeaveRequest', {
  ...tenant,
  employeeId: ref('Employee', true),
  type: {
    type: String,
    enum: ['PAID', 'SICK', 'UNPAID'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  days: {
    type: Number,
    required: true
  },
  reason: text(2000, true),
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },
  decisionNote: text(2000),
  decidedBy: ref('Employee'),
  decidedAt: Date
}, [[{
  organizationId: 1,
  employeeId: 1,
  startDate: 1,
  endDate: 1
}], [{
  organizationId: 1,
  status: 1
}]]);
export const Session = model('Session', {
  userId: ref('User', true),
  accessDigest: {
    type: String,
    required: true
  },
  refreshDigest: {
    type: String,
    required: true
  },
  previousRefreshDigest: String,
  csrf: {
    type: String,
    required: true
  },
  accessExpiresAt: {
    type: Date,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, [[{
  accessDigest: 1
}, {
  unique: true
}], [{
  refreshDigest: 1
}, {
  unique: true
}], [{
  previousRefreshDigest: 1
}], [{
  userId: 1
}], [{
  expiresAt: 1
}, {
  expireAfterSeconds: 0
}]]);
export const ActionToken = model('ActionToken', {
  userId: ref('User', true),
  digest: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['INVITATION', 'RESET'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, [[{
  digest: 1
}, {
  unique: true
}], [{
  userId: 1,
  purpose: 1
}], [{
  expiresAt: 1
}, {
  expireAfterSeconds: 0
}]]);
export const Notification = model('Notification', {
  ...tenant,
  userId: ref('User', true),
  title: text(180, true),
  message: text(1000, true),
  path: text(300),
  readAt: Date,
  eventKey: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 86400000)
  }
}, [[{
  userId: 1,
  eventKey: 1
}, {
  unique: true
}], [{
  organizationId: 1,
  userId: 1,
  createdAt: -1
}], [{
  expiresAt: 1
}, {
  expireAfterSeconds: 0
}]]);
export const Activity = model('Activity', {
  ...tenant,
  actorId: ref('User', true),
  action: text(100, true),
  resourceType: text(50, true),
  resourceId: ref('Project'),
  summary: text(500, true),
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 180 * 86400000)
  }
}, [[{
  organizationId: 1,
  createdAt: -1
}], [{
  expiresAt: 1
}, {
  expireAfterSeconds: 0
}]]);
export const Mail = model('Mail', {
  organizationId: ref('Organization'),
  to: text(254, true),
  subject: text(180, true),
  encryptedBody: {
    type: String,
    required: true
  },
  eventKey: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  availableAt: {
    type: Date,
    default: Date.now
  },
  lockedUntil: Date,
  sentAt: Date,
  lastError: text(300),
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 86400000)
  }
}, [[{
  eventKey: 1
}, {
  unique: true
}], [{
  sentAt: 1,
  availableAt: 1,
  lockedUntil: 1
}], [{
  expiresAt: 1
}, {
  expireAfterSeconds: 0
}]]);
export const models = {
  Organization,
  User,
  Employee,
  Department,
  Team,
  Project,
  Task,
  LeaveRequest,
  Session,
  ActionToken,
  Notification,
  Activity,
  Mail
};
