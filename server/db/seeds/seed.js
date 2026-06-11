// server/db/seeds/seed.js
const pool = require("../../config/db");
const bcrypt = require("bcryptjs");

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const hash = await bcrypt.hash("Password123!", 10);

    // Seed admin
    const adminUser = await client.query(
      `INSERT INTO users (name, phone_number, email, password_hash, role, status)
       VALUES ($1,$2,$3,$4,'admin','active') RETURNING user_id`,
      ["System Admin", "+254700000001", "admin@waste.ke", hash],
    );
    await client.query(
      `INSERT INTO admins (user_id, assigned_region) VALUES ($1, 'Nairobi')`,
      [adminUser.rows[0].user_id],
    );

    // Seed collector
    const collectorUser = await client.query(
      `INSERT INTO users (name, phone_number, email, password_hash, role, status)
       VALUES ($1,$2,$3,$4,'collector','active') RETURNING user_id`,
      ["Test Collector", "+254711111111", "collector@waste.ke", hash],
    );
    const collector = await client.query(
      `INSERT INTO collectors (user_id, residence, house_number)
       VALUES ($1,'Westlands, Nairobi','A12') RETURNING collector_id`,
      [collectorUser.rows[0].user_id],
    );
    await client.query(
      `INSERT INTO gamification_records (collector_id, total_points)
       VALUES ($1, 0)`,
      [collector.rows[0].collector_id],
    );

    // Seed buyer
    const buyerUser = await client.query(
      `INSERT INTO users (name, phone_number, email, password_hash, role, status)
       VALUES ($1,$2,$3,$4,'buyer','active') RETURNING user_id`,
      ["GreenCycle Ltd", "+254722222222", "buyer@waste.ke", hash],
    );
    const buyer = await client.query(
      `INSERT INTO buyers (user_id, organisation_name)
       VALUES ($1,'GreenCycle Ltd') RETURNING buyer_id`,
      [buyerUser.rows[0].user_id],
    );
    await client.query(
      `INSERT INTO buyer_offers (buyer_id, category, price_per_kg, min_quantity_kg, zone)
       VALUES ($1,'plastic',28.00,20.00,'Westlands')`,
      [buyer.rows[0].buyer_id],
    );

    // Seed coordinator
    const coordUser = await client.query(
      `INSERT INTO users (name, phone_number, email, password_hash, role, status)
       VALUES ($1,$2,$3,$4,'coordinator','active') RETURNING user_id`,
      ["Env Coordinator", "+254733333333", "coord@waste.ke", hash],
    );
    await client.query(
      `INSERT INTO environmental_coordinators (user_id, organisation)
       VALUES ($1,'Nairobi Environment Trust')`,
      [coordUser.rows[0].user_id],
    );

    // Seed 5 waste logs
    const logData = [
      ["plastic", 25.0, -1.2677, 36.8031],
      ["metal", 12.5, -1.28, 36.82],
      ["organic", 30.0, -1.2921, 36.8219],
      ["plastic", 18.0, -1.3, 36.81],
      ["e-waste", 5.0, -1.275, 36.815],
    ];
    for (const [cat, weight, lat, lng] of logData) {
      await client.query(
        `INSERT INTO waste_logs
           (collector_id, category, weight_kg, location, latitude, longitude, source)
         VALUES ($1, $2, $3,
           ST_SetSRID(ST_MakePoint($5,$4), 4326)::geography,
           $4, $5, 'web')`,
        [collector.rows[0].collector_id, cat, weight, lat, lng],
      );
    }

    await client.query("COMMIT");
    console.log("✅ Seed complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
