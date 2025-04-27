const mysql = require('mysql2/promise');

let pool = null;

async function connect() {
  if (pool) return pool;
  
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'heatmap',
    waitForConnections: true,
    connectionLimit: 10
  });
  
  return pool;
}

module.exports = {
  connect,
  query: async (sql, params) => {
    const conn = await connect();
    return conn.query(sql, params);
  }
}; 