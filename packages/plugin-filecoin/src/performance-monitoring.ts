// packages/plugin-filecoin/src/performance-monitoring.ts
import { Sequelize, DataTypes } from 'sequelize';
import { retry } from 'ts-retry-promise';
import type { PerformanceMetrics } from './types';
import fs from 'fs/promises';

// Database configuration
const dialect = (process.env.DB_DIALECT || 'postgres') as 'postgres' | 'sqlite';
const sequelize = new Sequelize({
  dialect,
  storage: dialect === 'sqlite' ? process.env.DB_STORAGE || 'performance.db' : undefined,
  host: dialect === 'postgres' ? process.env.PM_DB_HOST || 'localhost' : undefined,
  port: dialect === 'postgres' ? Number(process.env.PM_DB_PORT) || 5432 : undefined,
  username: dialect === 'postgres' ? process.env.PM_DB_USER || 'performance_user' : undefined,
  password: dialect === 'postgres' ? process.env.PM_DB_PASSWORD || 'password123' : undefined,
  database: dialect === 'postgres' ? process.env.PM_DB_NAME || 'performance_db' : undefined,
  logging: process.env.NODE_ENV === 'development' ? console.log : false, // Optional: DB query logging
});

// Define the Metric model
const Metric = sequelize.define(
  'Metric',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    responseTime: { type: DataTypes.FLOAT, allowNull: false },
    throughput: { type: DataTypes.FLOAT, allowNull: false },
    errorRate: { type: DataTypes.FLOAT, allowNull: false },
    latency: { type: DataTypes.FLOAT, allowNull: false },
    memoryUsage: { type: DataTypes.FLOAT, allowNull: false },
    cpuUtilization: { type: DataTypes.FLOAT, allowNull: false },
    networkTraffic: { type: DataTypes.FLOAT, allowNull: false },
    diskIO: { type: DataTypes.FLOAT, allowNull: false },
    backupSize: { type: DataTypes.INTEGER, allowNull: true },
    uploadTime: { type: DataTypes.INTEGER, allowNull: true },
    retrievalLatency: { type: DataTypes.INTEGER, allowNull: true },
    cid: { type: DataTypes.STRING, allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'performance_metrics',
    timestamps: false,
  }
);

// Initialize database connection and table
let isInitialized = false;
async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  try {
    await retry(
      async () => {
        await sequelize.authenticate();
        await Metric.sync({ alter: true });
      },
      { retries: 3, delay: 1000 }
    );
    console.log('Performance database initialized');
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize performance database:', error);
    throw error;
  }
}

// Ensure DB is initialized on module load
initializeDatabase().catch(err => console.error('Database initialization failed:', err));

/**
 * Logs performance metrics to the database with a file fallback.
 * @param metrics - Performance metrics to log.
 * @throws Error if logging fails and file fallback also fails.
 */
export async function logPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
  await initializeDatabase(); // Ensure DB is ready

  try {
    await retry(
      async () => {
        await Metric.create();
      },
      { retries: 3, delay: 1000 }
    );
    console.log('Logged metrics:', metrics);
  } catch (error) {
    console.error('Failed to log metrics after retries:', error);
    try {
      await fs.appendFile('metrics.log', `${JSON.stringify(metrics)}\n`);
      console.log('Metrics logged to file as fallback');
    } catch (fileError) {
      console.error('Failed to log metrics to file:', fileError);
      throw new Error('Unable to log metrics to database or file');
    }
  }
}