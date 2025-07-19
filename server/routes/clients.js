import express from 'express';
import { pool } from '../database/init.js';

const router = express.Router();

// Get all clients
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM clients WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)';
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      clients: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get client by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new client
router.post('/', async (req, res) => {
  try {
    const { name, type, phone, email, address, contacts } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(`
      INSERT INTO clients (name, type, phone, email, address, contacts, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      name,
      type || 'owner',
      phone,
      email,
      address,
      JSON.stringify(contacts || []),
      req.user.id
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, phone, email, address, contacts } = req.body;

    const result = await pool.query(`
      UPDATE clients SET
        name = $1, type = $2, phone = $3, email = $4, address = $5,
        contacts = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, type, phone, email, address, JSON.stringify(contacts || []), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client has operations
    const operationsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM operations WHERE client_id = $1',
      [id]
    );

    if (parseInt(operationsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete client with existing operations' 
      });
    }

    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;