const mysql = require('mysql2/promise');
require('dotenv').config();

const prefixMap = {
  'Invoice': 'INV',
  'Bill of Lading': 'BOL',
  'Customer Paperwork': 'CUST',
  'Packing List': 'PKL',
  'Other': 'OTH'
};

async function main() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'ejeff',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image_path VARCHAR(512) NOT NULL,
      document_number VARCHAR(64) NOT NULL,
      upload_date DATETIME NOT NULL,
      document_type ENUM('Invoice', 'Bill of Lading', 'Customer Paperwork', 'Packing List', 'Other') NOT NULL,
      description VARCHAR(512),
      customer_name VARCHAR(128),
      shipment_status ENUM('In Transit','Pending','Delivered') NOT NULL,
      document_summary TEXT,
      estimated_delivery_date DATETIME NULL
    )
  `);

  const samples = [
    {
      document_type: 'Invoice',
      description: 'Invoice for Q3 electronics shipment.',
      customer_name: 'Acme Corp',
      shipment_status: 'Pending',
      document_summary: 'Invoice #2345 for shipment 1203, net-30 terms, amount $12,540.',
      image_path: 'https://picsum.photos/seed/invoice1/920/600'
    },
    {
      document_type: 'Bill of Lading',
      description: 'BOL for ocean freight from Shenzhen.',
      customer_name: 'Global Trade LLC',
      shipment_status: 'In Transit',
      document_summary: 'BOL #7731, vessel: Oceanic Star, ETA 2025-01-15.',
      image_path: 'https://picsum.photos/seed/bol1/920/600'
    },
    {
      document_type: 'Customer Paperwork',
      description: 'Customs declaration paperwork for EU import.',
      customer_name: 'EuroGoods Ltd',
      shipment_status: 'Pending',
      document_summary: 'CN23 form filled, tariff code 8517, awaiting clearance.',
      image_path: 'https://picsum.photos/seed/customers1/920/600'
    },
    {
      document_type: 'Packing List',
      description: 'Packing list for 200 units of routers.',
      customer_name: 'Acme Corp',
      shipment_status: 'Delivered',
      document_summary: 'PL #5512, cartons: 20, weight: 320kg, delivered 2025-11-01.',
      image_path: 'https://picsum.photos/seed/packing1/920/600'
    },
    {
      document_type: 'Other',
      description: 'Supplier certificate of origin.',
      customer_name: 'Shenzhen Tech Co',
      shipment_status: 'In Transit',
      document_summary: 'COO confirms origin CN, HS validation done.',
      image_path: 'https://picsum.photos/seed/other1/920/600'
    },
    {
      document_type: 'Invoice',
      description: 'Invoice for replacement parts.',
      customer_name: 'RepairWorks Inc',
      shipment_status: 'Delivered',
      document_summary: 'Invoice #8821 for replacement parts post-shipment.',
      image_path: 'https://picsum.photos/seed/invoice2/920/600'
    },
    {
      document_type: 'Bill of Lading',
      description: 'BOL for inland trucking segment.',
      customer_name: 'Global Trade LLC',
      shipment_status: 'Pending',
      document_summary: 'BOL #8890 for trucking from port to DC.',
      image_path: 'https://picsum.photos/seed/bol2/920/600'
    },
    {
      document_type: 'Packing List',
      description: 'Packing list for spare components.',
      customer_name: 'EuroGoods Ltd',
      shipment_status: 'Delivered',
      document_summary: 'PL #9901, delivered to customer warehouse.',
      image_path: 'https://picsum.photos/seed/packing2/920/600'
    }
  ];

  const now = new Date();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const prefix = prefixMap[s.document_type] || 'DOC';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const docNum = `${prefix}-${datePart}-${String(i + 1).padStart(3, '0')}`;

    // Generate estimated delivery within next 7–30 days depending on status
    const daysAhead = s.shipment_status === 'Delivered' ? 0 : (7 + Math.floor(Math.random() * 23));
    const est = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const estDate = s.shipment_status === 'Delivered' ? now : est;

    await pool.query(
      'INSERT INTO documents (image_path, document_number, upload_date, document_type, description, customer_name, shipment_status, document_summary, estimated_delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [s.image_path, docNum, now, s.document_type, s.description, s.customer_name, s.shipment_status, s.document_summary, estDate]
    );
  }

  console.log('Seed data inserted.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});