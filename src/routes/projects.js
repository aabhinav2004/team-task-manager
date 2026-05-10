const express = require('express');
const auth = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/roles');
const controller = require('../controllers/projectController');

const router = express.Router();

router.use(auth);
router.get('/', controller.listProjects);
router.post('/', controller.createProject);
router.get('/:id', requireMember, controller.getProject);
router.patch('/:id', requireAdmin, controller.updateProject);
router.delete('/:id', requireAdmin, controller.deleteProject);

module.exports = router;
