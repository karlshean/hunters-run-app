const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Get tenant's payment methods
router.get('/methods', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, method_type, provider, account_type, last_four, 
              bank_name, card_brand, expiry_month, expiry_year, 
              is_default, nickname, created_at
       FROM payment_methods 
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { paymentMethods: result.rows }
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods'
    });
  }
});

// Add new payment method
router.post('/methods', 
  auth,
  [
    body('method_type').isIn(['ach', 'card', 'paypal', 'venmo']).withMessage('Invalid payment method type'),
    body('provider').notEmpty().withMessage('Provider is required'),
    body('nickname').optional().isLength({ max: 100 }).withMessage('Nickname must be 100 characters or less')
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
        method_type,
        provider,
        external_id,
        account_type,
        last_four,
        bank_name,
        card_brand,
        expiry_month,
        expiry_year,
        nickname,
        is_default = false
      } = req.body;

      // If setting as default, unset other defaults
      if (is_default) {
        await client.query(
          'UPDATE payment_methods SET is_default = false WHERE tenant_id = $1',
          [req.user.id]
        );
      }

      const result = await client.query(
        `INSERT INTO payment_methods 
         (tenant_id, method_type, provider, external_id, account_type, 
          last_four, bank_name, card_brand, expiry_month, expiry_year, 
          nickname, is_default, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
         RETURNING *`,
        [req.user.id, method_type, provider, external_id, account_type,
         last_four, bank_name, card_brand, expiry_month, expiry_year,
         nickname, is_default]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: { paymentMethod: result.rows[0] }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding payment method:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding payment method'
      });
    } finally {
      client.release();
    }
  }
);

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, payment_type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.tenant_id = $1';
    let params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (payment_type) {
      whereClause += ` AND p.payment_type = $${paramIndex}`;
      params.push(payment_type);
      paramIndex++;
    }

    const result = await db.query(
      `SELECT p.*, pm.nickname as payment_method_name, 
              u.unit_number, prop.name as property_name
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       LEFT JOIN units u ON p.unit_id = u.id
       LEFT JOIN properties prop ON u.property_id = prop.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM payments p ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
});

// Get outstanding balances
router.get('/balance', auth, async (req, res) => {
  try {
    // Get current lease and outstanding transactions
    const result = await db.query(
      `SELECT 
         SUM(CASE WHEN t.status = 'pending' AND t.due_date < CURRENT_DATE THEN t.amount ELSE 0 END) as overdue_amount,
         SUM(CASE WHEN t.status = 'pending' AND t.due_date >= CURRENT_DATE THEN t.amount ELSE 0 END) as current_amount,
         SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END) as total_balance,
         l.monthly_rent,
         l.end_date as lease_end_date,
         u.unit_number,
         p.name as property_name
       FROM transactions t
       LEFT JOIN leases l ON t.lease_id = l.id
       LEFT JOIN units u ON t.unit_id = u.id
       LEFT JOIN properties p ON u.property_id = p.id
       WHERE t.tenant_id = $1 AND l.status = 'active'
       GROUP BY l.monthly_rent, l.end_date, u.unit_number, p.name`,
      [req.user.id]
    );

    // Get next rent due date
    const nextRentResult = await db.query(
      `SELECT MIN(due_date) as next_due_date
       FROM transactions 
       WHERE tenant_id = $1 AND status = 'pending' AND transaction_type = 'rent'`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        balance: result.rows[0] || {
          overdue_amount: 0,
          current_amount: 0,
          total_balance: 0,
          monthly_rent: 0,
          lease_end_date: null,
          unit_number: null,
          property_name: null
        },
        next_rent_due: nextRentResult.rows[0]?.next_due_date || null
      }
    });
  } catch (error) {
    console.error('Error fetching payment balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment balance'
    });
  }
});

// Make a payment
router.post('/pay',
  auth,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('payment_method_id').isUUID().withMessage('Valid payment method is required'),
    body('payment_type').isIn(['rent', 'fee', 'deposit', 'utility']).withMessage('Invalid payment type')
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
        amount,
        payment_method_id,
        payment_type,
        transaction_ids = [],
        scheduled_date = null
      } = req.body;

      // Verify payment method belongs to tenant
      const paymentMethodResult = await client.query(
        'SELECT * FROM payment_methods WHERE id = $1 AND tenant_id = $2 AND is_active = true',
        [payment_method_id, req.user.id]
      );

      if (paymentMethodResult.rows.length === 0) {
        throw new Error('Invalid payment method');
      }

      const paymentMethod = paymentMethodResult.rows[0];

      // Get lease and unit information
      const leaseResult = await client.query(
        `SELECT l.*, u.id as unit_id FROM leases l
         JOIN units u ON l.unit_id = u.id
         WHERE l.primary_tenant_id = $1 AND l.status = 'active'`,
        [req.user.id]
      );

      if (leaseResult.rows.length === 0) {
        throw new Error('No active lease found');
      }

      const lease = leaseResult.rows[0];

      // Calculate fees (simplified - in real app would integrate with payment processor)
      const fee_amount = calculateProcessingFee(amount, paymentMethod.method_type);
      const total_amount = parseFloat(amount) + fee_amount;

      // Create payment record
      const paymentResult = await client.query(
        `INSERT INTO payments 
         (tenant_id, lease_id, unit_id, payment_method_id, amount, fee_amount, 
          total_amount, payment_type, payment_method, status, scheduled_date, 
          confirmation_number, external_transaction_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          req.user.id,
          lease.id,
          lease.unit_id,
          payment_method_id,
          amount,
          fee_amount,
          total_amount,
          payment_type,
          paymentMethod.method_type,
          scheduled_date ? 'pending' : 'processing',
          scheduled_date,
          generateConfirmationNumber(),
          generateTransactionId()
        ]
      );

      const payment = paymentResult.rows[0];

      // If paying for specific transactions, update their status
      if (transaction_ids.length > 0) {
        await client.query(
          `UPDATE transactions 
           SET status = 'paid', payment_date = CURRENT_DATE 
           WHERE id = ANY($1) AND tenant_id = $2`,
          [transaction_ids, req.user.id]
        );
      }

      // In real implementation, integrate with payment processor here
      // For demo, we'll simulate immediate success for ACH, processing for cards
      if (!scheduled_date) {
        const finalStatus = paymentMethod.method_type === 'ach' ? 'completed' : 'processing';
        await client.query(
          'UPDATE payments SET status = $1, processed_date = CURRENT_TIMESTAMP WHERE id = $2',
          [finalStatus, payment.id]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Payment submitted successfully',
        data: { 
          payment: {
            ...payment,
            status: !scheduled_date ? 'completed' : 'pending'
          }
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing payment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error processing payment'
      });
    } finally {
      client.release();
    }
  }
);

