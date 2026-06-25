const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// GET /api/thesis/:watchlistItemId - get all thesis cases for a stock
router.get('/:watchlistItemId', authenticate, async (req, res) => {
  try {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: parseInt(req.params.watchlistItemId), userId: req.user.id }
    });

    if (!item) {
      return res.status(404).json({ message: 'Stock not found in your watchlist.' });
    }

    const thesisCases = await prisma.thesisCase.findMany({
      where: { watchlistItemId: item.id },
      include: { conditions: true }
    });

    res.json(thesisCases);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/thesis/:watchlistItemId - create or update a thesis case
router.post('/:watchlistItemId', authenticate, async (req, res) => {
  const { type, explanation, conditions } = req.body;

  if (!type || !conditions || conditions.length === 0) {
    return res.status(400).json({ message: 'Type and at least one condition are required.' });
  }

  try {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: parseInt(req.params.watchlistItemId), userId: req.user.id }
    });

    if (!item) {
      return res.status(404).json({ message: 'Stock not found in your watchlist.' });
    }

    const existing = await prisma.thesisCase.findFirst({
      where: { watchlistItemId: item.id, type }
    });

    if (existing) {
      await prisma.thesisCondition.deleteMany({ where: { thesisCaseId: existing.id } });
      await prisma.thesisCase.delete({ where: { id: existing.id } });
    }

    const thesisCase = await prisma.thesisCase.create({
      data: {
        watchlistItemId: item.id,
        type,
        explanation,
        conditions: {
          create: conditions.map(c => ({
            metric: c.metric,
            operator: c.operator,
            value: parseFloat(c.value)
          }))
        }
      },
      include: { conditions: true }
    });

    res.status(201).json(thesisCase);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// DELETE /api/thesis/:caseId - delete a thesis case
router.delete('/:caseId', authenticate, async (req, res) => {
  try {
    const thesisCase = await prisma.thesisCase.findFirst({
      where: {
        id: parseInt(req.params.caseId),
        watchlistItem: { userId: req.user.id }
      }
    });

    if (!thesisCase) {
      return res.status(404).json({ message: 'Thesis case not found.' });
    }

    await prisma.thesisCondition.deleteMany({ where: { thesisCaseId: thesisCase.id } });
    await prisma.thesisCase.delete({ where: { id: thesisCase.id } });

    res.json({ message: 'Thesis case deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;