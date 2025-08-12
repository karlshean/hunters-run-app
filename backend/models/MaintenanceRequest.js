import { query } from '../config/database.js';

export class MaintenanceRequest {
  static async create(requestData) {
    const {
      propertyId,
      unitId,
      buildingId,
      tenantId,
      categoryId,
      title,
      description,
      priority = 'normal',
      locationDescription,
      tenantAvailability,
      permissionToEnter = false,
      estimatedCost,
      images = []
    } = requestData;

    const result = await query(`
      INSERT INTO maintenance_requests (
        property_id, unit_id, building_id, tenant_id, category_id, title, description,
        priority, location_description, tenant_availability, permission_to_enter,
        estimated_cost, images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      propertyId, unitId, buildingId, tenantId, categoryId, title, description,
      priority, locationDescription, tenantAvailability, permissionToEnter,
      estimatedCost, images
    ]);

    return result.rows[0];
  }

  static async findById(id, includeDetails = false) {
    let queryText = `
      SELECT mr.*,
             p.name as property_name,
             p.address_line1 as property_address,
             u.unit_number,
             b.name as building_name,
             tenant.first_name || ' ' || tenant.last_name as tenant_name,
             tenant.phone as tenant_phone,
             tenant.email as tenant_email,
             assigned.first_name || ' ' || assigned.last_name as assigned_to_name,
             assigned.phone as assigned_to_phone,
             mc.name as category_name,
             mc.color as category_color,
             mc.icon as category_icon
      FROM maintenance_requests mr
      JOIN properties p ON mr.property_id = p.id
      LEFT JOIN units u ON mr.unit_id = u.id
      LEFT JOIN buildings b ON mr.building_id = b.id
      LEFT JOIN users tenant ON mr.tenant_id = tenant.id
      LEFT JOIN users assigned ON mr.assigned_to = assigned.id
      LEFT JOIN maintenance_categories mc ON mr.category_id = mc.id
      WHERE mr.id = $1
    `;

    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) return null;

    const request = result.rows[0];

    if (includeDetails) {
      // Get request updates/history
      const updatesResult = await query(`
        SELECT mru.*,
               u.first_name || ' ' || u.last_name as user_name,
               u.user_type
        FROM maintenance_request_updates mru
        LEFT JOIN users u ON mru.user_id = u.id
        WHERE mru.request_id = $1
        ORDER BY mru.created_at DESC
      `, [id]);

      request.updates = updatesResult.rows;
    }

    return request;
  }

  static async findByProperty(propertyId, filters = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    let queryText = `
      SELECT mr.id, mr.title, mr.description, mr.priority, mr.status, mr.created_at,
             mr.assigned_at, mr.completed_at, mr.estimated_cost, mr.actual_cost,
             p.name as property_name,
             u.unit_number,
             b.name as building_name,
             tenant.first_name || ' ' || tenant.last_name as tenant_name,
             assigned.first_name || ' ' || assigned.last_name as assigned_to_name,
             mc.name as category_name,
             mc.color as category_color,
             mc.icon as category_icon
      FROM maintenance_requests mr
      JOIN properties p ON mr.property_id = p.id
      LEFT JOIN units u ON mr.unit_id = u.id
      LEFT JOIN buildings b ON mr.building_id = b.id
      LEFT JOIN users tenant ON mr.tenant_id = tenant.id
      LEFT JOIN users assigned ON mr.assigned_to = assigned.id
      LEFT JOIN maintenance_categories mc ON mr.category_id = mc.id
      WHERE mr.property_id = $1
    `;
    
    const params = [propertyId];
    let paramCount = 1;
    
    if (filters.status) {
      paramCount++;
      queryText += ` AND mr.status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.priority) {
      paramCount++;
      queryText += ` AND mr.priority = $${paramCount}`;
      params.push(filters.priority);
    }
    
    if (filters.assignedTo) {
      paramCount++;
      queryText += ` AND mr.assigned_to = $${paramCount}`;
      params.push(filters.assignedTo);
    }
    
    if (filters.categoryId) {
      paramCount++;
      queryText += ` AND mr.category_id = $${paramCount}`;
      params.push(filters.categoryId);
    }
    
    if (filters.unitId) {
      paramCount++;
      queryText += ` AND mr.unit_id = $${paramCount}`;
      params.push(filters.unitId);
    }

    if (filters.dateFrom) {
      paramCount++;
      queryText += ` AND mr.created_at >= $${paramCount}`;
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramCount++;
      queryText += ` AND mr.created_at <= $${paramCount}`;
      params.push(filters.dateTo);
    }
    
    queryText += `
      ORDER BY 
        CASE mr.priority 
          WHEN 'emergency' THEN 1 
          WHEN 'urgent' THEN 2 
          WHEN 'normal' THEN 3 
          WHEN 'low' THEN 4 
        END,
        mr.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limit, offset);

    const result = await query(queryText, params);
    
    // Get total count with same filters
    let countQuery = `SELECT COUNT(*) FROM maintenance_requests mr WHERE mr.property_id = $1`;
    const countParams = [propertyId];
    let countParamCount = 1;
    
    if (filters.status) {
      countParamCount++;
      countQuery += ` AND mr.status = $${countParamCount}`;
      countParams.push(filters.status);
    }
    
    if (filters.priority) {
      countParamCount++;
      countQuery += ` AND mr.priority = $${countParamCount}`;
      countParams.push(filters.priority);
    }
    
    if (filters.assignedTo) {
      countParamCount++;
      countQuery += ` AND mr.assigned_to = $${countParamCount}`;
      countParams.push(filters.assignedTo);
    }
    
    const countResult = await query(countQuery, countParams);
    
    return {
      requests: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    };
  }

  static async findByTenant(tenantId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    const result = await query(`
      SELECT mr.id, mr.title, mr.description, mr.priority, mr.status, mr.created_at,
             mr.assigned_at, mr.completed_at, mr.tenant_rating, mr.tenant_feedback,
             mr.images, mr.location_description,
             p.name as property_name,
             u.unit_number,
             assigned.first_name || ' ' || assigned.last_name as assigned_to_name,
             mc.name as category_name,
             mc.color as category_color
      FROM maintenance_requests mr
      JOIN properties p ON mr.property_id = p.id
      LEFT JOIN units u ON mr.unit_id = u.id
      LEFT JOIN users assigned ON mr.assigned_to = assigned.id
      LEFT JOIN maintenance_categories mc ON mr.category_id = mc.id
      WHERE mr.tenant_id = $1
      ORDER BY mr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tenantId, limit, offset]);
    
    const countResult = await query(
      'SELECT COUNT(*) FROM maintenance_requests WHERE tenant_id = $1',
      [tenantId]
    );
    
    return {
      requests: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    };
  }

  static async findByAssignedTo(userId, status = null, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    let queryText = `
      SELECT mr.id, mr.title, mr.description, mr.priority, mr.status, mr.created_at,
             mr.assigned_at, mr.started_at, mr.estimated_cost, mr.actual_cost,
             mr.images, mr.location_description, mr.permission_to_enter,
             p.name as property_name,
             p.address_line1 as property_address,
             u.unit_number,
             b.name as building_name,
             tenant.first_name || ' ' || tenant.last_name as tenant_name,
             tenant.phone as tenant_phone,
             mc.name as category_name,
             mc.color as category_color
      FROM maintenance_requests mr
      JOIN properties p ON mr.property_id = p.id
      LEFT JOIN units u ON mr.unit_id = u.id
      LEFT JOIN buildings b ON mr.building_id = b.id
      LEFT JOIN users tenant ON mr.tenant_id = tenant.id
      LEFT JOIN maintenance_categories mc ON mr.category_id = mc.id
      WHERE mr.assigned_to = $1
    `;
    
    const params = [userId];
    
    if (status) {
      queryText += ` AND mr.status = $2`;
      params.push(status);
    }
    
    queryText += `
      ORDER BY 
        CASE mr.priority 
          WHEN 'emergency' THEN 1 
          WHEN 'urgent' THEN 2 
          WHEN 'normal' THEN 3 
          WHEN 'low' THEN 4 
        END,
        mr.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(limit, offset);

    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM maintenance_requests WHERE assigned_to = $1';
    const countParams = [userId];
    
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    
    const countResult = await query(countQuery, countParams);
    
    return {
      requests: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    };
  }

  static async updateById(id, updates) {
    const allowedFields = [
      'title', 'description', 'priority', 'status', 'location_description',
      'tenant_availability', 'permission_to_enter', 'estimated_cost', 'actual_cost',
      'assigned_to', 'started_at', 'completed_at', 'cancelled_at', 'cancellation_reason',
      'tenant_rating', 'tenant_feedback', 'internal_notes', 'images'
    ];

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Handle status-specific timestamp updates
    if (updates.status) {
      if (updates.status === 'in_progress' && !updates.started_at) {
        fields.push(`started_at = CURRENT_TIMESTAMP`);
      } else if (updates.status === 'completed' && !updates.completed_at) {
        fields.push(`completed_at = CURRENT_TIMESTAMP`);
      } else if (updates.status === 'cancelled' && !updates.cancelled_at) {
        fields.push(`cancelled_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.assigned_to && !updates.assigned_at) {
      fields.push(`assigned_at = CURRENT_TIMESTAMP`);
    }

    values.push(id);
    
    const result = await query(`
      UPDATE maintenance_requests 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  static async addUpdate(requestId, userId, updateData) {
    const {
      updateType,
      oldStatus,
      newStatus,
      message,
      images = [],
      isVisibleToTenant = true
    } = updateData;

    const result = await query(`
      INSERT INTO maintenance_request_updates (
        request_id, user_id, update_type, old_status, new_status, 
        message, images, is_visible_to_tenant
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [requestId, userId, updateType, oldStatus, newStatus, message, images, isVisibleToTenant]);

    return result.rows[0];
  }

  static async getCategories() {
    const result = await query(`
      SELECT * FROM maintenance_categories 
      WHERE is_active = true 
      ORDER BY name
    `);

    return result.rows;
  }

  static async getDashboardStats(propertyId = null, assignedTo = null) {
    let queryText = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_requests,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_requests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
        COUNT(CASE WHEN priority = 'emergency' THEN 1 END) as emergency_requests,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_requests,
        AVG(CASE WHEN status = 'completed' AND completed_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - created_at))/3600 END) as avg_completion_hours,
        AVG(CASE WHEN tenant_rating IS NOT NULL THEN tenant_rating END) as avg_rating
      FROM maintenance_requests mr
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const params = [];
    let paramCount = 0;

    if (propertyId) {
      paramCount++;
      queryText += ` AND property_id = $${paramCount}`;
      params.push(propertyId);
    }

    if (assignedTo) {
      paramCount++;
      queryText += ` AND assigned_to = $${paramCount}`;
      params.push(assignedTo);
    }

    const result = await query(queryText, params);
    return result.rows[0];
  }

  static async getRecentRequests(limit = 10, propertyId = null, assignedTo = null) {
    let queryText = `
      SELECT mr.id, mr.title, mr.priority, mr.status, mr.created_at,
             p.name as property_name,
             u.unit_number,
             tenant.first_name || ' ' || tenant.last_name as tenant_name
      FROM maintenance_requests mr
      JOIN properties p ON mr.property_id = p.id
      LEFT JOIN units u ON mr.unit_id = u.id
      LEFT JOIN users tenant ON mr.tenant_id = tenant.id
      WHERE 1 = 1
    `;

    const params = [];
    let paramCount = 0;

    if (propertyId) {
      paramCount++;
      queryText += ` AND mr.property_id = $${paramCount}`;
      params.push(propertyId);
    }

    if (assignedTo) {
      paramCount++;
      queryText += ` AND mr.assigned_to = $${paramCount}`;
      params.push(assignedTo);
    }

    queryText += `
      ORDER BY mr.created_at DESC
      LIMIT $${paramCount + 1}
    `;
    params.push(limit);

    const result = await query(queryText, params);
    return result.rows;
  }
}