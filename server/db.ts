import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon serverless (required for Node.js < v22)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with timeouts for Railway proxy compatibility
// Use pooled connection string (DATABASE_URL with -pooler suffix) for best results
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Connection timeout: 30 seconds (Railway proxy + Neon cold start)
  connectionTimeoutMillis: 30000,
  // Query timeout: 60 seconds
  query_timeout: 60000,
  // Max connections: 10 (adjust based on your needs)
  max: 10
});

// Handle pool errors gracefully without crashing the server
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  // Log but don't crash - let individual queries handle failures
});

export const db = drizzle({ client: pool, schema });
