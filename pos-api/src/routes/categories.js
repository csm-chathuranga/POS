const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

function makeSlug(str) {
  return String(str || '').toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
}

async function uniqueSlug(db, base, excludeId = null) {
  let slug = base;
  let n = 0;
  while (true) {
    const sql = excludeId
      ? 'SELECT id FROM categories WHERE slug = ? AND id != ? LIMIT 1'
      : 'SELECT id FROM categories WHERE slug = ? LIMIT 1';
    const replacements = excludeId ? [slug, excludeId] : [slug];
    const [rows] = await db.query(sql, { replacements });
    if (!rows.length) return slug;
    slug = `${base}-${++n}`;
  }
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

router.get('/', auth, async (req, res) => {
  const [rows] = await req.db.query('SELECT * FROM categories ORDER BY name ASC');
  res.json(rows);
});

router.post('/', auth, role('admin', 'manager'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(422).json({ error: 'Name is required' });
    const slug = await uniqueSlug(req.db, makeSlug(name));
    const ts = now();
    const [result] = await req.db.query(
      'INSERT INTO categories (name, slug, created_at, updated_at) VALUES (?, ?, ?, ?)',
      { replacements: [name, slug, ts, ts] }
    );
    const [[cat]] = await req.db.query(
      'SELECT * FROM categories WHERE id = ?',
      { replacements: [result] }
    );
    res.status(201).json(cat);
  } catch (e) { res.status(422).json({ error: e.message }); }
});

router.put('/:id', auth, role('admin', 'manager'), async (req, res) => {
  try {
    const [[existing]] = await req.db.query(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      { replacements: [req.params.id] }
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
    let slug = existing.slug || makeSlug(existing.name);
    if (name !== existing.name) {
      slug = await uniqueSlug(req.db, makeSlug(name), req.params.id);
    }

    await req.db.query(
      'UPDATE categories SET name = ?, slug = ?, updated_at = ? WHERE id = ?',
      { replacements: [name, slug, now(), req.params.id] }
    );
    const [[cat]] = await req.db.query(
      'SELECT * FROM categories WHERE id = ?',
      { replacements: [req.params.id] }
    );
    res.status(200).json(cat);
  } catch (e) { res.status(422).json({ error: e.message }); }
});

router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  try {
    const [[existing]] = await req.db.query(
      'SELECT id FROM categories WHERE id = ? LIMIT 1',
      { replacements: [req.params.id] }
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await req.db.query('DELETE FROM categories WHERE id = ?', { replacements: [req.params.id] });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(422).json({ error: e.message }); }
});

module.exports = router;
