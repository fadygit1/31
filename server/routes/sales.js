import express from 'express';
import { pool } from '../database/init.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all sales opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const { status, stage, assigned_to, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT so.*, c.name as client_name, u.full_name as assigned_to_name
      FROM sales_opportunities so
      LEFT JOIN clients c ON so.client_id = c.id
      LEFT JOIN users u ON so.assigned_to = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND so.status = $${paramCount}`;
      params.push(status);
    }

    if (stage) {
      paramCount++;
      query += ` AND so.stage = $${paramCount}`;
      params.push(stage);
    }

    if (assigned_to) {
      paramCount++;
      query += ` AND so.assigned_to = $${paramCount}`;
      params.push(assigned_to);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY so.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM sales_opportunities so
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND so.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (stage) {
      countParamCount++;
      countQuery += ` AND so.stage = $${countParamCount}`;
      countParams.push(stage);
    }

    if (assigned_to) {
      countParamCount++;
      countQuery += ` AND so.assigned_to = $${countParamCount}`;
      countParams.push(assigned_to);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      opportunities: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new sales opportunity
router.post('/opportunities', async (req, res) => {
  try {
    const {
      title,
      description,
      clientId,
      potentialClientName,
      potentialClientContact,
      estimatedValue,
      probability,
      stage,
      source,
      assignedTo,
      expectedCloseDate,
      notes
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(`
      INSERT INTO sales_opportunities (
        title, description, client_id, potential_client_name, potential_client_contact,
        estimated_value, probability, stage, source, assigned_to, expected_close_date,
        notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      title, description, clientId, potentialClientName, 
      JSON.stringify(potentialClientContact || {}),
      estimatedValue, probability, stage || 'lead', source, assignedTo,
      expectedCloseDate, notes, req.user.id
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update sales opportunity
router.put('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      clientId,
      potentialClientName,
      potentialClientContact,
      estimatedValue,
      probability,
      stage,
      source,
      assignedTo,
      expectedCloseDate,
      actualCloseDate,
      notes,
      status
    } = req.body;

    const result = await pool.query(`
      UPDATE sales_opportunities SET
        title = $1, description = $2, client_id = $3, potential_client_name = $4,
        potential_client_contact = $5, estimated_value = $6, probability = $7,
        stage = $8, source = $9, assigned_to = $10, expected_close_date = $11,
        actual_close_date = $12, notes = $13, status = $14, updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `, [
      title, description, clientId, potentialClientName,
      JSON.stringify(potentialClientContact || {}),
      estimatedValue, probability, stage, source, assignedTo,
      expectedCloseDate, actualCloseDate, notes, status, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive opportunity (move to lost)
router.post('/opportunities/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { reasonLost, detailedReason, competitor, lessonsLearned } = req.body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get the opportunity
      const opportunityResult = await client.query(
        'SELECT * FROM sales_opportunities WHERE id = $1',
        [id]
      );

      if (opportunityResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      const opportunity = opportunityResult.rows[0];

      // Archive the opportunity
      await client.query(`
        INSERT INTO archived_opportunities (
          original_opportunity_id, title, client_name, estimated_value,
          reason_lost, detailed_reason, competitor, lessons_learned,
          archived_by, original_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        id, opportunity.title, opportunity.potential_client_name || 'Unknown',
        opportunity.estimated_value, reasonLost, detailedReason, competitor,
        lessonsLearned, req.user.id, JSON.stringify(opportunity)
      ]);

      // Delete the original opportunity
      await client.query('DELETE FROM sales_opportunities WHERE id = $1', [id]);

      await client.query('COMMIT');
      res.json({ message: 'Opportunity archived successfully' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Archive opportunity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get archived opportunities
router.get('/archived', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT ao.*, u.full_name as archived_by_name
      FROM archived_opportunities ao
      LEFT JOIN users u ON ao.archived_by = u.id
      ORDER BY ao.archived_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) as total FROM archived_opportunities');

    res.json({
      archived: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Get archived opportunities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sales statistics
router.get('/statistics', async (req, res) => {
  try {
    const { period = 'month', userId } = req.query;
    
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
    if (userId) {
      userFilter = 'AND assigned_to = $1';
      params.push(userId);
    }

    // Get opportunity statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_opportunities,
        COUNT(CASE WHEN stage = 'lead' THEN 1 END) as leads,
        COUNT(CASE WHEN stage = 'qualified' THEN 1 END) as qualified,
        COUNT(CASE WHEN stage = 'proposal' THEN 1 END) as proposals,
        COUNT(CASE WHEN stage = 'negotiation' THEN 1 END) as negotiations,
        COUNT(CASE WHEN stage = 'won' THEN 1 END) as won,
        COUNT(CASE WHEN stage = 'lost' THEN 1 END) as lost,
        SUM(estimated_value) as total_value,
        SUM(CASE WHEN stage = 'won' THEN estimated_value ELSE 0 END) as won_value,
        AVG(probability) as avg_probability
      FROM sales_opportunities 
      WHERE status = 'active' ${dateFilter} ${userFilter}
    `;

    const statsResult = await pool.query(statsQuery, params);

    // Get archived statistics
    const archivedQuery = `
      SELECT 
        COUNT(*) as total_archived,
        SUM(estimated_value) as total_lost_value
      FROM archived_opportunities 
      WHERE 1=1 ${dateFilter.replace('created_at', 'archived_at')}
    `;

    const archivedResult = await pool.query(archivedQuery);

    // Get pipeline by stage
    const pipelineQuery = `
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(estimated_value) as total_value
      FROM sales_opportunities 
      WHERE status = 'active' ${dateFilter} ${userFilter}
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'lead' THEN 1
          WHEN 'qualified' THEN 2
          WHEN 'proposal' THEN 3
          WHEN 'negotiation' THEN 4
          WHEN 'won' THEN 5
          WHEN 'lost' THEN 6
          ELSE 7
        END
    `;

    const pipelineResult = await pool.query(pipelineQuery, params);

    res.json({
      statistics: statsResult.rows[0],
      archived: archivedResult.rows[0],
      pipeline: pipelineResult.rows
    });

  } catch (error) {
    console.error('Get sales statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;