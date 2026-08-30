/**
 * Hardware shop seed — categories + sample products.
 *
 * Usage:
 *   node scripts/seed-hardware.js <host>
 *   node scripts/seed-hardware.js <host> --clear   (remove existing categories & products first)
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const getModels     = require('../src/models');
const tenants       = require('../src/config/tenants');

const host  = process.argv[2];
const clear = process.argv.includes('--clear');

if (!host) {
  console.log('Usage:');
  console.log('  node scripts/seed-hardware.js <host>');
  console.log('  node scripts/seed-hardware.js <host> --clear   (wipe categories & products first)');
  process.exit(1);
}

const tenant = tenants[host];
if (!tenant) {
  console.error(`\x1b[31m✖\x1b[0m  "${host}" not in src/config/tenants.js`);
  process.exit(1);
}

const log  = m => console.log(`\x1b[32m✔\x1b[0m  ${m}`);
const warn = m => console.log(`\x1b[33m⚠\x1b[0m  ${m}`);

// ── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Nails & Screws',      name_si: 'ඇණ හා ඉස්කුරුප්පු' },
  { name: 'Paint & Accessories', name_si: 'තීන්ත හා උපාංග' },
  { name: 'Electrical',          name_si: 'විදුලි' },
  { name: 'Plumbing',            name_si: 'නළ' },
  { name: 'Hand Tools',          name_si: 'ඕනෑ' },
  { name: 'Power Tools',         name_si: 'පවර් ටූල්ස්' },
  { name: 'Locks & Hardware',    name_si: 'අගුලු' },
  { name: 'Adhesives & Sealants',name_si: 'ඇලවීම' },
  { name: 'Safety',              name_si: 'ආරක්ෂාව' },
  { name: 'General',             name_si: 'සාමාන්‍ය' },
];

// ── Products ─────────────────────────────────────────────────────────────────
// { name, name_si, barcode, category, unit, cost_price, selling_price, stock_qty, alert_qty }
const PRODUCTS = [
  // Nails & Screws
  { name: 'Wire Nails 1"',        name_si: 'කම්බි ඇණ 1"',       category: 'Nails & Screws',       unit: 'kg',   cost_price: 380,  selling_price: 450,  stock_qty: 50,  alert_qty: 10 },
  { name: 'Wire Nails 2"',        name_si: 'කම්බි ඇණ 2"',       category: 'Nails & Screws',       unit: 'kg',   cost_price: 360,  selling_price: 420,  stock_qty: 50,  alert_qty: 10 },
  { name: 'Wire Nails 3"',        name_si: 'කම්බි ඇණ 3"',       category: 'Nails & Screws',       unit: 'kg',   cost_price: 340,  selling_price: 400,  stock_qty: 50,  alert_qty: 10 },
  { name: 'Screw 1" x 8 (100pcs)',name_si: 'ඉස්කුරුප්පු 1"',   category: 'Nails & Screws',       unit: 'pkt',  cost_price: 150,  selling_price: 200,  stock_qty: 30,  alert_qty: 5 },
  { name: 'Screw 2" x 8 (100pcs)',name_si: 'ඉස්කුරුප්පු 2"',   category: 'Nails & Screws',       unit: 'pkt',  cost_price: 180,  selling_price: 240,  stock_qty: 30,  alert_qty: 5 },
  { name: 'Masonry Screw 6x50',   name_si: 'කොන්ක්‍රීට් ඇණ',   category: 'Nails & Screws',       unit: 'pcs',  cost_price: 8,    selling_price: 12,   stock_qty: 200, alert_qty: 50 },
  { name: 'Bolt & Nut M8x50',     name_si: 'බෝල්ට් M8',         category: 'Nails & Screws',       unit: 'pcs',  cost_price: 20,   selling_price: 30,   stock_qty: 100, alert_qty: 20 },

  // Paint & Accessories
  { name: 'Wall Paint White 1L',  name_si: 'බිත්ති තීන්ත සුදු', category: 'Paint & Accessories',  unit: 'pcs',  cost_price: 650,  selling_price: 800,  stock_qty: 20,  alert_qty: 5 },
  { name: 'Wall Paint White 4L',  name_si: 'බිත්ති තීන්ත 4L',   category: 'Paint & Accessories',  unit: 'pcs',  cost_price: 2400, selling_price: 2900, stock_qty: 10,  alert_qty: 3 },
  { name: 'Gloss Paint 1L',       name_si: 'ග්ලොස් තීන්ත 1L',   category: 'Paint & Accessories',  unit: 'pcs',  cost_price: 750,  selling_price: 950,  stock_qty: 15,  alert_qty: 3 },
  { name: 'Paint Brush 1"',       name_si: 'බ්‍රෂ් 1"',          category: 'Paint & Accessories',  unit: 'pcs',  cost_price: 60,   selling_price: 90,   stock_qty: 30,  alert_qty: 5 },
  { name: 'Paint Brush 2"',       name_si: 'බ්‍රෂ් 2"',          category: 'Paint & Accessories',  unit: 'pcs',  cost_price: 90,   selling_price: 130,  stock_qty: 30,  alert_qty: 5 },
  { name: 'Paint Roller 9"',      name_si: 'රෝලර් 9"',           category: 'Paint & Accessories',  unit: 'pcs',  cost_price: 180,  selling_price: 250,  stock_qty: 20,  alert_qty: 5 },
  { name: 'Sandpaper 80 Grit',    name_si: 'සෑන්ඩ් පේපර් 80',   category: 'Paint & Accessories',  unit: 'pcs',  cost_price: 25,   selling_price: 40,   stock_qty: 100, alert_qty: 20 },
  { name: 'Putty Powder 1kg',     name_si: 'පුටි 1kg',           category: 'Paint & Accessories',  unit: 'pcs',  cost_price: 120,  selling_price: 160,  stock_qty: 30,  alert_qty: 5 },

  // Electrical
  { name: 'Switch 1-Gang',        name_si: 'ස්විච් 1',           category: 'Electrical',           unit: 'pcs',  cost_price: 90,   selling_price: 130,  stock_qty: 50,  alert_qty: 10 },
  { name: 'Switch 2-Gang',        name_si: 'ස්විච් 2',           category: 'Electrical',           unit: 'pcs',  cost_price: 130,  selling_price: 180,  stock_qty: 30,  alert_qty: 5 },
  { name: 'Socket 2-Pin',         name_si: 'සොකට් 2-Pin',        category: 'Electrical',           unit: 'pcs',  cost_price: 100,  selling_price: 150,  stock_qty: 40,  alert_qty: 10 },
  { name: 'Socket 3-Pin',         name_si: 'සොකට් 3-Pin',        category: 'Electrical',           unit: 'pcs',  cost_price: 130,  selling_price: 185,  stock_qty: 40,  alert_qty: 10 },
  { name: 'Wire 1.5mm (per m)',   name_si: 'කම්බි 1.5mm',        category: 'Electrical',           unit: 'm',    cost_price: 55,   selling_price: 75,   stock_qty: 200, alert_qty: 30 },
  { name: 'Wire 2.5mm (per m)',   name_si: 'කම්බි 2.5mm',        category: 'Electrical',           unit: 'm',    cost_price: 90,   selling_price: 120,  stock_qty: 200, alert_qty: 30 },
  { name: 'MCB 16A Single Pole',  name_si: 'MCB 16A',            category: 'Electrical',           unit: 'pcs',  cost_price: 450,  selling_price: 600,  stock_qty: 20,  alert_qty: 5 },
  { name: 'LED Bulb 9W',          name_si: 'LED බල්බ 9W',        category: 'Electrical',           unit: 'pcs',  cost_price: 180,  selling_price: 250,  stock_qty: 50,  alert_qty: 10 },
  { name: 'LED Bulb 15W',         name_si: 'LED බල්බ 15W',       category: 'Electrical',           unit: 'pcs',  cost_price: 280,  selling_price: 380,  stock_qty: 30,  alert_qty: 5 },
  { name: 'Extension Cord 5m',    name_si: 'එක්ස්ටෙන්ෂන් 5m',   category: 'Electrical',           unit: 'pcs',  cost_price: 700,  selling_price: 950,  stock_qty: 15,  alert_qty: 3 },

  // Plumbing
  { name: 'PVC Pipe 1/2" (per m)',name_si: 'PVC නළ 1/2"',        category: 'Plumbing',             unit: 'm',    cost_price: 65,   selling_price: 90,   stock_qty: 100, alert_qty: 20 },
  { name: 'PVC Pipe 3/4" (per m)',name_si: 'PVC නළ 3/4"',        category: 'Plumbing',             unit: 'm',    cost_price: 100,  selling_price: 140,  stock_qty: 80,  alert_qty: 15 },
  { name: 'PVC Pipe 1" (per m)',  name_si: 'PVC නළ 1"',          category: 'Plumbing',             unit: 'm',    cost_price: 150,  selling_price: 200,  stock_qty: 60,  alert_qty: 10 },
  { name: 'Elbow 1/2"',          name_si: 'ඉළිඛ් 1/2"',         category: 'Plumbing',             unit: 'pcs',  cost_price: 15,   selling_price: 25,   stock_qty: 100, alert_qty: 20 },
  { name: 'Tee 1/2"',            name_si: 'ටී 1/2"',            category: 'Plumbing',             unit: 'pcs',  cost_price: 18,   selling_price: 28,   stock_qty: 80,  alert_qty: 15 },
  { name: 'Ball Valve 1/2"',     name_si: 'බෝල් වාල්ව 1/2"',    category: 'Plumbing',             unit: 'pcs',  cost_price: 180,  selling_price: 250,  stock_qty: 20,  alert_qty: 5 },
  { name: 'Tap (Wall Type)',      name_si: 'කරාම',               category: 'Plumbing',             unit: 'pcs',  cost_price: 350,  selling_price: 500,  stock_qty: 15,  alert_qty: 3 },
  { name: 'Teflon Tape',         name_si: 'ටෙෆ්ලෝ ටේප්',        category: 'Plumbing',             unit: 'pcs',  cost_price: 25,   selling_price: 40,   stock_qty: 50,  alert_qty: 10 },

  // Hand Tools
  { name: 'Hammer 500g',         name_si: 'මිටිය 500g',          category: 'Hand Tools',           unit: 'pcs',  cost_price: 350,  selling_price: 500,  stock_qty: 10,  alert_qty: 2 },
  { name: 'Screwdriver Flat 6"', name_si: 'ඉස්කෝව ෆ්ලැට්',     category: 'Hand Tools',           unit: 'pcs',  cost_price: 80,   selling_price: 120,  stock_qty: 15,  alert_qty: 3 },
  { name: 'Screwdriver Phillips',name_si: 'ඉස්කෝව ෆිලිප්ස්',    category: 'Hand Tools',           unit: 'pcs',  cost_price: 80,   selling_price: 120,  stock_qty: 15,  alert_qty: 3 },
  { name: 'Pliers 8"',           name_si: 'ප්ලයර්ස් 8"',        category: 'Hand Tools',           unit: 'pcs',  cost_price: 280,  selling_price: 400,  stock_qty: 10,  alert_qty: 2 },
  { name: 'Hacksaw',             name_si: 'යකඩ කියත',            category: 'Hand Tools',           unit: 'pcs',  cost_price: 350,  selling_price: 500,  stock_qty: 8,   alert_qty: 2 },
  { name: 'Hacksaw Blade (pkt)', name_si: 'කියත් තල',           category: 'Hand Tools',           unit: 'pkt',  cost_price: 120,  selling_price: 180,  stock_qty: 20,  alert_qty: 5 },
  { name: 'Tape Measure 5m',     name_si: 'ෆීතා 5m',            category: 'Hand Tools',           unit: 'pcs',  cost_price: 250,  selling_price: 380,  stock_qty: 10,  alert_qty: 2 },
  { name: 'Spirit Level 24"',    name_si: 'ලෙවල් 24"',          category: 'Hand Tools',           unit: 'pcs',  cost_price: 550,  selling_price: 800,  stock_qty: 5,   alert_qty: 1 },

  // Power Tools
  { name: 'Drill Bit 6mm',       name_si: 'ඩ්‍රිල් බිට් 6mm',   category: 'Power Tools',          unit: 'pcs',  cost_price: 60,   selling_price: 90,   stock_qty: 20,  alert_qty: 5 },
  { name: 'Drill Bit 8mm',       name_si: 'ඩ්‍රිල් බිට් 8mm',   category: 'Power Tools',          unit: 'pcs',  cost_price: 80,   selling_price: 120,  stock_qty: 20,  alert_qty: 5 },
  { name: 'Drill Bit 10mm',      name_si: 'ඩ්‍රිල් බිට් 10mm',  category: 'Power Tools',          unit: 'pcs',  cost_price: 100,  selling_price: 150,  stock_qty: 15,  alert_qty: 3 },
  { name: 'Grinding Disc 4"',    name_si: 'ග්‍රයින්ඩිං ඩිස්ක්', category: 'Power Tools',          unit: 'pcs',  cost_price: 60,   selling_price: 90,   stock_qty: 30,  alert_qty: 10 },
  { name: 'Cutting Disc 4"',     name_si: 'කටිං ඩිස්ක්',        category: 'Power Tools',          unit: 'pcs',  cost_price: 70,   selling_price: 100,  stock_qty: 30,  alert_qty: 10 },

  // Locks & Hardware
  { name: 'Padlock 40mm',        name_si: 'ලොකු අගුල 40mm',     category: 'Locks & Hardware',     unit: 'pcs',  cost_price: 280,  selling_price: 400,  stock_qty: 15,  alert_qty: 3 },
  { name: 'Padlock 60mm',        name_si: 'ලොකු අගුල 60mm',     category: 'Locks & Hardware',     unit: 'pcs',  cost_price: 450,  selling_price: 650,  stock_qty: 10,  alert_qty: 2 },
  { name: 'Door Handle',         name_si: 'දොර හැඩල',           category: 'Locks & Hardware',     unit: 'pcs',  cost_price: 350,  selling_price: 500,  stock_qty: 10,  alert_qty: 2 },
  { name: 'Hinge 3" (pair)',     name_si: 'කර්ණිකා 3"',         category: 'Locks & Hardware',     unit: 'pair', cost_price: 80,   selling_price: 120,  stock_qty: 30,  alert_qty: 5 },
  { name: 'Hinge 4" (pair)',     name_si: 'කර්ණිකා 4"',         category: 'Locks & Hardware',     unit: 'pair', cost_price: 120,  selling_price: 180,  stock_qty: 20,  alert_qty: 5 },
  { name: 'Door Bolt 6"',        name_si: 'දොර බෝල්ට්',         category: 'Locks & Hardware',     unit: 'pcs',  cost_price: 60,   selling_price: 90,   stock_qty: 20,  alert_qty: 5 },

  // Adhesives & Sealants
  { name: 'Araldite (tube)',     name_si: 'ඇරල්ඩයිට්',          category: 'Adhesives & Sealants', unit: 'pcs',  cost_price: 120,  selling_price: 180,  stock_qty: 20,  alert_qty: 5 },
  { name: 'PVC Solvent 125ml',   name_si: 'PVC සොල්වෙන්ට්',     category: 'Adhesives & Sealants', unit: 'pcs',  cost_price: 150,  selling_price: 220,  stock_qty: 15,  alert_qty: 3 },
  { name: 'Silicone Sealant',    name_si: 'සිලිකොන්',           category: 'Adhesives & Sealants', unit: 'pcs',  cost_price: 350,  selling_price: 500,  stock_qty: 10,  alert_qty: 2 },
  { name: 'Wood Glue 250ml',     name_si: 'ලී ඇලවුම් 250ml',    category: 'Adhesives & Sealants', unit: 'pcs',  cost_price: 180,  selling_price: 260,  stock_qty: 10,  alert_qty: 2 },
  { name: 'Masking Tape 1"',     name_si: 'මාස්කිං ටේප්',       category: 'Adhesives & Sealants', unit: 'pcs',  cost_price: 80,   selling_price: 120,  stock_qty: 20,  alert_qty: 5 },

  // Safety
  { name: 'Safety Gloves (pair)',name_si: 'ආරක්ෂා අත්වැසුම',    category: 'Safety',               unit: 'pair', cost_price: 60,   selling_price: 90,   stock_qty: 20,  alert_qty: 5 },
  { name: 'Safety Glasses',      name_si: 'ආරක්ෂා කණ්ණාඩි',    category: 'Safety',               unit: 'pcs',  cost_price: 150,  selling_price: 220,  stock_qty: 10,  alert_qty: 2 },
  { name: 'Face Mask (box 50)',  name_si: 'මාස්ක් (50)',         category: 'Safety',               unit: 'box',  cost_price: 350,  selling_price: 500,  stock_qty: 10,  alert_qty: 2 },

  // General
  { name: 'Cable Tie 100mm (pkt)',name_si: 'කේබල් ටයි 100mm',   category: 'General',              unit: 'pkt',  cost_price: 80,   selling_price: 120,  stock_qty: 20,  alert_qty: 5 },
  { name: 'Cable Tie 200mm (pkt)',name_si: 'කේබල් ටයි 200mm',   category: 'General',              unit: 'pkt',  cost_price: 120,  selling_price: 180,  stock_qty: 20,  alert_qty: 5 },
  { name: 'Measuring Tape 3m',   name_si: 'ෆීතා 3m',            category: 'General',              unit: 'pcs',  cost_price: 150,  selling_price: 220,  stock_qty: 10,  alert_qty: 2 },
  { name: 'WD-40 Spray 300ml',   name_si: 'WD-40',              category: 'General',              unit: 'pcs',  cost_price: 900,  selling_price: 1300, stock_qty: 10,  alert_qty: 2 },
  { name: 'Grease (tube)',        name_si: 'ග්‍රීස්',            category: 'General',              unit: 'pcs',  cost_price: 120,  selling_price: 180,  stock_qty: 10,  alert_qty: 2 },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n\x1b[1m── Hardware Seed: ${host} ──\x1b[0m\n`);

  const seq = new Sequelize(tenant.database, tenant.username, tenant.password, {
    host:    tenant.host || process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });

  await seq.authenticate();
  const { Category, Product } = getModels(seq);

  if (clear) {
    console.log('\x1b[33m⚠\x1b[0m  Clearing products and categories...');
    await Product.destroy({ where: {}, truncate: false });
    await Category.destroy({ where: {}, truncate: false });
    log('Cleared.');
  }

  // ── Categories ──
  console.log('\n\x1b[1mCategories\x1b[0m');
  const catMap = {};
  for (const c of CATEGORIES) {
    const [row, created] = await Category.findOrCreate({ where: { name: c.name }, defaults: c });
    catMap[c.name] = row;
    created ? log(`Created: ${c.name}`) : warn(`Exists:  ${c.name}`);
  }

  // ── Products ──
  console.log('\n\x1b[1mProducts\x1b[0m');
  let created = 0, skipped = 0;
  for (const p of PRODUCTS) {
    const cat = catMap[p.category];
    const exists = await Product.findOne({ where: { name: p.name } });
    if (exists) { warn(`Exists:  ${p.name}`); skipped++; continue; }

    const barcode = p.name.replace(/\s+/g, '').toUpperCase().slice(0, 6) + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();

    await Product.create({
      name:          p.name,
      name_si:       p.name_si || null,
      barcode,
      category_id:   cat ? cat.id : null,
      unit:          p.unit   || 'pcs',
      cost_price:    p.cost_price,
      selling_price: p.selling_price,
      wholesale_price: Math.round(p.selling_price * 0.9),
      stock_qty:     p.stock_qty || 0,
      alert_qty:     p.alert_qty || 5,
      active:        true,
    });
    log(`Created: ${p.name}`);
    created++;
  }

  await seq.close();
  console.log(`\n\x1b[1mDone.\x1b[0m  Created: ${created}  Skipped: ${skipped}\n`);
}

main().catch(e => { console.error(`\x1b[31m✖\x1b[0m  ${e.message}`); process.exit(1); });
