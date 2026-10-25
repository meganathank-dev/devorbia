import mongoose from 'mongoose';
import { User, Employee, Organization, Department, Team, Project, Task, LeaveRequest, Notification } from '../src/models/index.js';
import { hashPassword } from '../src/utils/security.js';
import { workdays, utcDay } from '../src/utils/domain.js';
export async function createFixtures({
  password,
  now = new Date(),
  session
} = {}) {
  const passwordHash = await hashPassword(password),
    newId = () => new mongoose.Types.ObjectId();
  const day = offset => new Date(utcDay(now).getTime() + offset * 86400000);
  const platform = (await User.create([{
    name: 'Platform Administrator',
    email: 'platform@example.test',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    passwordHash
  }], {
    session
  }))[0].toObject();
  const organizations = [];
  for (const [slug, name] of [['northstar', 'Northstar Labs'], ['keystone', 'Keystone Apps']]) {
    const adminId = newId(),
      org = (await Organization.create([{
        name,
        slug,
        email: `hello@${slug}.example.test`,
        description: `${name} demonstration workspace`,
        website: 'https://example.com',
        adminUserId: adminId
      }], {
        session
      }))[0].toObject();
    const defs = [['admin', 'Maya Raman', 'ORGANIZATION_ADMIN', 'Organization Administrator'], ['pm', 'Arjun Nair', 'PROJECT_MANAGER', 'Engineering Manager'], ['lead', 'Priya Shah', 'TEAM_LEADER', 'Platform Team Lead'], ['employee', 'Kavin Raj', 'EMPLOYEE', 'Full Stack Developer'], ['dev', 'Dev Iyer', 'EMPLOYEE', 'Backend Developer'], ['design', 'Nila Bose', 'EMPLOYEE', 'Frontend Developer'], ['pm2', 'Sana Ali', 'PROJECT_MANAGER', 'Product Manager'], ['qa-lead', 'Meera Das', 'TEAM_LEADER', 'Quality Team Lead'], ['qa', 'Sam Thomas', 'EMPLOYEE', 'Quality Engineer']];
    const users = {},
      employees = {};
    for (const [key, person, role, jobTitle] of defs) {
      const user = (await User.create([{
        _id: key === 'admin' ? adminId : newId(),
        organizationId: org._id,
        name: person,
        email: `${key}@${slug}.example.test`,
        role,
        status: 'ACTIVE',
        passwordHash
      }], {
        session
      }))[0].toObject();
      users[key] = user;
      employees[key] = (await Employee.create([{
        organizationId: org._id,
        userId: user._id,
        name: person,
        email: user.email,
        role,
        status: 'ACTIVE',
        jobTitle,
        hoursPerWeek: 40,
        experienceYears: key === 'employee' ? 2 : key === 'dev' ? 4 : 3,
        joiningDate: day(-120),
        skills: ['JavaScript', 'Node.js', 'React', 'MongoDB', ...(key === 'qa' ? ['Testing'] : [])]
      }], {
        session
      }))[0].toObject();
    }
    const engineering = (await Department.create([{
      organizationId: org._id,
      name: 'Engineering',
      description: 'Product engineering and platform foundations.',
      headId: employees.pm._id
    }], {
      session
    }))[0].toObject();
    const product = (await Department.create([{
      organizationId: org._id,
      name: 'Product & Quality',
      description: 'Product planning, experience, and release quality.',
      headId: employees.pm2._id
    }], {
      session
    }))[0].toObject();
    const platformTeam = (await Team.create([{
      organizationId: org._id,
      name: 'Platform Engineering',
      description: 'Building dependable product experiences.',
      departmentId: engineering._id,
      leaderId: employees.lead._id
    }], {
      session
    }))[0].toObject();
    const qualityTeam = (await Team.create([{
      organizationId: org._id,
      name: 'Product Quality',
      description: 'Design systems and dependable releases.',
      departmentId: product._id,
      leaderId: employees['qa-lead']._id
    }], {
      session
    }))[0].toObject();
    for (const key of Object.keys(employees)) {
      const quality = ['pm2', 'qa-lead', 'qa'].includes(key),
        team = quality ? qualityTeam : platformTeam;
      const reportsToId = key === 'admin' ? null : ['pm', 'pm2'].includes(key) ? employees.admin._id : ['lead', 'qa-lead'].includes(key) ? employees[quality ? 'pm2' : 'pm']._id : employees[quality ? 'qa-lead' : 'lead']._id;
      await Employee.updateOne({
        _id: employees[key]._id
      }, {
        $set: {
          teamId: key === 'admin' ? null : team._id,
          departmentId: key === 'admin' ? null : quality ? product._id : engineering._id,
          reportsToId
        }
      }, {
        session
      });
      Object.assign(employees[key], {
        teamId: key === 'admin' ? null : team._id,
        departmentId: key === 'admin' ? null : team.departmentId,
        reportsToId
      });
    }
    await Organization.updateOne({
      _id: org._id
    }, {
      $set: {
        leaveDelegateId: employees.pm._id
      }
    }, {
      session
    });
    org.leaveDelegateId = employees.pm._id;
    const projects = [];
    for (const [code, title, description, manager, team, priority] of [['CWS', 'Customer Workspace', 'A faster, clearer home for customer operations.', 'pm', platformTeam, 'HIGH'], ['API', 'Gateway Services', 'Reliable APIs, access control, and service observability.', 'pm', platformTeam, 'CRITICAL'], ['DSY', 'Design System', 'Reusable patterns and accessible product components.', 'pm2', qualityTeam, 'MEDIUM']]) {
      projects.push((await Project.create([{
        organizationId: org._id,
        name: title,
        code,
        description,
        managerId: employees[manager]._id,
        teamIds: [team._id],
        memberIds: [],
        requiredSkills: ['React', 'Node.js', 'MongoDB'],
        tags: ['Product delivery'],
        startDate: day(-45),
        dueDate: day(code === 'API' ? 7 : 28),
        priority,
        status: 'ACTIVE',
        createdBy: users[manager]._id
      }], {
        session
      }))[0].toObject());
    }
    const tasks = [],
      titles = ['Implement workspace access controls', 'Build project overview cards', 'Review tenant query boundaries', 'Design organization invitation flow', 'Add task assignment validation', 'Optimize dashboard queries', 'Create reusable form patterns', 'Resolve release blockers', 'Document API conventions', 'Improve mobile board interactions', 'Add password recovery flow', 'Implement leave coverage view', 'Review empty and error states', 'Add resource matching signals', 'Validate keyboard navigation', 'Prepare release verification'];
    if (slug === 'northstar') {
      for (let i = 0; i < 28; i++) {
        const project = projects[i % 2],
          assignee = employees[i < 10 ? 'employee' : i % 3 === 0 ? 'dev' : i % 3 === 1 ? 'design' : 'employee'];
        const status = i < 10 ? ['TODO', 'IN_PROGRESS', 'REVIEW', 'BACKLOG'][i % 4] : i < 16 ? 'IN_PROGRESS' : 'DONE';
        const due = i === 0 || i === 2 ? day(-2) : status === 'DONE' ? day(-1) : day(i % 5 + 2),
          completedAt = status === 'DONE' ? day(-2) : null;
        const effort = i < 10 ? 14 : 6;
        const task = (await Task.create([{
          organizationId: org._id,
          projectId: project._id,
          title: titles[i % titles.length] + (i >= 16 ? ' · release review' : ''),
          description: 'Deliver the scoped behavior, validate access boundaries, and review the user experience with the team.',
          assigneeId: assignee._id,
          teamId: platformTeam._id,
          createdBy: users.pm._id,
          priority: i % 7 === 0 ? 'CRITICAL' : i % 3 === 0 ? 'HIGH' : 'MEDIUM',
          status,
          startDate: day(-10),
          dueDate: due,
          estimatedHours: effort,
          remainingHours: status === 'DONE' ? 0 : effort,
          complexity: i % 3 + 1,
          requiredSkills: ['React', 'Node.js'],
          tags: [i % 2 ? 'Platform' : 'Frontend'],
          blockedReason: i === 1 ? 'Waiting for an API contract review.' : '',
          completedAt,
          completedAssigneeId: completedAt ? assignee._id : null,
          completedBy: completedAt ? employees.pm._id : null,
          reopenedCount: i === 20 ? 1 : 0
        }], {
          session
        }))[0].toObject();
        tasks.push(task);
      }
      await Task.updateOne({
        _id: tasks[4]._id
      }, {
        $set: {
          dependencies: [tasks[0]._id]
        }
      }, {
        session
      });
      tasks[4].dependencies = [tasks[0]._id];
    }
    for (const [project, assignee] of [[projects[2], employees.qa], ...(slug === 'keystone' ? [[projects[0], employees.employee]] : [])]) tasks.push((await Task.create([{
      organizationId: org._id,
      projectId: project._id,
      title: 'Prepare acceptance criteria',
      description: 'Confirm scope and document release acceptance.',
      assigneeId: assignee._id,
      teamId: assignee.teamId,
      createdBy: users.pm2._id,
      status: 'TODO',
      priority: 'MEDIUM',
      startDate: day(-2),
      dueDate: day(5),
      estimatedHours: 8,
      remainingHours: 8,
      complexity: 2,
      requiredSkills: ['Testing']
    }], {
      session
    }))[0].toObject());
    const leaves = [];
    for (const [key, status, type] of [['employee', 'APPROVED', 'PAID'], ['design', 'PENDING', 'PAID']]) leaves.push((await LeaveRequest.create([{
      organizationId: org._id,
      employeeId: employees[key]._id,
      type,
      startDate: day(3),
      endDate: day(7),
      days: workdays(day(3), day(7)),
      reason: 'Planned personal time.',
      status,
      decidedBy: status === 'APPROVED' ? employees.lead._id : null,
      decisionNote: status === 'APPROVED' ? 'Approved; review handover before leave.' : ''
    }], {
      session
    }))[0].toObject());
    for (const user of Object.values(users)) await Notification.create([{
      organizationId: org._id,
      userId: user._id,
      title: 'Welcome to your workspace',
      message: 'Explore your projects, tasks, and capacity. These are sample records in a demonstration workspace.',
      path: '/app',
      eventKey: `welcome:${user._id}`
    }], {
      session
    });
    organizations.push({
      organization: org,
      users,
      employees,
      departments: [engineering, product],
      teams: [platformTeam, qualityTeam],
      projects,
      tasks,
      leaves
    });
  }
  return {
    platform,
    organizations
  };
}
