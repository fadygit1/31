import express from 'express';
import { pool } from '../database/init.js';

const router = express.Router();

// Get all operations
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, client_id, status } = req.query;
    
    let query = `
      SELECT o.*, c.name as client_name
      FROM operations o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (client_id) {
      paramCount++;
      query += ` AND o.client_id = $${paramCount}`;
      params.push(client_id);
    }

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM operations o WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (client_id) {
      countParamCount++;
      countQuery += ` AND o.client_id = $${countParamCount}`;
      countParams.push(client_id);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND o.status = $${countParamCount}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      operations: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Get operations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get operation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT o.*, c.name as client_name FROM operations o LEFT JOIN clients c ON o.client_id = c.id WHERE o.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get operation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new operation
router.post('/', async (req, res) => {
  try {
    const {
      code,
      name,
      clientId,
      items,
      deductions,
      guaranteeChecks,
      guaranteeLetters,
      warrantyCertificates,
      receivedPayments,
      totalAmount,
      totalReceived,
      overallExecutionPercentage,
      status
    } = req.body;

    if (!code || !name || !clientId) {
      return res.status(400).json({ error: 'Code, name, and client ID are required' });
    }

    const result = await pool.query(`
      INSERT INTO operations (
        code, name, client_id, items, deductions, guarantee_checks,
        guarantee_letters, warranty_certificates, received_payments,
        total_amount, total_received, overall_execution_percentage,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      code, name, clientId,
      JSON.stringify(items || []),
      JSON.stringify(deductions || []),
      JSON.stringify(guaranteeChecks || []),
      JSON.stringify(guaranteeLetters || []),
      JSON.stringify(warrantyCertificates || []),
      JSON.stringify(receivedPayments || []),
      totalAmount || 0,
      totalReceived || 0,
      overallExecutionPercentage || 0,
      status || 'in_progress',
      req.user.id
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create operation error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Operation code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update operation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      clientId,
      items,
      deductions,
      guaranteeChecks,
      guaranteeLetters,
      warrantyCertificates,
      receivedPayments,
      totalAmount,
      totalReceived,
      overallExecutionPercentage,
      status
    } = req.body;

    const result = await pool.query(`
      UPDATE operations SET
        code = $1, name = $2, client_id = $3, items = $4, deductions = $5,
        guarantee_checks = $6, guarantee_letters = $7, warranty_certificates = $8,
        received_payments = $9, total_amount = $10, total_received = $11,
        overall_execution_percentage = $12, status = $13, updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      code, name, clientId,
      JSON.stringify(items || []),
      JSON.stringify(deductions || []),
      JSON.stringify(guaranteeChecks || []),
      JSON.stringify(guaranteeLetters || []),
      JSON.stringify(warrantyCertificates || []),
      JSON.stringify(receivedPayments || []),
      totalAmount || 0,
      totalReceived || 0,
      overallExecutionPercentage || 0,
      status || 'in_progress',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update operation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete operation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM operations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    res.json({ message: 'Operation deleted successfully' });

  } catch (error) {
    console.error('Delete operation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get operations statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { period = 'all', user_id } = req.query;
    
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (period === 'quarter') {
      dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '90 days'";
    } else if (period === 'year') {
      dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '365 days'";
    }

    let userFilter = '';
    const params = [];
    if (user_id) {
      userFilter = 'AND created_by = $1';
      params.push(user_id);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_operations,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status LIKE 'completed%' THEN 1 END) as completed,
        SUM(total_amount) as total_amount,
        SUM(total_received) as total_received,
        AVG(overall_execution_percentage) as avg_execution
      FROM operations 
      WHERE 1=1 ${dateFilter} ${userFilter}
    `;

    const result = await pool.query(statsQuery, params);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get operations stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;