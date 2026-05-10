const express = require('express');
const auth = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/roles');
const controller = require('../controllers/taskController');

const router = express.Router({ mergeParams: true });

router.use(auth, requireMember);
router.get('/', controller.listTasks);
router.post('/', controller.createTask);
router.get('/:taskId', controller.getTask);
router.patch('/:taskId', controller.updateTask);
router.delete('/:taskId', requireAdmin, controller.deleteTask);

module.exports = router;
