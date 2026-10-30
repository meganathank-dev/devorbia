
import dns from 'node:dns';
dns.setServers(['8.8.8.8']);

import mongoose from 'mongoose';
import { connectDatabase, transaction } from '../src/config/database.js';
import {
  Organization, User, Employee, Department, Team, Project, Task,
  LeaveRequest, Notification
} from '../src/models/index.js';
import { hashPassword } from '../src/utils/security.js';
import { workdays, utcDay } from '../src/utils/domain.js';

const COMPANIES = [
  ['orbitwave-digital', 'OrbitWave Digital', 'Bengaluru', 'Cloud products and customer support software.', ['Aadhavan Raj','Harini Suresh','Mithun Prakash','Keerthana V','Santhosh Kumar','Meera Nair','Rahul Dev'], ['Customer Support Workspace','Cloud Cost Insights']],
  ['pixelroot-studio', 'PixelRoot Studio', 'Chennai', 'Digital product design and web experiences.', ['Rithika Anand','Sanjay Mohan','Akash Raman','Janani K','Dinesh Babu','Shreya Nair','Kavin Raj'], ['Design System Refresh','Client Review Hub']],
  ['bluepeak-analytics', 'BluePeak Analytics', 'Hyderabad', 'Business intelligence and reporting automation.', ['Varun Reddy','Ananya Rao','Nikhil Varma','Sowmya P','Rohit Menon','Pavithra S','Imran Ali'], ['Sales Performance Dashboard','Data Quality Monitor']],
  ['greencircuit-tech', 'GreenCircuit Technologies', 'Coimbatore', 'Energy monitoring and sustainability software.', ['Pranav Kumar','Aishwarya M','Gokul Anand','Deepa Krishnan','Suresh B','Nandhini R','Joel Mathew'], ['Energy Usage Monitor','Sustainability Reports']],
  ['northstar-healthtech', 'Northstar HealthTech', 'Pune', 'Healthcare operations and appointment workflows.', ['Aditya Shah','Neha Kulkarni','Rohan Desai','Isha Patel','Manav Joshi','Tara Nair','Kunal Mehta'], ['Clinic Appointment Flow','Care Operations Reports']],
  ['silverline-fintech', 'Silverline FinTech', 'Mumbai', 'Financial workflow and reconciliation software.', ['Aarav Mehta','Diya Shah','Yash Malhotra','Pooja Iyer','Neil Fernandes','Rhea Kapoor','Omkar Patil'], ['Reconciliation Console','Audit Trail Viewer']],
  ['maplebridge-learning', 'MapleBridge Learning', 'Kochi', 'Learning platforms and course delivery tools.', ['Abhinav Nair','Lakshmi Menon','Arjun Pillai','Devika S','Vishnu Das','Fathima A','Naveen Thomas'], ['Course Progress Tracker','Instructor Resource Library']],
  ['redstone-logistics', 'Redstone Logistics', 'Tiruppur', 'Shipment visibility and logistics coordination.', ['Madhan Kumar','Sangeetha R','Karthik Vel','Bhuvana S','Aravind K','Sathya Priya','Manoj Kumar'], ['Shipment Status Portal','Warehouse Task Board']],
  ['cloudharbor-systems', 'CloudHarbor Systems', 'Bengaluru', 'Cloud operations and release automation.', ['Siddharth Rao','Monisha G','Vivek Anand','Anu Joseph','Kiran Bhat','Swetha R','Nitin Das'], ['Release Readiness Board','Incident Follow-up Tracker']],
  ['urbanleaf-commerce', 'UrbanLeaf Commerce', 'Madurai', 'Retail catalog and order management products.', ['Mugilan S','Priyanka Devi','Hari Prasad','Nivetha M','Sanjay Kumar','Abirami R','Ashwin Raj'], ['Product Catalog Cleanup','Order Experience Updates']]
];

const BYTEFORGE_NAMES = {
  admin: 'Meera Krishnan',
  pm: 'Sanjay Prabhu',
  lead: 'Hariharan S',
  employee: 'Kavitha Raman',
  dev: 'Naveen Kumar',
  design: 'Anusha Devi',
  qa: 'Bala Murugan'
};

const INACTIVE = {
  slug: 'cedarstone-legacy',
  name: 'Cedarstone Legacy Services',
  description: 'Legacy workspace retained for organization lifecycle testing.',
  people: ['Maya Krishnan','Raghav Iyer','Surya Prakash','Anjali S','Naveen Raj','Pooja Devi','Kiran Kumar'],
  projects: ['Legacy Request Tracker','Archive Readiness Review']
};

