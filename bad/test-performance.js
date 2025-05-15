const db = require('./db');

async function measureQueryPerformance(name, query, params = []) {
  console.log(`\n--- Testing query: ${name} ---`);
  
  try {
    console.log('EXPLAIN ANALYZE results:');
    const explainResult = await db.query(`EXPLAIN ANALYZE ${query}`, params);
    explainResult.rows.forEach(row => console.log(row));
  } catch (err) {
    console.error('Error running EXPLAIN ANALYZE:', err);
  }
  
  try {
    const start = process.hrtime();
    
    await db.query(query, params);
    
    const end = process.hrtime(start);
    const executionTime = (end[0] * 1000 + end[1] / 1000000).toFixed(2);
    
    console.log(`Execution time: ${executionTime} ms`);
    return executionTime;
  } catch (err) {
    console.error('Error measuring query performance:', err);
    return null;
  }
}

async function runTests() {
  try {
    
    await measureQueryPerformance(
      'Get all customers (no pagination)',
      'SELECT * FROM customers'
    );
    
    await measureQueryPerformance(
      'Customer search by email (no index)',
      'SELECT * FROM customers WHERE email = $1',
      ['customer500@example.com']
    );
    
    await measureQueryPerformance(
      'Order details with multiple joins',
      `SELECT o.id as order_id, o.created_at, o.status, 
              c.id as customer_id, c.name as customer_name, c.email as customer_email,
              oi.id as item_id, oi.quantity, oi.unit_price,
              p.id as product_id, p.name as product_name, p.description as product_description,
              cat.id as category_id, cat.name as category_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN categories cat ON p.category_id = cat.id
       LIMIT 100`
    );
    
    await measureQueryPerformance(
      'Products with order count using subquery',
      `SELECT p.id, p.name, p.price,
        (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as order_count
       FROM products p`
    );
    
    await measureQueryPerformance(
      'Customers with orders using IN subquery',
      `SELECT * FROM customers 
       WHERE id IN (SELECT DISTINCT customer_id FROM orders)`
    );
    
    await measureQueryPerformance(
      'Recent orders with sorting (no index)',
      `SELECT * FROM orders
       ORDER BY created_at DESC
       LIMIT 100`
    );
    
    await measureQueryPerformance(
      'Product search with OR conditions',
      `SELECT * FROM products
       WHERE name LIKE $1 OR description LIKE $1`,
      ['%Product 1%']
    );
    
    await measureQueryPerformance(
      'Sales by category with GROUP BY',
      `SELECT c.name as category, SUM(oi.quantity * oi.unit_price) as total_sales
       FROM categories c
       JOIN products p ON c.id = p.category_id
       JOIN order_items oi ON p.id = oi.product_id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'completed'
       GROUP BY c.name
       ORDER BY total_sales DESC`
    );
    
    await measureQueryPerformance(
      'Unique customers with DISTINCT',
      `SELECT DISTINCT ON (c.email) c.id, c.name, c.email
       FROM customers c
       JOIN orders o ON c.id = o.customer_id
       ORDER BY c.email, o.created_at DESC`
    );
    
  } catch (err) {
    console.error('Error running performance tests:', err);
  } finally {
    db.pool.end();
  }
}

console.log('Running performance tests for unoptimized queries...');
runTests(); 