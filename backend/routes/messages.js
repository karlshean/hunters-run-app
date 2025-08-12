const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/messages/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'message-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // max 5 files per message
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Get message threads for current user
router.get('/threads', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (req.user.user_type === 'tenant') {
      whereClause = 'WHERE mt.tenant_id = $1';
      params.push(req.user.id);
      paramIndex = 2;
    } else {
      // Staff can see all threads for their assigned properties
      whereClause = `WHERE (mt.assigned_to = $1 OR EXISTS (
        SELECT 1 FROM user_property_assignments upa 
        WHERE upa.user_id = $1 AND upa.property_id = mt.property_id AND upa.is_active = true
      ))`;
      params.push(req.user.id);
      paramIndex = 2;
    }

    if (status) {
      whereClause += ` AND mt.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND mt.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    const result = await db.query(
      `SELECT mt.*, 
              tenant.first_name || ' ' || tenant.last_name as tenant_name,
              assigned.first_name || ' ' || assigned.last_name as assigned_name,
              p.name as property_name,
              u.unit_number,
              (SELECT COUNT(*) FROM messages m 
               WHERE m.thread_id = mt.id AND NOT m.is_read 
               AND m.sender_id != $1) as unread_count,
              (SELECT m.message_text FROM messages m 
               WHERE m.thread_id = mt.id 
               ORDER BY m.created_at DESC LIMIT 1) as last_message
       FROM message_threads mt
       LEFT JOIN users tenant ON mt.tenant_id = tenant.id
       LEFT JOIN users assigned ON mt.assigned_to = assigned.id
       LEFT JOIN properties p ON mt.property_id = p.id
       LEFT JOIN units u ON mt.unit_id = u.id
       ${whereClause}
       ORDER BY mt.last_message_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM message_threads mt ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        threads: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching message threads:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching message threads'
    });
  }
});

// Get messages in a thread
router.get('/threads/:threadId/messages', auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user has access to this thread
    const threadResult = await db.query(
      `SELECT mt.* FROM message_threads mt
       WHERE mt.id = $1 AND (
         mt.tenant_id = $2 OR 
         mt.assigned_to = $2 OR
         EXISTS (
           SELECT 1 FROM user_property_assignments upa 
           WHERE upa.user_id = $2 AND upa.property_id = mt.property_id AND upa.is_active = true
         )
       )`,
      [threadId, req.user.id]
    );

    if (threadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Thread not found or access denied'
      });
    }

    const result = await db.query(
      `SELECT m.*, 
              u.first_name || ' ' || u.last_name as sender_name,
              u.user_type as sender_type
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.thread_id = $1 
       AND (m.is_internal = false OR $2 != 'tenant')
       ORDER BY m.created_at ASC
       LIMIT $3 OFFSET $4`,
      [threadId, req.user.user_type, limit, offset]
    );

    // Mark messages as read for current user
    await db.query(
      `INSERT INTO message_read_receipts (message_id, user_id)
       SELECT m.id, $2 FROM messages m 
       WHERE m.thread_id = $1 AND m.sender_id != $2
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [threadId, req.user.id]
    );

    // Update message read status
    await db.query(
      `UPDATE messages SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE thread_id = $1 AND sender_id != $2 AND NOT is_read`,
      [threadId, req.user.id]
    );

    res.json({
      success: true,
      data: {
        thread: threadResult.rows[0],
        messages: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
});

// Create new message thread
router.post('/threads',
  auth,
  upload.array('attachments', 5),
  [
    body('subject').notEmpty().isLength({ max: 255 }).withMessage('Subject is required and must be less than 255 characters'),
    body('message_text').notEmpty().withMessage('Message content is required'),
    body('category').optional().isIn(['maintenance', 'billing', 'general', 'complaint', 'compliment']),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const {
        subject,
        message_text,
        category = 'general',
        priority = 'normal'
      } = req.body;

      // Get tenant's property and unit info
      let propertyId, unitId;
      
      if (req.user.user_type === 'tenant') {
        const leaseResult = await client.query(
          `SELECT l.unit_id, u.property_id 
           FROM leases l 
           JOIN units u ON l.unit_id = u.id
           WHERE l.primary_tenant_id = $1 AND l.status = 'active'`,
          [req.user.id]
        );
        
        if (leaseResult.rows.length > 0) {
          unitId = leaseResult.rows[0].unit_id;
          propertyId = leaseResult.rows[0].property_id;
        }
      } else {
        // Staff can specify property/unit or it will be assigned later
        propertyId = req.body.property_id;
        unitId = req.body.unit_id;
      }

      // Create message thread
      const threadResult = await client.query(
        `INSERT INTO message_threads 
         (tenant_id, property_id, unit_id, subject, status, priority, category, last_message_at)
         VALUES ($1, $2, $3, $4, 'open', $5, $6, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          req.user.user_type === 'tenant' ? req.user.id : null,
          propertyId,
          unitId,
          subject,
          priority,
          category
        ]
      );

      const thread = threadResult.rows[0];

      // Prepare attachments data
      let attachments = [];
      if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path
        }));
      }

      // Create first message
      const messageResult = await client.query(
        `INSERT INTO messages 
         (thread_id, sender_id, message_text, message_type, attachments, is_internal)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [
          thread.id,
          req.user.id,
          message_text,
          attachments.length > 0 ? 'mixed' : 'text',
          JSON.stringify(attachments)
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Message thread created successfully',
        data: {
          thread: thread,
          firstMessage: messageResult.rows[0]
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating message thread:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating message thread'
      });
    } finally {
      client.release();
    }
  }
);

// Send message to existing thread
router.post('/threads/:threadId/messages',
  auth,
  upload.array('attachments', 5),
  [
    body('message_text').notEmpty().withMessage('Message content is required'),
    body('is_internal').optional().isBoolean().withMessage('is_internal must be a boolean')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const { threadId } = req.params;
      const { message_text, is_internal = false } = req.body;

      // Verify user has access to this thread
      const threadResult = await client.query(
        `SELECT mt.* FROM message_threads mt
         WHERE mt.id = $1 AND (
           mt.tenant_id = $2 OR 
           mt.assigned_to = $2 OR
           EXISTS (
             SELECT 1 FROM user_property_assignments upa 
             WHERE upa.user_id = $2 AND upa.property_id = mt.property_id AND upa.is_active = true
           )
         )`,
        [threadId, req.user.id]
      );

      if (threadResult.rows.length === 0) {
        throw new Error('Thread not found or access denied');
      }

      // Only staff can send internal messages
      const isInternalMessage = is_internal && req.user.user_type !== 'tenant';

      // Prepare attachments data
      let attachments = [];
      if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path
        }));
      }

      // Create message
      const messageResult = await client.query(
        `INSERT INTO messages 
         (thread_id, sender_id, message_text, message_type, attachments, is_internal)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          threadId,
          req.user.id,
          message_text,
          attachments.length > 0 ? 'mixed' : 'text',
          JSON.stringify(attachments),
          isInternalMessage
        ]
      );

      // Update thread last message time and reopen if closed
      await client.query(
        `UPDATE message_threads 
         SET last_message_at = CURRENT_TIMESTAMP,
             status = CASE WHEN status = 'closed' THEN 'open' ELSE status END
         WHERE id = $1`,
        [threadId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { message: messageResult.rows[0] }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error sending message'
      });
    } finally {
      client.release();
    }
  }
);

