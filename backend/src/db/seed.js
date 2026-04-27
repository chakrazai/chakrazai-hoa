require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./index');

async function seed() {
  console.log('Seeding database...');

  // Admin user
  const hash = await bcrypt.hash('password123', 12);
  const user = await db.query(`
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES ('admin@demo.com', $1, 'Jane', 'Ramirez', 'board_president')
    ON CONFLICT (email) DO NOTHING RETURNING id
  `, [hash]);

  // Community
  const comm = await db.query(`
    INSERT INTO communities (name, units, type, state, tier)
    VALUES ('Oakwood Estates HOA', 148, 'Self-managed', 'California', 'Full Service')
    ON CONFLICT DO NOTHING RETURNING id
  `);

  if (comm.rows.length && user.rows.length) {
    await db.query(`
      INSERT INTO user_communities (user_id, community_id, role)
      VALUES ($1, $2, 'board_president') ON CONFLICT DO NOTHING
    `, [user.rows[0].id, comm.rows[0].id]);

    const cid = comm.rows[0].id;

    // Residents
    const residentData = [
      ['Unit 1',  'Alex Thompson',  'a.thompson@email.com', 'active',  true,  'good'],
      ['Unit 12', 'Diana Foster',   'd.foster@email.com',   'invited', false, 'delinquent'],
      ['Unit 33', 'Michael Torres', 'm.torres@email.com',   'none',    false, 'collections'],
      ['Unit 42', 'Sarah Chen',     's.chen@email.com',     'active',  true,  'good'],
      ['Unit 44', 'Carlos Rivera',  'c.rivera@email.com',   'active',  false, 'violation'],
      ['Unit 55', 'Kevin Zhang',    'k.zhang@email.com',    'active',  false, 'delinquent'],
      ['Unit 67', 'Amanda Liu',     'a.liu@email.com',      'active',  false, 'delinquent'],
    ];
    for (const [unit, name, email, portal, autoPay, status] of residentData) {
      await db.query(`
        INSERT INTO residents (community_id, unit, owner_name, email, portal_status, auto_pay)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING
      `, [cid, unit, name, email, portal, autoPay]);
    }

    // Compliance alerts
    const alerts = [
      ['ca','AB 130','Fine Schedule Caps','Fines capped at $100/violation.','Your schedule has 3 fines exceeding the cap.','action_required','2025',null],
      ['ca','SB 326','Balcony Inspections','Professional inspection required.','Not yet scheduled. 187 days remaining.','warning','Jan 1, 2026',187],
      ['ca','AB 2159','Electronic Voting','HOAs may offer electronic voting.','System configured and compliant.','compliant','2025',null],
      ['ca','SB 900','Utility Repairs (14-Day)','14-day repair commencement required.','SLA tracking active.','compliant','2025',null],
    ];
    for (const [state,law,title,summary,detail,status,eff,days] of alerts) {
      await db.query(`
        INSERT INTO compliance_alerts (state,law,title,summary,detail,status,effective_date,days_remaining)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING
      `, [state,law,title,summary,detail,status,eff,days]);
    }

    // Vendors
    const vendorData = [
      ['Greenscape Landscaping','Landscaping','Dec 31, 2025','valid',null,true,50400],
      ['AquaCare Pool Services','Pool & Spa','Jun 30, 2025','expiring','May 20',true,21600],
      ['ProPlumb Emergency','Plumbing','Ongoing','valid',null,true,18400],
      ['SecureWatch Security','Security','Sep 30, 2025','expiring','May 14',true,38400],
    ];
    for (const [name,cat,exp,coi,coiExp,w9,spend] of vendorData) {
      await db.query(`
        INSERT INTO vendors (community_id,name,category,contract_exp,coi_status,coi_exp,w9_on_file,annual_spend)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING
      `, [cid,name,cat,exp,coi,coiExp,w9,spend]);
    }

    // Work orders
    const woData = [
      ['WO-089','Pool Area','Pump making grinding noise','urgent',null,'scheduled',null],
      ['WO-088','Unit 12 Riser','Gas line repair — SB 900 SLA active','critical',null,'in_progress','14-day deadline: April 29'],
      ['WO-087','Building 1 Lobby','Front door lock malfunction','high',null,'in_progress',null],
      ['WO-086','Parking Lot B','3 lights non-functional','normal',null,'pending_vendor',null],
    ];
    for (const [wo,loc,issue,priority,vendor,status,sbRule] of woData) {
      await db.query(`
        INSERT INTO work_orders (community_id,wo_number,location,issue,priority,status,sb_rule)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
      `, [cid,wo,loc,issue,priority,status,sbRule]);
    }

    // Sample transactions
    const txData = [
      ['expense','Landscaping','Greenscape',4200,'April landscaping'],
      ['expense','Pool & Spa','AquaCare',1800,'April pool service'],
      ['expense','Security','SecureWatch',3200,'April security'],
      ['expense','Insurance','HOA Mutual',2400,'Monthly premium'],
      ['income','Dues','',21150,'April dues collected'],
    ];
    for (const [type,cat,vendor,amount,desc] of txData) {
      await db.query(`
        INSERT INTO transactions (community_id,type,category,vendor,amount,description)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [cid,type,cat,vendor,amount,desc]);
    }
  }

  console.log('✅ Seed complete — login with admin@demo.com / password123');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
