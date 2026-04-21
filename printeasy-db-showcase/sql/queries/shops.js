'use strict';

const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

function create(data) {
  const db = getDb();
  const { shop_name, email, contact, status = 'active', address } = data;
  const uuid = data.uuid || uuidv4();

  const insertShop = db.transaction(() => {
    const shopStmt = db.prepare(`
      INSERT INTO shops (uuid, shop_name, email, contact, status)
      VALUES (@uuid, @shop_name, @email, @contact, @status)
    `);
    const shopResult = shopStmt.run({ uuid, shop_name, email: email || null, contact, status });
    const shopId = shopResult.lastInsertRowid;

    if (address) {
      const { address: addr, area, city, pincode, local_ip } = address;
      db.prepare(`
        INSERT INTO shop_address (shop_id, address, area, city, pincode, local_ip)
        VALUES (@shop_id, @address, @area, @city, @pincode, @local_ip)
      `).run({ shop_id: shopId, address: addr, area: area || null, city, pincode, local_ip: local_ip || null });
    }

    return { id: shopId, uuid };
  });

  return insertShop();
}

function findAll() {
  const db = getDb();
  return db.prepare(`
    SELECT
      s.*,
      sa.address, sa.area, sa.city, sa.pincode, sa.local_ip,
      COUNT(DISTINCT p.printer_id) AS printer_count,
      COUNT(DISTINCT pr.pricing_id) AS pricing_count
    FROM shops s
    LEFT JOIN shop_address sa ON sa.shop_id = s.shop_id
    LEFT JOIN printers p      ON p.shop_id  = s.shop_id
    LEFT JOIN pricing pr      ON pr.shop_id = s.shop_id
    GROUP BY s.shop_id
    ORDER BY s.created_at DESC
  `).all();
}

function findById(id) {
  const db = getDb();
  const shop = db.prepare(`SELECT * FROM shops WHERE shop_id = ?`).get(id);
  if (!shop) return null;
  shop.address    = db.prepare(`SELECT * FROM shop_address WHERE shop_id = ?`).get(id);
  shop.printers   = db.prepare(`SELECT * FROM printers WHERE shop_id = ?`).all(id);
  shop.pricing    = db.prepare(`SELECT * FROM pricing WHERE shop_id = ?`).all(id);
  shop.networks   = db.prepare(`SELECT * FROM network_config WHERE shop_id = ?`).all(id);
  return shop;
}

function update(id, data) {
  const db = getDb();
  const fields = Object.keys(data).filter(k => ['shop_name','email','contact','status'].includes(k));
  if (fields.length === 0) return { changes: 0 };
  const setClause = fields.map(f => `${f} = @${f}`).join(', ');
  const result = db.prepare(`UPDATE shops SET ${setClause} WHERE shop_id = @id`).run({ ...data, id });
  return { changes: result.changes };
}

function remove(id) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM shops WHERE shop_id = ?`).run(id);
  return { changes: result.changes };
}

// Advanced: Pricing lookup — find price for given shop+color+paper+finish
function pricingLookup({ shop_id, color_type, paper_size, finishing_type = 'none' }) {
  const db = getDb();
  return db.prepare(`
    SELECT
      p.*,
      s.shop_name
    FROM pricing p
    JOIN shops s ON s.shop_id = p.shop_id
    WHERE p.shop_id       = @shop_id
      AND p.color_type    = @color_type
      AND p.paper_size    = @paper_size
      AND p.finishing_type = @finishing_type
  `).get({ shop_id, color_type, paper_size, finishing_type });
}

// Advanced: Revenue report — total revenue per shop with job count
function revenueReport() {
  const db = getDb();
  return db.prepare(`
    SELECT
      s.shop_id,
      s.shop_name,
      s.contact,
      COUNT(pj.job_id)  AS total_jobs,
      SUM(p.amount)     AS total_revenue,
      AVG(p.amount)     AS avg_payment,
      MAX(p.paid_at)    AS last_payment_at
    FROM shops s
    JOIN print_jobs pj ON pj.shop_id = s.shop_id
    JOIN payments p    ON p.job_id   = pj.job_id
    WHERE p.status = 'success'
    GROUP BY s.shop_id
    ORDER BY total_revenue DESC
  `).all();
}

module.exports = { create, findAll, findById, update, remove, pricingLookup, revenueReport };
