const fs = require('fs');
const path = require('path');
const db = require('./db');

async function seed() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('Schema created successfully');

    const categories = [
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Clothing', description: 'Apparel and fashion items' },
      { name: 'Books', description: 'Books and literature' },
      { name: 'Home', description: 'Home and kitchen items' },
      { name: 'Sports', description: 'Sports equipment and accessories' }
    ];

    for (const category of categories) {
      await db.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2)',
        [category.name, category.description]
      );
    }
    console.log('Categories inserted');

    for (let i = 1; i <= 1000; i++) {
      await db.query(
        'INSERT INTO customers (name, email, address, phone) VALUES ($1, $2, $3, $4)',
        [
          `Customer ${i}`,
          `customer${i}@example.com`,
          `Address for customer ${i}`,
          `+1-555-${String(i).padStart(4, '0')}`
        ]
      );
    }
    console.log('Customers inserted');

    for (let i = 1; i <= 500; i++) {
      const categoryId = Math.floor(Math.random() * 5) + 1;
      await db.query(
        'INSERT INTO products (name, description, price, stock_quantity, category_id) VALUES ($1, $2, $3, $4, $5)',
        [
          `Product ${i}`,
          `Description for product ${i}`,
          (Math.random() * 1000).toFixed(2),
          Math.floor(Math.random() * 100),
          categoryId
        ]
      );
    }
    console.log('Products inserted');

    for (let i = 1; i <= 2000; i++) {
      const customerId = Math.floor(Math.random() * 1000) + 1;
      
      const orderResult = await db.query(
        'INSERT INTO orders (customer_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id',
        [
          customerId,
          0,
          ['pending', 'completed', 'shipped', 'cancelled'][Math.floor(Math.random() * 4)]
        ]
      );
      
      const orderId = orderResult.rows[0].id;
      
      const itemCount = Math.floor(Math.random() * 5) + 1;
      let totalAmount = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const productId = Math.floor(Math.random() * 500) + 1;
        const quantity = Math.floor(Math.random() * 5) + 1;
        
        const productResult = await db.query('SELECT price FROM products WHERE id = $1', [productId]);
        const unitPrice = parseFloat(productResult.rows[0].price);
        
        await db.query(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
          [orderId, productId, quantity, unitPrice]
        );
        
        totalAmount += quantity * unitPrice;
      }
      
      await db.query('UPDATE orders SET total_amount = $1 WHERE id = $2', [totalAmount.toFixed(2), orderId]);
      
      if (i % 100 === 0) {
        console.log(`${i} orders processed`);
      }
    }
    console.log('Orders and order items inserted');
    
    console.log('Database seeded successfully');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    db.pool.end();
  }
}

seed(); 