const dateAt = (now, offset) =>
  new Date(utcDay(now).getTime() + offset * 86400000);

async function createCompany(def, passwordHash, now, session, inactive = false) {
  const [slug, name, city, description, names, projectNames] = def;
  const keys = ['admin','pm','lead','employee','dev','design','qa'];
  const roles = ['ORGANIZATION_ADMIN','PROJECT_MANAGER','TEAM_LEADER','EMPLOYEE','EMPLOYEE','EMPLOYEE','EMPLOYEE'];
  const titles = ['Operations Administrator','Project Manager','Engineering Lead','Full Stack Developer','Backend Developer','Product Designer','QA Engineer'];
  const adminId = new mongoose.Types.ObjectId();

  const org = (await Organization.create([{
    name, slug, email: `hello@${slug}.example.test`,
    description: `${description} Based in ${city}.`,
    website: `https://${slug}.example.test`,
    active: !inactive,
    adminUserId: adminId
  }], { session }))[0];

  const users = {}, staff = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const id = i === 0 ? adminId : new mongoose.Types.ObjectId();
    const email = `${key}@${slug}.example.test`;

    users[key] = (await User.create([{
      _id: id, organizationId: org._id, name: names[i],
      email, role: roles[i], status: 'ACTIVE', passwordHash
    }], { session }))[0];

    staff[key] = (await Employee.create([{
      organizationId: org._id, userId: id, name: names[i], email,
      role: roles[i], status: 'ACTIVE', jobTitle: titles[i],
      hoursPerWeek: 40, experienceYears: [6,5,4,2,3,2,2][i],
      joiningDate: dateAt(now, -120),
      skills: [
        ['Leadership','Operations'], ['Agile','Planning'],
        ['Code Review','JavaScript'], ['React','UI Development'],
        ['Node.js','API Development'], ['Figma','Prototyping'],
        ['Testing','Postman']
      ][i]
    }], { session }))[0];
  }

  const engineering = (await Department.create([{
    organizationId: org._id, name: 'Engineering',
    description: 'Application development and technical delivery.',
    headId: staff.lead._id
  }], { session }))[0];

  const product = (await Department.create([{
    organizationId: org._id, name: 'Product & Design',
    description: 'Product experience and interface design.',
    headId: staff.design._id
  }], { session }))[0];

  const quality = (await Department.create([{
    organizationId: org._id, name: 'Quality Assurance',
    description: 'Testing and release validation.',
    headId: staff.qa._id
  }], { session }))[0];

  const frontend = (await Team.create([{
    organizationId: org._id, name: 'Application Delivery',
    description: 'User-facing features and workflows.',
    departmentId: engineering._id, leaderId: staff.lead._id
  }], { session }))[0];

  const backend = (await Team.create([{
    organizationId: org._id, name: 'Platform Services',
    description: 'APIs, integrations, and data services.',
    departmentId: engineering._id, leaderId: staff.lead._id
  }], { session }))[0];

  const design = (await Team.create([{
    organizationId: org._id, name: 'Product Experience',
    description: 'Design, usability, and prototypes.',
    departmentId: product._id, leaderId: staff.design._id
  }], { session }))[0];

  const qa = (await Team.create([{
    organizationId: org._id, name: 'Quality Engineering',
    description: 'Test automation and release quality.',
    departmentId: quality._id, leaderId: staff.qa._id
  }], { session }))[0];

  const assignments = [
    ['pm', engineering, backend, staff.admin._id],
    ['lead', engineering, frontend, staff.pm._id],
    ['employee', engineering, frontend, staff.lead._id],
    ['dev', engineering, backend, staff.lead._id],
    ['design', product, design, staff.pm._id],
    ['qa', quality, qa, staff.lead._id]
  ];

  for (const [key, dept, team, manager] of assignments) {
    await Employee.updateOne(
      { _id: staff[key]._id },
      { $set: { departmentId: dept._id, teamId: team._id, reportsToId: manager } },
      { session }
    );
  }

  await Employee.updateOne(
    { _id: staff.admin._id },
    { $set: { departmentId: engineering._id } },
    { session }
  );

  await Organization.updateOne(
    { _id: org._id },
    { $set: { leaveDelegateId: staff.pm._id } },
    { session }
  );

  const projectData = projectNames.map((projectName, i) => ({
    name: projectName,
    code: `P${i + 1}${slug.slice(0, 3).toUpperCase()}`,
    description: `${projectName}: delivery planning, implementation, review, and release tracking.`,
    team: i === 0 ? frontend : backend
  }));

  const projects = [];
  for (const p of projectData) {
    projects.push((await Project.create([{
      organizationId: org._id,
      name: p.name, code: p.code, description: p.description,
      managerId: staff.pm._id, teamIds: [p.team._id],
      memberIds: [staff.employee._id, staff.dev._id, staff.design._id, staff.qa._id],
      requiredSkills: ['Planning','Development','Testing'],
      tags: ['Delivery','Sprint'],
      startDate: dateAt(now, -14), dueDate: dateAt(now, 28),
      priority: 'HIGH', status: inactive ? 'ON_HOLD' : 'ACTIVE',
      createdBy: users.pm._id
    }], { session }))[0]);
  }

  const taskRows = [
    ['Confirm requirements and acceptance criteria', 0, 'pm', 'DONE', 'MEDIUM'],
    ['Implement the primary user workflow', 0, 'employee', 'IN_PROGRESS', 'HIGH'],
    ['Add API validation and error handling', 1, 'dev', 'TODO', 'HIGH'],
    ['Review interface accessibility', 0, 'design', 'REVIEW', 'MEDIUM'],
    ['Prepare regression checks', 1, 'qa', 'TODO', 'MEDIUM']
  ];

  for (let i = 0; i < taskRows.length; i++) {
    const [title, pi, assignee, status, priority] = taskRows[i];
    await Task.create([{
      organizationId: org._id, projectId: projects[pi]._id, title,
      description: `Work item for ${projects[pi].name}.`,
      assigneeId: staff[assignee]._id,
      teamId: projectData[pi].team._id, createdBy: users.pm._id,
      priority, status, startDate: dateAt(now, -3),
      dueDate: dateAt(now, 7 + i * 2),
      estimatedHours: 6, remainingHours: status === 'DONE' ? 0 : 6,
      complexity: 2, requiredSkills: ['Communication','Testing'],
      tags: ['Sprint','Delivery'],
      ...(status === 'DONE' ? {
        completedAt: dateAt(now, -1),
        completedAssigneeId: staff[assignee]._id,
        completedBy: staff.lead._id
      } : {})
    }], { session });
  }

  await LeaveRequest.create([{
    organizationId: org._id, employeeId: staff.employee._id,
    type: 'PAID', startDate: dateAt(now, 12), endDate: dateAt(now, 13),
    days: workdays(dateAt(now, 12), dateAt(now, 13)),
    reason: 'Planned personal leave.', status: 'PENDING'
  }], { session });

  for (const user of Object.values(users)) {
    await Notification.create([{
      organizationId: org._id, userId: user._id,
      title: 'Welcome to DevOrbia',
      message: `Review projects and assigned work at ${name}.`,
      path: '/app', eventKey: `bootstrap:${slug}:${user._id}`
    }], { session });
  }

  return { org, users };
}

