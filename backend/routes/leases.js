const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const multer = require('multer');
const path = require('path');

// Configure multer for lease document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/lease-documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lease-doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for lease documents
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word documents, and images are allowed.'), false);
    }
  }
});

// Get lease documents for current tenant
router.get('/documents', auth, async (req, res) => {
  try {
    let whereClause = '';
    let params = [];

    if (req.user.user_type === 'tenant') {
      whereClause = `WHERE l.primary_tenant_id = $1 AND ld.is_tenant_accessible = true`;
      params = [req.user.id];
    } else {
      // Staff can see all documents, with optional filtering
      whereClause = 'WHERE 1=1';
      if (req.query.tenant_id) {
        whereClause += ` AND l.primary_tenant_id = $1`;
        params = [req.query.tenant_id];
      }
      if (req.query.property_id) {
        const paramIndex = params.length + 1;
        whereClause += ` AND u.property_id = $${paramIndex}`;
        params.push(req.query.property_id);
      }
    }

    const result = await db.query(
      `SELECT ld.*, d.file_name, d.file_size, d.mime_type, d.file_url,
              l.start_date as lease_start, l.end_date as lease_end,
              l.monthly_rent, l.status as lease_status,
              u.unit_number, p.name as property_name,
              tenant.first_name || ' ' || tenant.last_name as tenant_name,
              (SELECT COUNT(*) FROM signature_requests sr 
               WHERE sr.lease_document_id = ld.id AND sr.tenant_id = $${req.user.user_type === 'tenant' ? '1' : 'l.primary_tenant_id'} 
               AND sr.status = 'pending') as pending_signatures
       FROM lease_documents ld
       JOIN leases l ON ld.lease_id = l.id
       JOIN documents d ON ld.document_id = d.id
       JOIN units u ON l.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       JOIN users tenant ON l.primary_tenant_id = tenant.id
       ${whereClause}
       ORDER BY ld.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: { leaseDocuments: result.rows }
    });
  } catch (error) {
    console.error('Error fetching lease documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lease documents'
    });
  }
});

// Get single lease document
router.get('/documents/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    let whereClause = '';
    let params = [id];

    if (req.user.user_type === 'tenant') {
      whereClause = `AND l.primary_tenant_id = $2 AND ld.is_tenant_accessible = true`;
      params.push(req.user.id);
    }

    const result = await db.query(
      `SELECT ld.*, d.file_name, d.file_size, d.mime_type, d.file_url,
              l.start_date as lease_start, l.end_date as lease_end,
              l.monthly_rent, l.status as lease_status,
              u.unit_number, p.name as property_name,
              tenant.first_name || ' ' || tenant.last_name as tenant_name
       FROM lease_documents ld
       JOIN leases l ON ld.lease_id = l.id
       JOIN documents d ON ld.document_id = d.id
       JOIN units u ON l.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       JOIN users tenant ON l.primary_tenant_id = tenant.id
       WHERE ld.id = $1 ${whereClause}`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied'
      });
    }

    res.json({
      success: true,
      data: { leaseDocument: result.rows[0] }
    });
  } catch (error) {
    console.error('Error fetching lease document:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lease document'
    });
  }
});

// Upload new lease document (Admin/Manager only)
router.post('/documents',
  auth,
  roleCheck(['admin', 'manager']),
  upload.single('document'),
  [
    body('lease_id').isUUID().withMessage('Valid lease ID is required'),
    body('document_type').isIn(['lease', 'addendum', 'renewal', 'amendment', 'notice']).withMessage('Invalid document type'),
    body('title').notEmpty().isLength({ max: 255 }).withMessage('Title is required and must be less than 255 characters'),
    body('requires_signature').optional().isBoolean()
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document file is required'
      });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const {
        lease_id,
        document_type,
        title,
        description = '',
        requires_signature = false,
        is_tenant_accessible = true,
        effective_date = null,
        expiry_date = null
      } = req.body;

      // Verify lease exists and user has access
      const leaseResult = await client.query(
        `SELECT l.*, u.property_id FROM leases l
         JOIN units u ON l.unit_id = u.id
         WHERE l.id = $1`,
        [lease_id]
      );

      if (leaseResult.rows.length === 0) {
        throw new Error('Lease not found');
      }

      const lease = leaseResult.rows[0];

      // Create document record first
      const documentResult = await client.query(
        `INSERT INTO documents 
         (company_id, tenant_id, lease_id, document_type, title, description,
          file_name, file_size, mime_type, file_url, uploaded_by_user_id)
         VALUES ((SELECT company_id FROM properties WHERE id = $1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          lease.property_id,
          lease.primary_tenant_id,
          lease_id,
          document_type,
          title,
          description,
          req.file.filename,
          req.file.size,
          req.file.mimetype,
          `/uploads/lease-documents/${req.file.filename}`,
          req.user.id
        ]
      );

      const document = documentResult.rows[0];

      // Create lease document record
      const leaseDocResult = await client.query(
        `INSERT INTO lease_documents 
         (lease_id, document_id, document_type, title, description,
          requires_signature, is_tenant_accessible, effective_date, expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          lease_id,
          document.id,
          document_type,
          title,
          description,
          requires_signature,
          is_tenant_accessible,
          effective_date,
          expiry_date
        ]
      );

      const leaseDocument = leaseDocResult.rows[0];

      // If signature is required, create signature request
      if (requires_signature) {
        await client.query(
          `INSERT INTO signature_requests 
           (lease_document_id, tenant_id, request_type, status, due_date)
           VALUES ($1, $2, 'sign', 'pending', $3)`,
          [
            leaseDocument.id,
            lease.primary_tenant_id,
            expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
          ]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Lease document uploaded successfully',
        data: { 
          leaseDocument: {
            ...leaseDocument,
            file_name: document.file_name,
            file_size: document.file_size,
            mime_type: document.mime_type,
            file_url: document.file_url
          }
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error uploading lease document:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error uploading lease document'
      });
    } finally {
      client.release();
    }
  }
);

// Get signature requests for current tenant
router.get('/signatures', auth, async (req, res) => {
  try {
    let whereClause = '';
    let params = [];

    if (req.user.user_type === 'tenant') {
      whereClause = 'WHERE sr.tenant_id = $1';
      params = [req.user.id];
    } else {
      // Staff can see all signature requests
      whereClause = 'WHERE 1=1';
      if (req.query.tenant_id) {
        whereClause += ` AND sr.tenant_id = $1`;
        params = [req.query.tenant_id];
      }
    }

    const result = await db.query(
      `SELECT sr.*, ld.title, ld.document_type,
              d.file_name, d.file_url,
              tenant.first_name || ' ' || tenant.last_name as tenant_name,
              u.unit_number, p.name as property_name
       FROM signature_requests sr
       JOIN lease_documents ld ON sr.lease_document_id = ld.id
       JOIN documents d ON ld.document_id = d.id
       JOIN leases l ON ld.lease_id = l.id
       JOIN units u ON l.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       JOIN users tenant ON sr.tenant_id = tenant.id
       ${whereClause}
       ORDER BY sr.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: { signatureRequests: result.rows }
    });
  } catch (error) {
    console.error('Error fetching signature requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching signature requests'
    });
  }
});

