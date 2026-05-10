require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./db');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function seed() {
  await connectDB();
  await Promise.all([Task.deleteMany({}), Project.deleteMany({}), User.deleteMany({})]);

  const passwordHash = await bcrypt.hash('Password1', 12);
  const [admin, alice, bob] = await User.create([
    { name: 'Admin User', email: 'admin@demo.com', passwordHash, accountType: 'ADMIN' },
    { name: 'Alice Chen', email: 'alice@demo.com', passwordHash, accountType: 'MEMBER' },
    { name: 'Bob Smith', email: 'bob@demo.com', passwordHash, accountType: 'MEMBER' }
  ]);

  const [launch, ops] = await Project.create([
    {
      name: 'Product Launch',
      description: 'Coordinate the next release across design, engineering, and go-to-market.',
      color: '#6366f1',
      dueDate: daysFromNow(21),
      owner: admin.id,
      members: [
        { user: admin.id, role: 'ADMIN' },
        { user: alice.id, role: 'MEMBER' },
        { user: bob.id, role: 'MEMBER' }
      ]
    },
    {
      name: 'Ops Command Center',
      description: 'Track systems work, incident follow-ups, and operational polish.',
      color: '#14b8a6',
      dueDate: daysFromNow(35),
      owner: admin.id,
      members: [
        { user: admin.id, role: 'ADMIN' },
        { user: alice.id, role: 'MEMBER' },
        { user: bob.id, role: 'MEMBER' }
      ]
    }
  ]);

  await Task.create([
    { title: 'Finalize onboarding checklist', description: 'Tighten first-run flow copy and states.', status: 'TODO', priority: 'HIGH', dueDate: daysFromNow(3), project: launch.id, assignee: alice.id, creator: admin.id },
    { title: 'Ship invite email copy', description: 'Prepare transactional copy for team invites.', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: daysFromNow(5), project: launch.id, assignee: bob.id, creator: admin.id },
    { title: 'Audit dashboard empty states', description: 'Make sure every blank state has a useful affordance.', status: 'IN_REVIEW', priority: 'LOW', dueDate: daysFromNow(2), project: launch.id, assignee: alice.id, creator: admin.id },
    { title: 'Close beta feedback synthesis', description: 'Summarize top issues before launch readiness.', status: 'DONE', priority: 'HIGH', dueDate: daysFromNow(-4), project: launch.id, assignee: admin.id, creator: admin.id },
    { title: 'Fix mobile table density', description: 'Improve layout on 375px widths.', status: 'TODO', priority: 'URGENT', dueDate: daysFromNow(-2), project: launch.id, assignee: bob.id, creator: admin.id },
    { title: 'Create incident review template', description: 'Standardize follow-up notes and owners.', status: 'TODO', priority: 'MEDIUM', dueDate: daysFromNow(7), project: ops.id, assignee: admin.id, creator: admin.id },
    { title: 'Rotate API credentials', description: 'Coordinate production secret rotation.', status: 'IN_PROGRESS', priority: 'URGENT', dueDate: daysFromNow(-1), project: ops.id, assignee: alice.id, creator: admin.id },
    { title: 'Document backup restore drill', description: 'Capture steps, timings, and owner handoffs.', status: 'IN_REVIEW', priority: 'HIGH', dueDate: daysFromNow(8), project: ops.id, assignee: bob.id, creator: admin.id },
    { title: 'Archive stale monitors', description: 'Remove noisy checks from the old environment.', status: 'DONE', priority: 'LOW', dueDate: daysFromNow(-8), project: ops.id, assignee: alice.id, creator: admin.id },
    { title: 'Review error budget dashboard', description: 'Validate query windows and annotations.', status: 'TODO', priority: 'MEDIUM', dueDate: daysFromNow(12), project: ops.id, assignee: bob.id, creator: admin.id }
  ]);

  console.log('Seed complete. Demo users: admin@demo.com, alice@demo.com, bob@demo.com / Password1');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
