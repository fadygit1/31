import express from 'express';
import { pool } from '../database/init.js';

const router = express.Router();

// Get comprehensive report data
router.get('/comprehensive', async (req, res) => {
  try {
    const { start_date, end_date, client_id } = req.query;
    
    let dateFilter = '';
    let clientFilter = '';
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      dateFilter += ` AND o.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      dateFilter += ` AND o.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    if (client_id) {
      paramCount++;
      clientFilter = ` AND o.client_id = $${paramCount}`;
      params.push(client_id);
    }

    // Get operations with client info
    const operationsQuery = `
      SELECT o.*, c.name as client_name, c.type as client_type
      FROM operations o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE 1=1 ${dateFilter} ${clientFilter}
      ORDER BY o.created_at DESC
    `;

    const operationsResult = await pool.query(operationsQuery, params);

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_operations,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status LIKE 'completed%' THEN 1 END) as completed,
        SUM(total_amount) as total_amount,
        SUM(total_received) as total_received,
        AVG(overall_execution_percentage) as avg_execution
      FROM operations o
      WHERE 1=1 ${dateFilter} ${clientFilter}
    `;

    const summaryResult = await pool.query(summaryQuery, params);

    // Get client statistics
    const clientStatsQuery = `
      SELECT 
        c.id,
        c.name,
        c.type,
        COUNT(o.id) as operations_count,
        SUM(o.total_amount) as total_amount,
        SUM(o.total_received) as total_received
      FROM clients c
      LEFT JOIN operations o ON c.id = o.client_id ${dateFilter.replace('o.created_at', 'o.created_at')}
      WHERE 1=1 ${clientFilter.replace('o.client_id', 'c.id')}
      GROUP BY c.id, c.name, c.type
      HAVING COUNT(o.id) > 0
      ORDER BY total_amount DESC
    `;

    const clientStatsResult = await pool.query(clientStatsQuery, params);

    res.json({
      operations: operationsResult.rows,
      summary: summaryResult.rows[0],
      clientStats: clientStatsResult.rows
    });

  } catch (error) {
    console.error('Get comprehensive report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get financial report
router.get('/financial', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
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

    const query = `
      SELECT 
        DATE_TRUNC('${period === 'year' ? 'month' : 'day'}', created_at) as period,
        COUNT(*) as operations_count,
        SUM(total_amount) as total_amount,
        SUM(total_received) as total_received,
        AVG(overall_execution_percentage) as avg_execution
      FROM operations
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE_TRUNC('${period === 'year' ? 'month' : 'day'}', created_at)
      ORDER BY period DESC
    `;

    const result = await pool.query(query);

    res.json(result.rows);

  } catch (error) {
    console.error('Get financial report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export data
router.get('/export', async (req, res) => {
  try {
    const { type = 'operations', format = 'json' } = req.query;

    let data = {};

    if (type === 'operations' || type === 'all') {
      const operationsResult = await pool.query(`
        SELECT o.*, c.name as client_name
        FROM operations o
        LEFT JOIN clients c ON o.client_id = c.id
        ORDER BY o.created_at DESC
      `);
      data.operations = operationsResult.rows;
    }

    if (type === 'clients' || type === 'all') {
      const clientsResult = await pool.query('SELECT * FROM clients ORDER BY name');
      data.clients = clientsResult.rows;
    }

    if (type === 'sales' || type === 'all') {
      const salesResult = await pool.query(`
        SELECT so.*, c.name as client_name, u.full_name as assigned_to_name
        FROM sales_opportunities so
        LEFT JOIN clients c ON so.client_id = c.id
        LEFT JOIN users u ON so.assigned_to = u.id
        ORDER BY so.created_at DESC
      `);
      data.sales = salesResult.rows;
    }

    data.exportDate = new Date().toISOString();
    data.version = '2.0';

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="export_${type}_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(data);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;