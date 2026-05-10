const Task = require('../models/Task');
const Project = require('../models/Project');

async function stats(req, res, next) {
  try {
    const projectRows = await Project.find({ 'members.user': req.user.id }).select('_id name description color status members updatedAt').populate('members.user', 'name email').sort({ updatedAt: -1 });
    const projectIds = projectRows.map((project) => project._id);
    const now = new Date();

    const [statusCounts, overdueTasks, myTasks, recentTasks] = await Promise.all([
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.countDocuments({ project: { $in: projectIds }, dueDate: { $lt: now }, status: { $ne: 'DONE' } }),
      Task.find({ project: { $in: projectIds }, assignee: req.user.id })
        .populate('project', 'name color')
        .populate('assignee creator', 'name email')
        .sort({ dueDate: 1, updatedAt: -1 })
        .limit(12),
      Task.find({ project: { $in: projectIds } })
        .populate('project', 'name color')
        .populate('assignee creator', 'name email')
        .sort({ updatedAt: -1 })
        .limit(8)
    ]);

    const counts = statusCounts.reduce((acc, row) => ({ ...acc, [row._id]: row.count, totalTasks: acc.totalTasks + row.count }), { totalTasks: 0, DONE: 0 });
    const activeMembers = new Set(projectRows.flatMap((project) => project.members.map((member) => member.user._id.toString()))).size;
    res.json({
      stats: {
        totalProjects: projectRows.length,
        totalTasks: counts.totalTasks,
        completedTasks: counts.DONE || 0,
        completedPercent: counts.totalTasks ? Math.round(((counts.DONE || 0) / counts.totalTasks) * 100) : 0,
        overdueTasks,
        activeMembers
      },
      myTasks,
      projects: projectRows,
      recentActivity: recentTasks
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { stats };
