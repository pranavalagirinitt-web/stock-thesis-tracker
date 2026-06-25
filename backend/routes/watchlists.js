const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// GET /api/watchlist - get user's watchlist with filters
router.get('/', authenticate, async (req, res) => {
  const { sector, capSize, strategy, market, sortBy } = req.query;

  const filters = { userId: req.user.id };
  if (sector) filters.sector = sector;
  if (capSize) filters.capSize = capSize;
  if (strategy) filters.strategy = strategy;
  if (market) filters.market = market;

  const orderBy = {};
  if (sortBy === 'alphabetical_asc') orderBy.companyName = 'asc';
  else if (sortBy === 'alphabetical_desc') orderBy.companyName = 'desc';
  else orderBy.createdAt = 'desc';

  try {
    const watchlist = await prisma.watchlistItem.findMany({
      where: filters,
      include: { thesisCases: { include: { conditions: true } } },
      orderBy
    });
    res.json(watchlist);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/watchlist - add stock to watchlist
router.post('/', authenticate, async (req, res) => {
  const { symbol, companyName, market, sector, capSize, strategy } = req.body;

  if (!symbol || !companyName || !market) {
    return res.status(400).json({ message: 'Symbol, company name and market are required.' });
  }

  try {
    const item = await prisma.watchlistItem.create({
      data: {
        userId: req.user.id,
        symbol: symbol.toUpperCase(),
        companyName,
        market,
        sector: sector || 'OTHER',
        capSize: capSize || 'LARGE_CAP',
        strategy: strategy || 'LONG_TERM'
      }
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Stock already in your watchlist.' });
    }
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// PUT /api/watchlist/:id - update stock labels
router.put('/:id', authenticate, async (req, res) => {
  const { sector, capSize, strategy } = req.body;

  try {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id }
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const updated = await prisma.watchlistItem.update({
      where: { id: item.id },
      data: {
        sector: sector || item.sector,
        capSize: capSize || item.capSize,
        strategy: strategy || item.strategy
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// DELETE /api/watchlist/:id - remove stock from watchlist
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id }
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    await prisma.thesisCondition.deleteMany({
      where: { thesisCase: { watchlistItemId: item.id } }
    });
    await prisma.thesisCase.deleteMany({ where: { watchlistItemId: item.id } });
    await prisma.note.deleteMany({ where: { watchlistItemId: item.id } });
    await prisma.watchlistItem.delete({ where: { id: item.id } });

    res.json({ message: 'Stock removed from watchlist.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;