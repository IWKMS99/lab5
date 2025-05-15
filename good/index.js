require('dotenv').config();
const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());

app.get('/customers', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    `SELECT id, name, email, created_at
     FROM customers
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json(rows);
});

app.get('/customers/search', async (req, res) => {
  const term = `%${req.query.email.toLowerCase()}%`;
  const { rows } = await db.query(
    `SELECT id, name, email
     FROM customers
     WHERE LOWER(email) LIKE $1
     ORDER BY email
     LIMIT 50`,
    [term]
  );
  res.json(rows);
});

app.get('/orders/:id/details', async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { rows } = await db.query(
    `SELECT o.id AS order_id, o.total_amount, o.status, o.created_at,
            c.id AS customer_id, c.name AS customer_name,
            oi.product_id, oi.quantity, oi.unit_price,
            p.name AS product_name
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN order_items oi ON oi.order_id = o.id
     JOIN products p ON p.id = oi.product_id
     WHERE o.id = $1`,
    [orderId]
  );
  res.json(rows);
});

app.get('/products/with-orders', async (req, res) => {
  const { rows } = await db.query(
    `SELECT DISTINCT p.id, p.name, p.price, COUNT(oi.id) OVER (PARTITION BY p.id) AS orders_count
     FROM products p
     LEFT JOIN order_items oi ON oi.product_id = p.id
     WHERE oi.id IS NOT NULL`
  );
  res.json(rows);
});

app.get('/customers/with-orders', async (req, res) => {
  const { rows } = await db.query(
    `SELECT DISTINCT c.id, c.name, c.email
     FROM customers c
     JOIN orders o ON o.customer_id = c.id`
  );
  res.json(rows);
});

app.get('/orders/recent', async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const { rows } = await db.query(
    `SELECT id, customer_id, total_amount, status, created_at
     FROM orders
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

app.get('/products/search', async (req, res) => {
  const term = `%${req.query.q.toLowerCase()}%`;
  const { rows } = await db.query(
    `SELECT id, name, price, stock_quantity
     FROM products
     WHERE LOWER(name) LIKE $1
        OR LOWER(description) LIKE $1
     ORDER BY name
     LIMIT 50`,
    [term]
  );
  res.json(rows);
});

app.get('/sales/by-category', async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.category_id, c.name AS category_name, SUM(oi.quantity * oi.unit_price) AS total_sales
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN categories c ON c.id = p.category_id
     GROUP BY p.category_id, c.name`
  );
  res.json(rows);
});

app.get('/unique-customers', async (req, res) => {
  const { rows } = await db.query(
    `SELECT DISTINCT customer_id
     FROM orders`
  );
  res.json(rows);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}…`));
