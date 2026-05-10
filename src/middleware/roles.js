const mongoose = require('mongoose');
const Project = require('../models/Project');

async function requireMember(req, res, next) {
  const projectId = req.params.projectId || req.params.id;
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const membership = project.members.find((m) => m.user.toString() === req.user.id);
  if (!membership) return res.status(403).json({ error: 'Not a project member' });

  req.project = project;
  req.membership = membership;
  next();
}

async function requireAdmin(req, res, next) {
  await requireMember(req, res, () => {
    if (req.membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { requireMember, requireAdmin };
