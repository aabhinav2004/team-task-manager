const express = require('express');
const auth = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/roles');
const controller = require('../controllers/memberController');

const router = express.Router({ mergeParams: true });

router.use(auth);
router.get('/', requireMember, controller.listMembers);
router.get('/candidates', requireAdmin, controller.listCandidates);
router.post('/', requireAdmin, controller.addMember);
router.patch('/:userId', requireAdmin, controller.updateMember);
router.delete('/:userId', requireAdmin, controller.removeMember);

module.exports = router;
