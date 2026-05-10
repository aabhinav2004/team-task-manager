const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');

function validateProject(body, partial = false) {
  const fields = {};
  if (!partial || body.name !== undefined) {
    if (!body.name || body.name.trim().length < 2 || body.name.trim().length > 100) fields.name = 'Must be 2-100 characters';
  }
  if (body.description && body.description.length > 500) fields.description = 'Must be 500 characters or less';
  if (body.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) fields.color = 'Must be a valid 6-digit hex color';
  if (body.status !== undefined && !['ACTIVE', 'ARCHIVED', 'COMPLETED'].includes(body.status)) fields.status = 'Invalid project status';
  if (body.dueDate && Number.isNaN(new Date(body.dueDate).getTime())) fields.dueDate = 'Must be a valid date';
  return fields;
}

async function listProjects(req, res, next) {
  try {
    const projects = await Project.find({ 'members.user': req.user.id })
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 });
    const ids = projects.map((project) => project._id);
    const counts = await Task.aggregate([
      { $match: { project: { $in: ids } } },
      { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } }
    ]);
    const countMap = counts.reduce((map, row) => {
      const id = row._id.project.toString();
      map[id] ||= { total: 0, done: 0 };
      map[id].total += row.count;
      if (row._id.status === 'DONE') map[id].done += row.count;
      return map;
    }, {});
    res.json({ projects: projects.map((project) => ({ ...project.toJSON(), taskCounts: countMap[project.id] || { total: 0, done: 0 } })) });
  } catch (error) {
    next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const fields = validateProject(req.body);
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Validation failed', fields });

    const project = await Project.create({
      name: req.body.name.trim(),
      description: req.body.description?.trim() || '',
      color: req.body.color || '#6366f1',
      status: req.body.status || 'ACTIVE',
      dueDate: req.body.dueDate || undefined,
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'ADMIN' }]
    });
    await project.populate('members.user', 'name email');
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
}

async function getProject(req, res, next) {
  try {
    await req.project.populate('members.user', 'name email');
    const counts = await Task.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(req.project.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const taskCounts = counts.reduce((acc, row) => ({ ...acc, [row._id]: row.count, total: acc.total + row.count }), { total: 0, TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 });
    res.json({ project: { ...req.project.toJSON(), taskCounts }, membership: req.membership });
  } catch (error) {
    next(error);
  }
}

async function updateProject(req, res, next) {
  try {
    const fields = validateProject(req.body, true);
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Validation failed', fields });

    ['name', 'description', 'color', 'status', 'dueDate'].forEach((field) => {
      if (req.body[field] !== undefined) req.project[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
    });
    await req.project.save();
    await req.project.populate('members.user', 'name email');
    res.json({ project: req.project });
  } catch (error) {
    next(error);
  }
}

async function deleteProject(req, res, next) {
  try {
    await Task.deleteMany({ project: req.project.id });
    await Project.deleteOne({ _id: req.project.id });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = { listProjects, createProject, getProject, updateProject, deleteProject };
