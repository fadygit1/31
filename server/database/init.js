import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mec_doors_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    await testConnection();
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          department VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP WITH TIME ZONE
        )
      `);

      // Clients table
      await client.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'owner',
          phone VARCHAR(50),
          email VARCHAR(255),
          address TEXT,
          contacts JSONB DEFAULT '[]',
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Operations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS operations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          items JSONB DEFAULT '[]',
          deductions JSONB DEFAULT '[]',
          guarantee_checks JSONB DEFAULT '[]',
          guarantee_letters JSONB DEFAULT '[]',
          warranty_certificates JSONB DEFAULT '[]',
          received_payments JSONB DEFAULT '[]',
          total_amount DECIMAL(15,2) DEFAULT 0,
          total_received DECIMAL(15,2) DEFAULT 0,
          overall_execution_percentage DECIMAL(5,2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'in_progress',
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Sales opportunities table (new)
      await client.query(`
        CREATE TABLE IF NOT EXISTS sales_opportunities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          client_id UUID REFERENCES clients(id),
          potential_client_name VARCHAR(255),
          potential_client_contact JSONB,
          estimated_value DECIMAL(15,2),
          probability INTEGER CHECK (probability >= 0 AND probability <= 100),
          stage VARCHAR(50) DEFAULT 'lead',
          source VARCHAR(100),
          assigned_to UUID REFERENCES users(id),
          expected_close_date DATE,
          actual_close_date DATE,
          notes TEXT,
          attachments JSONB DEFAULT '[]',
          activities JSONB DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'active',
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Archive table for lost opportunities
      await client.query(`
        CREATE TABLE IF NOT EXISTS archived_opportunities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          original_opportunity_id UUID,
          title VARCHAR(255) NOT NULL,
          client_name VARCHAR(255),
          estimated_value DECIMAL(15,2),
          reason_lost VARCHAR(255),
          detailed_reason TEXT,
          competitor VARCHAR(255),
          lessons_learned TEXT,
          archived_by UUID REFERENCES users(id),
          archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          original_data JSONB
        )
      `);

      // User sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          ip_address INET,
          user_agent TEXT
        )
      `);

      // Audit log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          action VARCHAR(100) NOT NULL,
          table_name VARCHAR(100),
          record_id UUID,
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_operations_client_id ON operations(client_id);
        CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
        CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);
        CREATE INDEX IF NOT EXISTS idx_sales_opportunities_assigned_to ON sales_opportunities(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_sales_opportunities_stage ON sales_opportunities(stage);
        CREATE INDEX IF NOT EXISTS idx_sales_opportunities_status ON sales_opportunities(status);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
      `);

      // Create default admin user if not exists
      const adminCheck = await client.query(
        'SELECT id FROM users WHERE username = $1',
        ['admin']
      );

      if (adminCheck.rows.length === 0) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await client.query(`
          INSERT INTO users (username, email, password_hash, full_name, role, department)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, ['admin', 'admin@mec-doors.com', hashedPassword, 'مدير النظام', 'admin', 'الإدارة']);
        
        console.log('✅ Default admin user created (username: admin, password: admin123)');
      }

      await client.query('COMMIT');
      console.log('✅ Database tables initialized successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});