// Sign document (Tenant only)
router.post('/signatures/:id/sign',
  auth,
  [
    body('signature_data').notEmpty().withMessage('Signature data is required'),
    body('agreed_terms').isBoolean().withMessage('Terms agreement is required')
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

      const { id } = req.params;
      const { signature_data, agreed_terms } = req.body;

      if (!agreed_terms) {
        throw new Error('You must agree to the terms to sign the document');
      }

      // Verify signature request belongs to current tenant and is pending
      const signatureResult = await client.query(
        `SELECT sr.*, ld.title FROM signature_requests sr
         JOIN lease_documents ld ON sr.lease_document_id = ld.id
         WHERE sr.id = $1 AND sr.tenant_id = $2 AND sr.status = 'pending'`,
        [id, req.user.id]
      );

      if (signatureResult.rows.length === 0) {
        throw new Error('Signature request not found or already completed');
      }

      const signatureRequest = signatureResult.rows[0];

      // Update signature request
      await client.query(
        `UPDATE signature_requests 
         SET status = 'completed', signed_at = CURRENT_TIMESTAMP,
             signature_ip = $1, signature_metadata = $2
         WHERE id = $3`,
        [
          req.ip,
          JSON.stringify({
            signature_data,
            user_agent: req.get('User-Agent'),
            agreed_terms,
            timestamp: new Date().toISOString()
          }),
          id
        ]
      );

      // Update lease document as signed
      await client.query(
        `UPDATE lease_documents 
         SET signed_date = CURRENT_TIMESTAMP, signed_by_tenant_id = $1,
             signature_data = $2
         WHERE id = $3`,
        [
          req.user.id,
          JSON.stringify(signature_data),
          signatureRequest.lease_document_id
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Document signed successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error signing document:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error signing document'
      });
    } finally {
      client.release();
    }
  }
);

