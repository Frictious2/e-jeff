const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // for form posts

// Allowed document types (make available in all templates)
const allowedTypes = ['Invoice', 'Bill of Lading', 'Customer Paperwork', 'Packing List', 'Other'];
app.use((req, res, next) => {
  res.locals.allowedTypes = allowedTypes;
  next();
});

// Ensure uploads directory exists BEFORE using multer
const uploadDir = path.join(__dirname, 'public', 'uploads', 'documents_gallery');
fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, Date.now() + '_' + base + ext);
  }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.render('layout', { title: 'E-Jeff Dashboard', page: 'pages/dashboard' });
});

// Replace gallery route to load from DB
app.get('/documents/gallery', async (req, res) => {
  const [docs] = await pool.query('SELECT * FROM documents ORDER BY upload_date DESC');
  res.render('layout', {
    title: 'Document Gallery',
    page: 'pages/documents_gallery',
    docs
  });
});

// Document Gallery with optional type filter
// In routes: ensure `selectedType` is passed to render
app.get('/documents/gallery', async (req, res) => {
    const selectedType = req.query.type;
    let query = 'SELECT * FROM documents';
    let params = [];
    if (selectedType && allowedTypes.includes(selectedType)) {
        query += ' WHERE document_type = ?';
        params.push(selectedType);
    }
    query += ' ORDER BY upload_date DESC';

    const [docs] = await pool.query(query, params);
    res.render('layout', {
        title: 'Document Gallery',
        page: 'pages/documents_gallery',
        docs,
        selectedType
    });
});

// Document List with optional type filter
app.get('/documents/list', async (req, res) => {
    const selectedType = req.query.type;
    let query = 'SELECT * FROM documents';
    let params = [];
    if (selectedType && allowedTypes.includes(selectedType)) {
        query += ' WHERE document_type = ?';
        params.push(selectedType);
    }
    query += ' ORDER BY upload_date DESC';

    const [docs] = await pool.query(query, params);
    res.render('layout', {
        title: 'Document List',
        page: 'pages/documents_list',
        docs,
        selectedType
    });
});

// Upload endpoint (include estimated delivery date)
app.post('/documents/upload', upload.single('image'), async (req, res) => {
  const { documentType, description, customerName, shipmentStatus, documentSummary, estimatedDelivery } = req.body;
  const prefixMap = { 'Invoice': 'INV', 'Bill of Lading': 'BOL', 'Customer Paperwork': 'CUST', 'Packing List': 'PKL', 'Other': 'OTH' };
  const prefix = prefixMap[documentType] || 'DOC';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const documentNumber = `${prefix}-${datePart}-${randomPart}`;

  const filePath = req.file
    ? path.join('uploads', 'documents_gallery', req.file.filename).replace(/\\/g, '/')
    : 'https://picsum.photos/seed/placeholder/920/600';

  const uploadDate = new Date();
  const estimatedDeliveryDate = estimatedDelivery ? new Date(estimatedDelivery) : null;

  await pool.query(
    'INSERT INTO documents (image_path, document_number, upload_date, document_type, description, customer_name, shipment_status, document_summary, estimated_delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [filePath, documentNumber, uploadDate, documentType, description, customerName, shipmentStatus, documentSummary, estimatedDeliveryDate]
  );

  res.redirect('/documents/gallery');
});

// Updates: Calendar page
app.get('/updates/calendar', async (req, res) => {
  res.render('layout', { title: 'Delivery Calendar', page: 'pages/updates_calendar' });
});

// Updates: Kanban page
app.get('/updates/kanban', async (req, res) => {
  const [docs] = await pool.query('SELECT * FROM documents ORDER BY upload_date DESC');
  res.render('layout', { title: 'Delivery Kanban', page: 'pages/updates_kanban', docs });
});

// Events API for FullCalendar
app.get('/api/updates/events', async (req, res) => {
  const type = req.query.type;
  let sql = 'SELECT id, document_number, document_type, customer_name, estimated_delivery_date FROM documents WHERE estimated_delivery_date IS NOT NULL';
  const params = [];
  if (type && allowedTypes.includes(type)) {
    sql += ' AND document_type = ?';
    params.push(type);
  }
  sql += ' ORDER BY estimated_delivery_date ASC';
  const [rows] = await pool.query(sql, params);
  const events = rows.map(r => ({
    id: r.id,
    title: `${r.document_number} — ${r.customer_name || r.document_type}`,
    start: r.estimated_delivery_date
  }));
  res.json(events);
});

// Add: document details API for modal in calendar
// API routes order (specific before param)
app.get('/api/documents/by-number', async (req, res) => {
  const num = (req.query.document_number || '').trim();
  if (!num) return res.status(400).json({ error: 'Missing document_number' });
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE document_number = ?', [num]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('Lookup by number failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Keep this route AFTER the by-number route
app.get('/api/documents/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('Lookup by id failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/documents/list', (req, res) => {
  res.render('layout', { title: 'Document List', page: 'pages/documents_list' });
});

app.get('/updates/calendar', (req, res) => {
  res.render('layout', { title: 'Delivery Calendar', page: 'pages/updates_calendar' });
});

app.get('/updates/kanban', (req, res) => {
  res.render('layout', { title: 'Delivery Kanban', page: 'pages/updates_kanban' });
});

app.get('/shipments/list', (req, res) => {
  res.render('layout', { title: 'Shipment List', page: 'pages/shipments_list' });
});

app.get('/shipments/timeline', (req, res) => {
  res.render('layout', { title: 'Shipment Timeline', page: 'pages/shipments_timeline' });
});

// MySQL pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ejeff',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Prefix mapping for document numbers
const prefixMap = {
  'Invoice': 'INV',
  'Bill of Lading': 'BOL',
  'Customer Paperwork': 'CUST',
  'Packing List': 'PKL',
  'Other': 'OTH'
};

const PORT = process.env.PORT || 3000;

async function ensureSchema() {
  // Create table if not exists
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
      document_summary TEXT
    )
  `);

  // Add estimated_delivery_date column if missing
  const [cols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'estimated_delivery_date'
  `, [process.env.MYSQL_DATABASE || 'ejeff']);

  if (cols.length === 0) {
    await pool.query(`ALTER TABLE documents ADD COLUMN estimated_delivery_date DATETIME NULL`);
  }
}

async function init() {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`E-Jeff server running on ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize:', err);
    process.exit(1);
  }
}

init();