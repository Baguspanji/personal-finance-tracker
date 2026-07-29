import mysql from 'mysql2/promise';

export const dbConfig = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'personal_finance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
};

export function createPool() {
  return mysql.createPool(dbConfig);
}

export async function testConnection() {
  try {
    const pool = createPool();
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database:', dbConfig.database);
    connection.release();
    return true;
  } catch (error) {
    console.warn('MySQL connection skipped or unavailable:', (error as Error).message);
    return false;
  }
}