// Get tenant's current lease information
router.get('/current', auth, async (req, res) => {
  try {
    let whereClause = '';
    let params = [];

    if (req.user.user_type === 'tenant') {
      whereClause = 'WHERE l.primary_tenant_id = $1 AND l.status = $2';
      params = [req.user.id, 'active'];
    } else {
      // Staff can specify tenant_id
      if (!req.query.tenant_id) {
        return res.status(400).json({
          success: false,
          message: 'tenant_id is required for staff users'
        });
      }
      whereClause = 'WHERE l.primary_tenant_id = $1';
      params = [req.query.tenant_id];
    }

    const result = await db.query(
      `SELECT l.*, u.unit_number, u.bedrooms, u.bathrooms, u.square_footage,
              p.name as property_name, p.address_line1, p.address_line2, 
              p.city, p.state, p.zip_code,
              tenant.first_name || ' ' || tenant.last_name as tenant_name,
              tenant.email as tenant_email, tenant.phone as tenant_phone,
              (SELECT COUNT(*) FROM lease_documents ld 
               WHERE ld.lease_id = l.id AND ld.is_current = true) as document_count,
              (SELECT COUNT(*) FROM signature_requests sr 
               JOIN lease_documents ld ON sr.lease_document_id = ld.id
               WHERE ld.lease_id = l.id AND sr.tenant_id = l.primary_tenant_id 
               AND sr.status = 'pending') as pending_signatures
       FROM leases l
       JOIN units u ON l.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       JOIN users tenant ON l.primary_tenant_id = tenant.id
       ${whereClause}
       ORDER BY l.start_date DESC
       LIMIT 1`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No lease found'
      });
    }

    res.json({
      success: true,
      data: { lease: result.rows[0] }
    });
  } catch (error) {
    console.error('Error fetching current lease:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lease information'
    });
  }
});

// Request lease renewal (Tenant only)
router.post('/renewal-request',
  auth,
  [
    body('requested_start_date').isISO8601().withMessage('Valid start date is required'),
    body('requested_term_months').isInt({ min: 1, max: 24 }).withMessage('Term must be between 1 and 24 months'),
    body('message').optional().isLength({ max: 1000 }).withMessage('Message must be less than 1000 characters')
  ],
  async (req, res) => {
    if (req.user.user_type !== 'tenant') {
      return res.status(403).json({
        success: false,
        message: 'Only tenants can request lease renewals'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { requested_start_date, requested_term_months, message = '' } = req.body;

      // Get current lease
      const leaseResult = await db.query(
        `SELECT l.*, u.unit_number, p.name as property_name
         FROM leases l
         JOIN units u ON l.unit_id = u.id
         JOIN properties p ON u.property_id = p.id
         WHERE l.primary_tenant_id = $1 AND l.status = 'active'`,
        [req.user.id]
      );

      if (leaseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active lease found'
        });
      }

      const lease = leaseResult.rows[0];

      // Create renewal request (stored as a maintenance request with special category)
      const renewalResult = await db.query(
        `INSERT INTO maintenance_requests 
         (property_id, unit_id, tenant_id, title, description, priority, status, category_id)
         VALUES ($1, $2, $3, $4, $5, 'normal', 'pending', 
         (SELECT id FROM maintenance_categories WHERE name = 'General Maintenance' LIMIT 1))
         RETURNING *`,
        [
          lease.property_id,
          lease.unit_id,
          req.user.id,
          'Lease Renewal Request',
          `Lease renewal request for Unit ${lease.unit_number}

Requested Start Date: ${requested_start_date}
Requested Term: ${requested_term_months} months

Message from tenant: ${message || 'No additional message'}`
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Lease renewal request submitted successfully',
        data: { renewalRequest: renewalResult.rows[0] }
      });
    } catch (error) {
      console.error('Error creating lease renewal request:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating lease renewal request'
      });
    }
  }
);

module.exports = router;