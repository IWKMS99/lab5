require('dotenv').config();
const express = require('express');
const db = require('./db');
const app = express();
app.use(express.json());

app.get('/customers', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const { rows } = await db.query(
      `SELECT id, name, email, created_at
       FROM customers
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/customers/search', async (req, res, next) => {
  try {
    const term = `%${req.query.email || ''}%`;
    const { rows } = await db.query(
      `SELECT id, name, email
       FROM customers
       WHERE email ILIKE $1
       LIMIT 50`,
      [term]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/orders/details', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         o.id    AS order_id,
         o.total_amount,
         o.status,
         o.created_at,
         c.id    AS customer_id,
         c.name  AS customer_name,
         p.id    AS product_id,
         p.name  AS product_name,
         oi.quantity,
         oi.unit_price
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       ORDER BY o.created_at DESC
       LIMIT 100`,
      []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/products/with-orders', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         p.id,
         p.name,
         p.price,
         COUNT(oi.order_id)::INT AS order_count
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       GROUP BY p.id, p.name, p.price
       ORDER BY order_count DESC
       LIMIT 50`,
      []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/customers/with-orders', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT
         c.id, c.name, c.email
       FROM customers c
       JOIN orders o ON c.id = o.customer_id
       ORDER BY c.name
       LIMIT 100`,
      []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/orders/recent', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, customer_id, total_amount, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT 10`,
      []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/products/search', async (req, res, next) => {
  try {
    const term = `%${req.query.q || ''}%`;
    const { rows } = await db.query(
      `SELECT id, name, price, stock_quantity
       FROM products
       WHERE name ILIKE $1 OR description ILIKE $1
       LIMIT 100`,
      [term]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/sales/by-category', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         c.name               AS category,
         SUM(oi.quantity * oi.unit_price)::NUMERIC(12,2) AS total_sales
       FROM categories c
       JOIN products p ON p.category_id = c.id
       JOIN order_items oi ON oi.product_id = p.id
       GROUP BY c.name
       ORDER BY total_sales DESC`,
      []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/unique-customers', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         c.id, c.name, c.email
       FROM customers c
       WHERE EXISTS (
         SELECT 1 FROM orders o WHERE o.customer_id = c.id
       )
       ORDER BY c.id
       LIMIT 100`,
      []
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