// Additive demo-data migration. No Super Admin account fields are intentionally modified.
async function main() {
  const password = process.env.SAMPLE_ACCOUNT_PASSWORD;
  if (process.env.CONFIRM_ORG_MIGRATION !== 'YES') {
    throw new Error('Set CONFIRM_ORG_MIGRATION=YES only after reviewing this script.');
  }
  if (!password || password.length < 12) {
    throw new Error('SAMPLE_ACCOUNT_PASSWORD must be at least 12 characters.');
  }

  await connectDatabase();
  try {
    const all = await Organization.find({}).select('name slug active');
    const existingSlugs = new Set(all.map(o => o.slug));
    const expectedExisting = ['nexora','byteforge'];

    if (!expectedExisting.every(s => existingSlugs.has(s))) {
      throw new Error('Expected both Nexora and ByteForge. No migration performed.');
    }
    if (all.length > 13) {
      throw new Error(`Found ${all.length} organizations; expected at most 13. No migration performed.`);
    }

    const allowed = new Set([
      'nexora','byteforge','cedarstone-legacy',
      ...COMPANIES.map(c => c[0])
    ]);
    const unexpected = all.filter(o => !allowed.has(o.slug));
    if (unexpected.length) {
      throw new Error(`Unexpected organizations found: ${unexpected.map(o => o.slug).join(', ')}. No migration performed.`);
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    const finalOrgs = await transaction(async session => {
      const byteforge = await Organization.findOne({ slug: 'byteforge' }).session(session);
      if (!byteforge) {
        throw new Error('ByteForge organization not found. Transaction cancelled.');
      }

      const byteforgeUsers = [
        ['admin', BYTEFORGE_NAMES.admin, 'Operations Administrator'],
        ['pm', BYTEFORGE_NAMES.pm, 'Delivery Project Manager'],
        ['lead', BYTEFORGE_NAMES.lead, 'Platform Team Lead'],
        ['employee', BYTEFORGE_NAMES.employee, 'Frontend Engineer'],
        ['dev', BYTEFORGE_NAMES.dev, 'Integration Engineer'],
        ['design', BYTEFORGE_NAMES.design, 'Product Designer'],
        ['qa', BYTEFORGE_NAMES.qa, 'Quality Engineer']
      ];

      for (const [key, name, jobTitle] of byteforgeUsers) {
        const email = `${key}@byteforge.example.test`;
        const userResult = await User.updateOne(
          { organizationId: byteforge._id, email, role: { $ne: 'SUPER_ADMIN' } },
          { $set: { name } },
          { session }
        );
        const employeeResult = await Employee.updateOne(
          { organizationId: byteforge._id, email },
          { $set: { name, jobTitle } },
          { session }
        );
        if (userResult.matchedCount !== 1 || employeeResult.matchedCount !== 1) {
          throw new Error(`Expected exactly one ByteForge user and employee for ${email}; transaction cancelled.`);
        }
      }

      await Organization.updateOne(
        { _id: byteforge._id },
        { $set: {
          active: true,
          description: 'Enterprise workflow products, integration services, and release automation.',
          website: 'https://byteforge.example.test'
        } },
        { session }
      );

      await Project.updateMany(
        { organizationId: byteforge._id },
        { $set: {
          tags: ['Enterprise Delivery','Integration'],
          requiredSkills: ['API Integration','Quality Engineering','Documentation']
        } },
        { session }
      );

      await Task.updateMany(
        { organizationId: byteforge._id },
        { $set: { tags: ['ByteForge Delivery'] } },
        { session }
      );

      for (const def of COMPANIES) {
        if (!existingSlugs.has(def[0])) {
          await createCompany(def, passwordHash, now, session, false);
        }
      }

      const inactiveDef = [
        INACTIVE.slug, INACTIVE.name, 'Remote',
        INACTIVE.description, INACTIVE.people, INACTIVE.projects
      ];
      if (!existingSlugs.has(INACTIVE.slug)) {
        await createCompany(inactiveDef, passwordHash, now, session, true);
      }

      await Organization.updateOne(
        { slug: 'nexora' }, { $set: { active: true } }, { session }
      );
      await Organization.updateOne(
        { slug: 'byteforge' }, { $set: { active: true } }, { session }
      );
      await Organization.updateOne(
        { slug: INACTIVE.slug }, { $set: { active: false } }, { session }
      );

      // Validate inside the transaction so any mismatch rolls back all migration writes.
      const finalOrgs = await Organization.find({})
        .select('name slug active')
        .sort({ slug: 1 })
        .session(session);

      const activeCount = finalOrgs.filter(o => o.active === true).length;
      const inactiveCount = finalOrgs.filter(o => o.active === false).length;
      const invalidActive = finalOrgs.filter(o => typeof o.active !== 'boolean');

      if (finalOrgs.length !== 13 || activeCount !== 12 || inactiveCount !== 1 || invalidActive.length) {
        throw new Error(
          `Count mismatch: total=${finalOrgs.length}, active=${activeCount}, inactive=${inactiveCount}. Transaction rolled back.`
        );
      }

      const requiredSlugs = ['nexora', 'byteforge', ...COMPANIES.map(c => c[0]), INACTIVE.slug];
      const finalSlugs = new Set(finalOrgs.map(o => o.slug));
      const missing = requiredSlugs.filter(slug => !finalSlugs.has(slug));
      if (missing.length) {
        throw new Error(`Missing expected organizations: ${missing.join(', ')}. Transaction rolled back.`);
      }

      return finalOrgs.map(o => ({ name: o.name, slug: o.slug, active: o.active }));
    });

    console.table(finalOrgs);
    console.log('Success: 12 active + 1 inactive = 13 organizations.');
    console.log('Super Admin was not modified.');
    console.log('New sample accounts use SAMPLE_ACCOUNT_PASSWORD.');
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch(error => {
  console.error('Migration stopped:', error);
  console.error('Error name:', error.name);
  console.error('Error code:', error.code);
  console.error('Error labels:', error.errorLabels);
  console.error('Cause:', error.cause);
  process.exitCode = 1;
});
