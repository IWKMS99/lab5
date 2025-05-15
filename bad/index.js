const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Database Optimization Lab API' });
});

app.get('/customers', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM customers');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/customers/search', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }
    
    const result = await db.query('SELECT * FROM customers WHERE email = $1', [email]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/orders/details', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.id as order_id, o.created_at, o.status, 
             c.id as customer_id, c.name as customer_name, c.email as customer_email,
             oi.id as item_id, oi.quantity, oi.unit_price,
             p.id as product_id, p.name as product_name, p.description as product_description,
             cat.id as category_id, cat.name as category_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN categories cat ON p.category_id = cat.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/products/with-orders', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.name, p.price,
        (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as order_count
      FROM products p
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/customers/with-orders', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM customers 
      WHERE id IN (SELECT DISTINCT customer_id FROM orders)
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/orders/recent', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM orders
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/products/search', async (req, res) => {
  try {
    const { term } = req.query;
    if (!term) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    const result = await db.query(`
      SELECT * FROM products
      WHERE name LIKE $1 OR description LIKE $1
    `, [`%${term}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/sales/by-category', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.name as category, SUM(oi.quantity * oi.unit_price) as total_sales
      FROM categories c
      JOIN products p ON c.id = p.category_id
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      GROUP BY c.name
      ORDER BY total_sales DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/unique-customers', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT ON (c.email) c.id, c.name, c.email
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      ORDER BY c.email, o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 