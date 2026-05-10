const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');

async function listMembers(req, res, next) {
  try {
    await req.project.populate('members.user', 'name email');
    res.json({ members: req.project.members });
  } catch (error) {
    next(error);
  }
}

async function listCandidates(req, res, next) {
  try {
    const existingIds = req.project.members.map((member) => member.user);
    const search = String(req.query.search || '').trim();
    const query = { _id: { $nin: existingIds } };

    if (search) {
      const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: new RegExp(pattern, 'i') },
        { email: new RegExp(pattern, 'i') }
      ];
    }

    const users = await User.find(query)
      .select('name email accountType')
      .sort({ name: 1 })
      .limit(100);

    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function addMember(req, res, next) {
  try {
    let users = [];

    if (Array.isArray(req.body.userIds) && req.body.userIds.length) {
      const invalidId = req.body.userIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidId) return res.status(400).json({ error: 'Validation failed', fields: { userIds: 'Invalid user ID selected' } });
      users = await User.find({ _id: { $in: req.body.userIds } });
    } else {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Validation failed', fields: { email: 'Choose at least one member' } });
      }
      const user = await User.findOne({ email });
      if (user) users = [user];
    }

    if (!users.length) return res.status(404).json({ error: 'User not found' });

    const existingIds = new Set(req.project.members.map((member) => member.user.toString()));
    const newUsers = users.filter((user) => !existingIds.has(user.id));
    if (!newUsers.length) {
      return res.status(409).json({ error: users.length > 1 ? 'Selected users are already members' : 'User is already a member' });
    }

    newUsers.forEach((user) => {
      req.project.members.push({ user: user.id, role: req.body.role === 'ADMIN' ? 'ADMIN' : 'MEMBER' });
    });

    await req.project.save();
    await req.project.populate('members.user', 'name email');
    res.status(201).json({ members: req.project.members });
  } catch (error) {
    next(error);
  }
}

async function updateMember(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID' });
    if (!['ADMIN', 'MEMBER'].includes(req.body.role)) {
      return res.status(400).json({ error: 'Validation failed', fields: { role: 'Invalid role' } });
    }
    const member = req.project.members.find((item) => item.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const admins = req.project.members.filter((item) => item.role === 'ADMIN');
    if (member.role === 'ADMIN' && req.body.role === 'MEMBER' && admins.length === 1) {
      return res.status(400).json({ error: 'Project must keep at least one admin' });
    }
    member.role = req.body.role;
    await req.project.save();
    await req.project.populate('members.user', 'name email');
    res.json({ members: req.project.members });
  } catch (error) {
    next(error);
  }
}

async function removeMember(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const member = req.project.members.find((item) => item.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.role === 'ADMIN' && req.project.members.filter((item) => item.role === 'ADMIN').length === 1) {
      return res.status(400).json({ error: 'Project must keep at least one admin' });
    }
    req.project.members = req.project.members.filter((item) => item.user.toString() !== req.params.userId);
    await req.project.save();
    await Task.updateMany({ project: req.project.id, assignee: req.params.userId }, { $set: { assignee: null } });
    await req.project.populate('members.user', 'name email');
    res.json({ members: req.project.members });
  } catch (error) {
    next(error);
  }
}

module.exports = { listMembers, listCandidates, addMember, updateMember, removeMember };
