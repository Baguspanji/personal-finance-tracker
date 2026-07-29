import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { dbConfig } from './config';

async function runMigrationAndSeeder() {
  console.log('🚀 Starting MySQL Database Migration & Seeding...');
  console.log(`Connecting to ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}...`);

  try {
    // Connect without selecting database first to allow database creation
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      multipleStatements: true,
    });

    console.log('✅ Connected to MySQL server.');

    // 1. Run Schema Migration
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📜 Executing database/schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await connection.query(schemaSql);
      console.log('✅ Schema migration completed successfully!');
    } else {
      console.error('❌ Schema file not found:', schemaPath);
    }

    // 2. Run Seeder
    const seederPath = path.join(process.cwd(), 'database', 'seeder.sql');
    if (fs.existsSync(seederPath)) {
      console.log('🌱 Executing database/seeder.sql...');
      const seederSql = fs.readFileSync(seederPath, 'utf-8');
      await connection.query(seederSql);
      console.log('✅ Database seeding completed successfully!');
    } else {
      console.error('❌ Seeder file not found:', seederPath);
    }

    await connection.end();
    console.log('🎉 MySQL Database setup finished!');
  } catch (error) {
    console.error('❌ Error during MySQL migration/seeding:', error);
    process.exit(1);
  }
}

runMigrationAndSeeder();
