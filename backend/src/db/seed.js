const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');
const config = require('../config');

async function seedStaffUser() {
  console.log('----------------------------------------------------');
  console.log('[Seed] Seeding initial development staff account...');
  console.log('----------------------------------------------------');

  const email = config.seed.email;
  const password = config.seed.password;

  if (!email || !password) {
    console.error('[Seed Error]: SEED_STAFF_EMAIL or SEED_STAFF_PASSWORD environment variable is missing.');
    process.exitCode = 1;
    return;
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Hash password with bcrypt (10 salt rounds)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert or update staff user safely and repeatably using parameterized query
    const insertQuery = `
      INSERT INTO staff_users (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email)
      DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email, created_at;
    `;

    const res = await query(insertQuery, [normalizedEmail, passwordHash]);
    const seededUser = res.rows[0];

    console.log(`[Seed] Staff user processed successfully!`);
    console.log(`[Seed] ID: ${seededUser.id}`);
    console.log(`[Seed] Email: ${seededUser.email}`);
    console.log(`[Seed] Created: ${seededUser.created_at}`);

    // Check if inquiries exist; if not, seed initial sample inquiries
    const inquiryCountRes = await query('SELECT COUNT(*)::int AS count FROM inquiries;');
    if (inquiryCountRes.rows[0].count === 0) {
      console.log('[Seed] Seeding initial sample customer inquiries...');
      const sampleInquiries = [
        {
          customer_name: 'Sarah Jenkins',
          contact_info: 'sarah.jenkins@peakroasters.com',
          subject: 'Wholesale Espresso Beans Inquiry',
          description: 'Inquiring about bulk discount rates and delivery schedules for 50kg monthly orders of Dark Roast Espresso Blend.',
          status: 'New',
        },
        {
          customer_name: 'Marcus Chen',
          contact_info: '+1 (555) 234-5678',
          subject: 'Commercial Espresso Machine Maintenance Request',
          description: 'Our dual-boiler commercial unit at Downtown Cafe has a steam pressure inconsistency. Requesting a technician visit this Thursday.',
          status: 'In Progress',
        },
        {
          customer_name: 'Elena Rostova',
          contact_info: 'elena@brewandbake.org',
          subject: 'Cold Brew Keg Delivery Frequency',
          description: 'Need confirmation on bi-weekly delivery schedule for nitrogen-infused cold brew kegs starting next Monday.',
          status: 'Resolved',
        },
      ];

      for (const item of sampleInquiries) {
        await query(
          `INSERT INTO inquiries (customer_name, contact_info, subject, description, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [item.customer_name, item.contact_info, item.subject, item.description, item.status, seededUser.id]
        );
      }
      console.log(`[Seed] Seeded ${sampleInquiries.length} sample customer inquiries.`);
    }
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('[Seed Error]: Failed to seed staff user.');
    console.error('[Seed Error]:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedStaffUser();
