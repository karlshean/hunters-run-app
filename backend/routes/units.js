import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize, requireSameCompany } from '../middleware/auth.js';
import { validateUnit } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication and same company access
router.use(authenticate);
router.use(requireSameCompany);

// Get units for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status, buildingId, page = 1, limit = 50 } = req.query;
    
    const offset = (page - 1) * limit;
    
    let queryText = `
      SELECT u.*, 
             b.name as building_name,
             COALESCE(l.status, 'vacant') as lease_status,
             l.monthly_rent as current_rent,
             l.start_date as lease_start,
             l.end_date as lease_end,
             tenant.first_name || ' ' || tenant.last_name as tenant_name,
             tenant.phone as tenant_phone,
             tenant.email as tenant_email
      FROM units u
      LEFT JOIN buildings b ON u.building_id = b.id
      LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
      LEFT JOIN lease_tenants lt ON l.id = lt.lease_id AND lt.is_primary = true
      LEFT JOIN users tenant ON lt.tenant_id = tenant.id
      WHERE u.property_id = $1 AND u.is_active = true
    `;
    
    const params = [propertyId];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      queryText += ` AND u.status = $${paramCount}`;
      params.push(status);
    }
    
    if (buildingId) {
      paramCount++;
      queryText += ` AND u.building_id = $${paramCount}`;
      params.push(buildingId);
    }
    
    queryText += `
      ORDER BY 
        CASE WHEN u.unit_number ~ '^[A-Z]' THEN 
          SUBSTRING(u.unit_number FROM '^[A-Z]+') 
        ELSE '~' END,
        CASE WHEN u.unit_number ~ '[0-9]+' THEN 
          CAST(REGEXP_REPLACE(u.unit_number, '[^0-9]', '', 'g') AS INTEGER) 
        ELSE 999999 END,
        u.unit_number
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limit, offset);

    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM units WHERE property_id = $1 AND is_active = true`;
    const countParams = [propertyId];
    
    const countResult = await query(countQuery, countParams);
    
    res.json({
      success: true,
      data: {
        units: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get units',
      error: error.message
    });
  }
});

// Get single unit by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.*, 
             p.name as property_name,
             p.address_line1 as property_address,
             b.name as building_name,
             COALESCE(l.status, 'vacant') as lease_status,
             l.monthly_rent as current_rent,
             l.start_date as lease_start,
             l.end_date as lease_end,
             l.security_deposit,
             tenant.first_name || ' ' || tenant.last_name as tenant_name,
             tenant.phone as tenant_phone,
             tenant.email as tenant_email
      FROM units u
      JOIN properties p ON u.property_id = p.id
      LEFT JOIN buildings b ON u.building_id = b.id
      LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
      LEFT JOIN lease_tenants lt ON l.id = lt.lease_id AND lt.is_primary = true
      LEFT JOIN users tenant ON lt.tenant_id = tenant.id
      WHERE u.id = $1 AND u.is_active = true
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    const unit = result.rows[0];

    // Check if property belongs to user's company
    const propertyResult = await query(
      'SELECT company_id FROM properties WHERE id = $1',
      [unit.property_id]
    );
    
    if (propertyResult.rows.length === 0 || propertyResult.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { unit }
    });
  } catch (error) {
    console.error('Get unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unit',
      error: error.message
    });
  }
});

// Create new unit
router.post('/', authorize('admin', 'manager'), validateUnit, async (req, res) => {
  try {
    const {
      propertyId,
      buildingId,
      unitNumber,
      floorNumber,
      unitType,
      bedrooms,
      bathrooms,
      squareFootage,
      rentAmount,
      securityDeposit,
      petDeposit,
      amenities,
      description,
      images
    } = req.body;

    // Verify property belongs to user's company
    const propertyResult = await query(
      'SELECT company_id FROM properties WHERE id = $1',
      [propertyId]
    );
    
    if (propertyResult.rows.length === 0 || propertyResult.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this property'
      });
    }

    const result = await query(`
      INSERT INTO units (
        property_id, building_id, unit_number, floor_number, unit_type,
        bedrooms, bathrooms, square_footage, rent_amount, security_deposit,
        pet_deposit, amenities, description, images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      propertyId, buildingId, unitNumber, floorNumber, unitType,
      bedrooms, bathrooms, squareFootage, rentAmount, securityDeposit,
      petDeposit, amenities, description, images
    ]);

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: { unit: result.rows[0] }
    });
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create unit',
      error: error.message
    });
  }
});

// Update unit
router.put('/:id', authorize('admin', 'manager'), validateUnit, async (req, res) => {
  try {
    // First check if unit exists and belongs to user's company
    const unitResult = await query(`
      SELECT u.*, p.company_id 
      FROM units u 
      JOIN properties p ON u.property_id = p.id 
      WHERE u.id = $1 AND u.is_active = true
    `, [req.params.id]);
    
    if (unitResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    if (unitResult.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const allowedFields = [
      'unit_number', 'floor_number', 'unit_type', 'bedrooms', 'bathrooms',
      'square_footage', 'rent_amount', 'security_deposit', 'pet_deposit',
      'status', 'amenities', 'description', 'images', 'notes'
    ];

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(req.body).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(req.params.id);
    
    const result = await query(`
      UPDATE units 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND is_active = true
      RETURNING *
    `, values);

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: { unit: result.rows[0] }
    });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update unit',
      error: error.message
    });
  }
});

// Delete unit (soft delete)
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    // First check if unit exists and belongs to user's company
    const unitResult = await query(`
      SELECT u.*, p.company_id 
      FROM units u 
      JOIN properties p ON u.property_id = p.id 
      WHERE u.id = $1 AND u.is_active = true
    `, [req.params.id]);
    
    if (unitResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    if (unitResult.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if unit has active leases
    const leaseResult = await query(`
      SELECT COUNT(*) FROM leases WHERE unit_id = $1 AND status = 'active'
    `, [req.params.id]);

    if (parseInt(leaseResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete unit with active leases'
      });
    }

    const result = await query(`
      UPDATE units 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, unit_number, is_active
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'Unit deleted successfully',
      data: { unit: result.rows[0] }
    });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete unit',
      error: error.message
    });
  }
});

// Get unit maintenance history
router.get('/:id/maintenance', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // First check if unit belongs to user's company
    const unitResult = await query(`
      SELECT u.*, p.company_id 
      FROM units u 
      JOIN properties p ON u.property_id = p.id 
      WHERE u.id = $1 AND u.is_active = true
    `, [req.params.id]);
    
    if (unitResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    if (unitResult.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const result = await query(`
      SELECT mr.id, mr.title, mr.description, mr.priority, mr.status, 
             mr.created_at, mr.completed_at,
             mc.name as category_name,
             assigned.first_name || ' ' || assigned.last_name as assigned_to_name
      FROM maintenance_requests mr
      LEFT JOIN maintenance_categories mc ON mr.category_id = mc.id
      LEFT JOIN users assigned ON mr.assigned_to = assigned.id
      WHERE mr.unit_id = $1
      ORDER BY mr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.params.id, limit, offset]);

    const countResult = await query(
      'SELECT COUNT(*) FROM maintenance_requests WHERE unit_id = $1',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        maintenanceHistory: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Get unit maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unit maintenance history',
      error: error.message
    });
  }
});

export default router;