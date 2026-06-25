const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// GET /api/admin/users - get all users
router.get('/users', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { watchlist: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// GET /api/admin/users/:id - get specific user's full dashboard
router.get('/users/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        watchlist: {
          include: {
            thesisCases: {
              include: { conditions: true }
            },
            notes: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// PUT /api/admin/users/:id/role - change user role
router.put('/users/:id/role', authenticate, authorizeAdmin, async (req, res) => {
  const { role } = req.body;

  if (!role || !['USER', 'ADMIN'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { role },
      select: { id: true, email: true, name: true, role: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// DELETE /api/admin/users/:id - delete a user
router.delete('/users/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Clean up all user data first
    const watchlistItems = await prisma.watchlistItem.findMany({
      where: { userId: user.id }
    });

    for (const item of watchlistItems) {
      await prisma.thesisCondition.deleteMany({
        where: { thesisCase: { watchlistItemId: item.id } }
      });
      await prisma.thesisCase.deleteMany({ where: { watchlistItemId: item.id } });
    }

    await prisma.note.deleteMany({ where: { userId: user.id } });
    await prisma.watchlistItem.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;