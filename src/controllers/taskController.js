const mongoose = require('mongoose');
const Task = require('../models/Task');

const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function validateTask(body, partial = false) {
  const fields = {};
  if (!partial || body.title !== undefined) {
    if (!body.title || body.title.trim().length < 1 || body.title.trim().length > 200) fields.title = 'Must be 1-200 characters';
  }
  if (body.description && body.description.length > 2000) fields.description = 'Must be 2000 characters or less';
  if (body.status !== undefined && !statuses.includes(body.status)) fields.status = 'Invalid status';
  if (body.priority !== undefined && !priorities.includes(body.priority)) fields.priority = 'Invalid priority';
  if (body.dueDate) {
    const due = new Date(body.dueDate);
    if (Number.isNaN(due.getTime())) fields.dueDate = 'Must be a valid date';
    if (due < new Date()) fields.dueDate = 'Due date must be in the future';
  }
  if (body.assignee && !mongoose.Types.ObjectId.isValid(body.assignee)) fields.assignee = 'Invalid assignee ID';
  return fields;
}

function ensureTaskId(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
    res.status(400).json({ error: 'Invalid task ID' });
    return false;
  }
  return true;
}

function memberIds(project) {
  return project.members.map((member) => member.user.toString());
}

async function listTasks(req, res, next) {
  try {
    const query = { project: req.project.id };
    ['status', 'priority'].forEach((field) => {
      if (req.query[field]) query[field] = req.query[field];
    });
    if (req.query.assignee) query.assignee = req.query.assignee === 'unassigned' ? null : req.query.assignee;
    const tasks = await Task.find(query).populate('assignee creator', 'name email').sort({ dueDate: 1, createdAt: -1 });
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const fields = validateTask(req.body);
    if (req.body.assignee && !memberIds(req.project).includes(req.body.assignee)) fields.assignee = 'Assignee must be a project member';
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Validation failed', fields });

    const task = await Task.create({
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      status: req.body.status || 'TODO',
      priority: req.body.priority || 'MEDIUM',
      dueDate: req.body.dueDate || undefined,
      project: req.project.id,
      assignee: req.body.assignee || null,
      creator: req.user.id
    });
    await task.populate('assignee creator', 'name email');
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
}

async function getTask(req, res, next) {
  try {
    if (!ensureTaskId(req, res)) return;
    const task = await Task.findOne({ _id: req.params.taskId, project: req.project.id }).populate('assignee creator', 'name email');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    if (!ensureTaskId(req, res)) return;
    const task = await Task.findOne({ _id: req.params.taskId, project: req.project.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isAdmin = req.membership.role === 'ADMIN';
    const isCreator = task.creator.toString() === req.user.id;
    const isAssignee = task.assignee?.toString() === req.user.id;
    const requestedFields = Object.keys(req.body);
    if (!isAdmin && !isCreator) {
      if (!isAssignee || requestedFields.some((field) => field !== 'status')) {
        return res.status(403).json({ error: 'Only admins and creators can edit all task fields' });
      }
    }

    const fields = validateTask(req.body, true);
    if (req.body.assignee && !memberIds(req.project).includes(req.body.assignee)) fields.assignee = 'Assignee must be a project member';
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Validation failed', fields });

    ['title', 'description', 'status', 'priority', 'dueDate', 'assignee'].forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field] === '' ? null : req.body[field];
    });
    await task.save();
    await task.populate('assignee creator', 'name email');
    res.json({ task });
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    if (!ensureTaskId(req, res)) return;
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: req.project.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = { listTasks, createTask, getTask, updateTask, deleteTask };