// Update thread status (assign, close, etc.)
router.put('/threads/:threadId',
  auth,
  roleCheck(['admin', 'manager']),
  [
    body('status').optional().isIn(['open', 'closed', 'urgent', 'resolved']),
    body('assigned_to').optional().isUUID(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { threadId } = req.params;
      const { status, assigned_to, priority, tags } = req.body;

      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (assigned_to !== undefined) {
        updateFields.push(`assigned_to = $${paramIndex}`);
        params.push(assigned_to);
        paramIndex++;
      }

      if (priority !== undefined) {
        updateFields.push(`priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      if (tags !== undefined) {
        updateFields.push(`tags = $${paramIndex}`);
        params.push(tags);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(threadId);

      const result = await db.query(
        `UPDATE message_threads 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Thread not found'
        });
      }

      res.json({
        success: true,
        message: 'Thread updated successfully',
        data: { thread: result.rows[0] }
      });
    } catch (error) {
      console.error('Error updating thread:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating thread'
      });
    }
  }
);

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    let whereClause;
    const params = [req.user.id];

    if (req.user.user_type === 'tenant') {
      whereClause = 'WHERE mt.tenant_id = $1';
    } else {
      whereClause = `WHERE (mt.assigned_to = $1 OR EXISTS (
        SELECT 1 FROM user_property_assignments upa 
        WHERE upa.user_id = $1 AND upa.property_id = mt.property_id AND upa.is_active = true
      ))`;
    }

    const result = await db.query(
      `SELECT COUNT(DISTINCT mt.id) as unread_threads,
              SUM((SELECT COUNT(*) FROM messages m 
                   WHERE m.thread_id = mt.id AND NOT m.is_read 
                   AND m.sender_id != $1)) as unread_messages
       FROM message_threads mt
       ${whereClause}
       AND EXISTS (
         SELECT 1 FROM messages m 
         WHERE m.thread_id = mt.id AND NOT m.is_read AND m.sender_id != $1
       )`,
      params
    );

    res.json({
      success: true,
      data: {
        unread_threads: parseInt(result.rows[0].unread_threads) || 0,
        unread_messages: parseInt(result.rows[0].unread_messages) || 0
      }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count'
    });
  }
});

module.exports = router;