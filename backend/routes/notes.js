const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// GET /api/notes/:watchlistItemId
router.get('/:watchlistItemId', authenticate, async (req, res) => {
  try {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: parseInt(req.params.watchlistItemId), userId: req.user.id }
    });

    if (!item) {
      return res.status(404).json({ message: 'Stock not found in your watchlist.' });
    }

    const notes = await prisma.note.findMany({
      where: { watchlistItemId: item.id },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// POST /api/notes/:watchlistItemId
router.post('/:watchlistItemId', authenticate, async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Note content cannot be empty.' });
  }

  try {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: parseInt(req.params.watchlistItemId), userId: req.user.id }
    });

    if (!item) {
      return res.status(404).json({ message: 'Stock not found in your watchlist.' });
    }

    const note = await prisma.note.create({
      data: {
        userId: req.user.id,
        watchlistItemId: item.id,
        content: content.trim()
      }
    });

    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// PUT /api/notes/:noteId
router.put('/:noteId', authenticate, async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Note content cannot be empty.' });
  }

  try {
    const note = await prisma.note.findFirst({
      where: { id: parseInt(req.params.noteId), userId: req.user.id }
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    const updated = await prisma.note.update({
      where: { id: note.id },
      data: { content: content.trim() }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// DELETE /api/notes/:noteId
router.delete('/:noteId', authenticate, async (req, res) => {
  try {
    const note = await prisma.note.findFirst({
      where: { id: parseInt(req.params.noteId), userId: req.user.id }
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    await prisma.note.delete({ where: { id: note.id } });
    res.json({ message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;