// Get auto-pay settings
router.get('/autopay', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT aps.*, pm.method_type, pm.nickname, pm.last_four 
       FROM auto_pay_settings aps
       JOIN payment_methods pm ON aps.payment_method_id = pm.id
       WHERE aps.tenant_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { autoPaySettings: result.rows[0] || null }
    });
  } catch (error) {
    console.error('Error fetching auto-pay settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching auto-pay settings'
    });
  }
});

// Update auto-pay settings
router.post('/autopay',
  auth,
  [
    body('payment_method_id').isUUID().withMessage('Valid payment method is required'),
    body('payment_day').isInt({ min: 1, max: 28 }).withMessage('Payment day must be between 1 and 28'),
    body('is_active').isBoolean().withMessage('is_active must be a boolean')
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
      const {
        payment_method_id,
        payment_day,
        payment_amount,
        include_late_fees = true,
        include_utilities = false,
        is_active = true
      } = req.body;

      // Verify payment method belongs to tenant
      const paymentMethodResult = await db.query(
        'SELECT id FROM payment_methods WHERE id = $1 AND tenant_id = $2 AND is_active = true',
        [payment_method_id, req.user.id]
      );

      if (paymentMethodResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
      }

      const result = await db.query(
        `INSERT INTO auto_pay_settings 
         (tenant_id, payment_method_id, payment_day, payment_amount, 
          include_late_fees, include_utilities, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id)
         DO UPDATE SET
           payment_method_id = $2,
           payment_day = $3,
           payment_amount = $4,
           include_late_fees = $5,
           include_utilities = $6,
           is_active = $7,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [req.user.id, payment_method_id, payment_day, payment_amount,
         include_late_fees, include_utilities, is_active]
      );

      res.json({
        success: true,
        message: 'Auto-pay settings updated successfully',
        data: { autoPaySettings: result.rows[0] }
      });
    } catch (error) {
      console.error('Error updating auto-pay settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating auto-pay settings'
      });
    }
  }
);

// Admin/Manager routes for payment management
router.get('/all', 
  auth, 
  roleCheck(['admin', 'manager']), 
  async (req, res) => {
    try {
      const { page = 1, limit = 50, status, property_id, tenant_id } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE p.tenant_id IS NOT NULL';
      let params = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (property_id) {
        whereClause += ` AND prop.id = $${paramIndex}`;
        params.push(property_id);
        paramIndex++;
      }

      if (tenant_id) {
        whereClause += ` AND p.tenant_id = $${paramIndex}`;
        params.push(tenant_id);
        paramIndex++;
      }

      const result = await db.query(
        `SELECT p.*, pm.nickname as payment_method_name,
                u.unit_number, prop.name as property_name,
                tenant.first_name || ' ' || tenant.last_name as tenant_name
         FROM payments p
         LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
         LEFT JOIN units u ON p.unit_id = u.id
         LEFT JOIN properties prop ON u.property_id = prop.id
         LEFT JOIN users tenant ON p.tenant_id = tenant.id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const countResult = await db.query(
        `SELECT COUNT(*) FROM payments p
         LEFT JOIN units u ON p.unit_id = u.id
         LEFT JOIN properties prop ON u.property_id = prop.id
         ${whereClause}`,
        params
      );

      res.json({
        success: true,
        data: {
          payments: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].count),
            pages: Math.ceil(countResult.rows[0].count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all payments:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payments'
      });
    }
  }
);

// Helper functions
function calculateProcessingFee(amount, method_type) {
  switch (method_type) {
    case 'ach':
      return Math.min(1.95, amount * 0.01); // $1.95 or 1% max
    case 'card':
      return amount * 0.029; // 2.9%
    case 'paypal':
      return amount * 0.035; // 3.5%
    default:
      return 0;
  }
}

function generateConfirmationNumber() {
  return 'PAY-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function generateTransactionId() {
  return 'TXN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 8).toUpperCase();
}

module.exports = router;