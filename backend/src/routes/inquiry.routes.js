const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Valid inquiry statuses enforced by the database CHECK constraint
const VALID_STATUSES = ['New', 'In Progress', 'Resolved'];

// Protect all inquiry routes with requireAuth
router.use(requireAuth);

/**
 * GET /api/inquiries/stats
 * Retrieves aggregated statistics for inquiry counts by status.
 */
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'New' THEN 1 END)::int AS new_count,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END)::int AS in_progress_count,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END)::int AS resolved_count
      FROM inquiries;
    `;
    const result = await query(statsQuery);
    const row = result.rows[0] || { total: 0, new_count: 0, in_progress_count: 0, resolved_count: 0 };

    return res.status(200).json({
      status: 'ok',
      stats: {
        total: row.total,
        new: row.new_count,
        inProgress: row.in_progress_count,
        resolved: row.resolved_count,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/inquiries
 * Retrieves a list of customer inquiries with optional search and status filtering.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const conditions = [];
    const params = [];

    // Filter by status if specified
    if (status && status !== 'All') {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status filter. Allowed values: All, ${VALID_STATUSES.join(', ')}`,
        });
      }
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }

    // Filter by search keyword across customer_name, contact_info, subject, and description
    if (search && typeof search === 'string' && search.trim().length > 0) {
      params.push(`%${search.trim()}%`);
      const searchParamIndex = params.length;
      conditions.push(
        `(i.customer_name ILIKE $${searchParamIndex} OR ` +
        `i.contact_info ILIKE $${searchParamIndex} OR ` +
        `i.subject ILIKE $${searchParamIndex} OR ` +
        `i.description ILIKE $${searchParamIndex})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listQuery = `
      SELECT
        i.id,
        i.customer_name,
        i.contact_info,
        i.subject,
        i.description,
        i.status,
        i.created_by,
        s.email AS creator_email,
        i.created_at,
        i.updated_at
      FROM inquiries i
      LEFT JOIN staff_users s ON i.created_by = s.id
      ${whereClause}
      ORDER BY i.created_at DESC;
    `;

    const result = await query(listQuery, params);

    return res.status(200).json({
      status: 'ok',
      count: result.rows.length,
      inquiries: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/inquiries/:id
 * Retrieves full details for a specific inquiry.
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid inquiry ID. Must be a positive integer.',
      });
    }

    const detailQuery = `
      SELECT
        i.id,
        i.customer_name,
        i.contact_info,
        i.subject,
        i.description,
        i.status,
        i.created_by,
        s.email AS creator_email,
        i.created_at,
        i.updated_at
      FROM inquiries i
      LEFT JOIN staff_users s ON i.created_by = s.id
      WHERE i.id = $1
      LIMIT 1;
    `;

    const result = await query(detailQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Inquiry with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      status: 'ok',
      inquiry: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/inquiries
 * Creates a new customer inquiry.
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { customer_name, contact_info, subject, description, status } = req.body;

    // Validate customer_name
    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer name is required',
      });
    }
    if (customer_name.trim().length > 150) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer name cannot exceed 150 characters',
      });
    }

    // Validate contact_info
    if (!contact_info || typeof contact_info !== 'string' || contact_info.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Contact information is required',
      });
    }
    if (contact_info.trim().length > 255) {
      return res.status(400).json({
        status: 'error',
        message: 'Contact information cannot exceed 255 characters',
      });
    }

    // Validate subject
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Subject is required',
      });
    }
    if (subject.trim().length > 200) {
      return res.status(400).json({
        status: 'error',
        message: 'Subject cannot exceed 200 characters',
      });
    }

    // Validate description
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Description is required',
      });
    }
    if (description.trim().length < 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Description must be at least 5 characters long',
      });
    }

    // Validate status (optional on create, defaults to 'New')
    let finalStatus = 'New';
    if (status !== undefined && status !== null) {
      if (typeof status !== 'string' || !VALID_STATUSES.includes(status.trim())) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`,
        });
      }
      finalStatus = status.trim();
    }

    const createdBy = req.session.user.id;

    const insertQuery = `
      INSERT INTO inquiries (customer_name, contact_info, subject, description, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, customer_name, contact_info, subject, description, status, created_by, created_at, updated_at;
    `;

    const result = await query(insertQuery, [
      customer_name.trim(),
      contact_info.trim(),
      subject.trim(),
      description.trim(),
      finalStatus,
      createdBy,
    ]);

    const newInquiry = result.rows[0];
    newInquiry.creator_email = req.session.user.email;

    return res.status(201).json({
      status: 'ok',
      message: 'Inquiry created successfully',
      inquiry: newInquiry,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/inquiries/:id/status
 * Updates only the status of an existing inquiry.
 */
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid inquiry ID. Must be a positive integer.',
      });
    }

    const { status } = req.body;
    if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status.trim())) {
      return res.status(400).json({
        status: 'error',
        message: `Status is required and must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updateQuery = `
      UPDATE inquiries
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, customer_name, contact_info, subject, description, status, created_by, created_at, updated_at;
    `;

    const result = await query(updateQuery, [status.trim(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Inquiry with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Inquiry status updated successfully',
      inquiry: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/inquiries/:id
 * Updates all fields of an existing inquiry.
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid inquiry ID. Must be a positive integer.',
      });
    }

    const { customer_name, contact_info, subject, description, status } = req.body;

    // Validate customer_name
    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer name is required',
      });
    }
    if (customer_name.trim().length > 150) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer name cannot exceed 150 characters',
      });
    }

    // Validate contact_info
    if (!contact_info || typeof contact_info !== 'string' || contact_info.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Contact information is required',
      });
    }
    if (contact_info.trim().length > 255) {
      return res.status(400).json({
        status: 'error',
        message: 'Contact information cannot exceed 255 characters',
      });
    }

    // Validate subject
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Subject is required',
      });
    }
    if (subject.trim().length > 200) {
      return res.status(400).json({
        status: 'error',
        message: 'Subject cannot exceed 200 characters',
      });
    }

    // Validate description
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Description is required',
      });
    }
    if (description.trim().length < 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Description must be at least 5 characters long',
      });
    }

    // Validate status
    if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status.trim())) {
      return res.status(400).json({
        status: 'error',
        message: `Status is required and must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updateQuery = `
      UPDATE inquiries
      SET
        customer_name = $1,
        contact_info = $2,
        subject = $3,
        description = $4,
        status = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, customer_name, contact_info, subject, description, status, created_by, created_at, updated_at;
    `;

    const result = await query(updateQuery, [
      customer_name.trim(),
      contact_info.trim(),
      subject.trim(),
      description.trim(),
      status.trim(),
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Inquiry with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Inquiry updated successfully',
      inquiry: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
