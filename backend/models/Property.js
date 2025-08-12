import { query } from '../config/database.js';

export class Property {
  static async create(propertyData) {
    const {
      companyId,
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country = 'US',
      propertyType,
      totalUnits,
      builtYear,
      squareFootage,
      lotSizeSqft,
      parkingSpaces,
      amenities,
      description,
      propertyManagerId,
      coordinates,
      images
    } = propertyData;

    const result = await query(`
      INSERT INTO properties (
        company_id, name, address_line1, address_line2, city, state, zip_code, country,
        property_type, total_units, built_year, square_footage, lot_size_sqft,
        parking_spaces, amenities, description, property_manager_id, coordinates, images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      companyId, name, addressLine1, addressLine2, city, state, zipCode, country,
      propertyType, totalUnits, builtYear, squareFootage, lotSizeSqft,
      parkingSpaces, amenities, description, propertyManagerId, coordinates, images
    ]);

    return result.rows[0];
  }

  static async findById(id, includeUnits = false) {
    let queryText = `
      SELECT p.*, 
             u.first_name || ' ' || u.last_name as manager_name,
             c.name as company_name
      FROM properties p
      LEFT JOIN users u ON p.property_manager_id = u.id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE p.id = $1 AND p.is_active = true
    `;

    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) return null;

    const property = result.rows[0];

    if (includeUnits) {
      const unitsResult = await query(`
        SELECT u.*, 
               COALESCE(l.status, 'vacant') as lease_status,
               l.monthly_rent as current_rent,
               l.start_date as lease_start,
               l.end_date as lease_end
        FROM units u
        LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
        WHERE u.property_id = $1 AND u.is_active = true
        ORDER BY u.unit_number
      `, [id]);

      property.units = unitsResult.rows;
    }

    return property;
  }

  static async findByCompany(companyId, page = 1, limit = 50, filters = {}) {
    const offset = (page - 1) * limit;
    
    let queryText = `
      SELECT p.id, p.name, p.address_line1, p.city, p.state, p.zip_code,
             p.property_type, p.total_units, p.created_at,
             u.first_name || ' ' || u.last_name as manager_name,
             COUNT(DISTINCT units.id) as actual_unit_count,
             COUNT(DISTINCT active_leases.id) as occupied_units
      FROM properties p
      LEFT JOIN users u ON p.property_manager_id = u.id
      LEFT JOIN units ON p.id = units.property_id AND units.is_active = true
      LEFT JOIN leases active_leases ON units.id = active_leases.unit_id AND active_leases.status = 'active'
      WHERE p.company_id = $1 AND p.is_active = true
    `;
    
    const params = [companyId];
    let paramCount = 1;
    
    if (filters.propertyType) {
      paramCount++;
      queryText += ` AND p.property_type = $${paramCount}`;
      params.push(filters.propertyType);
    }
    
    if (filters.search) {
      paramCount++;
      queryText += ` AND (p.name ILIKE $${paramCount} OR p.address_line1 ILIKE $${paramCount} OR p.city ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }
    
    queryText += `
      GROUP BY p.id, p.name, p.address_line1, p.city, p.state, p.zip_code,
               p.property_type, p.total_units, p.created_at, u.first_name, u.last_name
      ORDER BY p.created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limit, offset);

    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM properties WHERE company_id = $1 AND is_active = true`;
    const countParams = [companyId];
    
    if (filters.propertyType) {
      countQuery += ` AND property_type = $2`;
      countParams.push(filters.propertyType);
    }
    
    const countResult = await query(countQuery, countParams);
    
    return {
      properties: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    };
  }

  static async updateById(id, updates) {
    const allowedFields = [
      'name', 'address_line1', 'address_line2', 'city', 'state', 'zip_code',
      'property_type', 'total_units', 'built_year', 'square_footage', 'lot_size_sqft',
      'parking_spaces', 'amenities', 'description', 'property_manager_id',
      'coordinates', 'images', 'settings'
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

    values.push(id);
    
    const result = await query(`
      UPDATE properties 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND is_active = true
      RETURNING *
    `, values);

    return result.rows[0];
  }

  static async deleteById(id) {
    const result = await query(`
      UPDATE properties 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, is_active
    `, [id]);

    return result.rows[0];
  }

  static async getBuildings(propertyId) {
    const result = await query(`
      SELECT b.*, COUNT(u.id) as unit_count
      FROM buildings b
      LEFT JOIN units u ON b.id = u.building_id AND u.is_active = true
      WHERE b.property_id = $1 AND b.is_active = true
      GROUP BY b.id
      ORDER BY b.name
    `, [propertyId]);

    return result.rows;
  }

  static async createBuilding(propertyId, buildingData) {
    const {
      name,
      buildingNumber,
      addressLine1,
      addressLine2,
      floors,
      unitsPerFloor,
      totalUnits,
      builtYear,
      squareFootage,
      description,
      coordinates
    } = buildingData;

    const result = await query(`
      INSERT INTO buildings (
        property_id, name, building_number, address_line1, address_line2,
        floors, units_per_floor, total_units, built_year, square_footage,
        description, coordinates
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      propertyId, name, buildingNumber, addressLine1, addressLine2,
      floors, unitsPerFloor, totalUnits, builtYear, squareFootage,
      description, coordinates
    ]);

    return result.rows[0];
  }

  static async getDashboardStats(propertyId) {
    const result = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_units,
        COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) as occupied_units,
        COUNT(DISTINCT CASE WHEN u.status = 'vacant' THEN u.id END) as vacant_units,
        COUNT(DISTINCT CASE WHEN u.status = 'maintenance' THEN u.id END) as maintenance_units,
        COUNT(DISTINCT mr.id) as total_maintenance_requests,
        COUNT(DISTINCT CASE WHEN mr.status = 'pending' THEN mr.id END) as pending_requests,
        COUNT(DISTINCT CASE WHEN mr.status = 'in_progress' THEN mr.id END) as active_requests,
        COUNT(DISTINCT CASE WHEN mr.priority = 'emergency' THEN mr.id END) as emergency_requests,
        COALESCE(SUM(CASE WHEN l.status = 'active' THEN l.monthly_rent END), 0) as total_monthly_rent,
        COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_leases
      FROM properties p
      LEFT JOIN units u ON p.id = u.property_id AND u.is_active = true
      LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
      LEFT JOIN maintenance_requests mr ON p.id = mr.property_id AND mr.created_at >= CURRENT_DATE - INTERVAL '30 days'
      WHERE p.id = $1 AND p.is_active = true
      GROUP BY p.id
    `, [propertyId]);

    return result.rows[0];
  }

  static async getRecentActivity(propertyId, limit = 10) {
    const result = await query(`
      SELECT 
        al.action,
        al.description,
        al.created_at,
        u.first_name || ' ' || u.last_name as user_name,
        al.entity_type,
        al.entity_id
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE (al.entity_type = 'property' AND al.entity_id::text = $1)
         OR (al.entity_type = 'unit' AND al.entity_id::text IN (
           SELECT id::text FROM units WHERE property_id = $1
         ))
         OR (al.entity_type = 'maintenance_request' AND al.entity_id::text IN (
           SELECT id::text FROM maintenance_requests WHERE property_id = $1
         ))
      ORDER BY al.created_at DESC
      LIMIT $2
    `, [propertyId, limit]);

    return result.rows;
  }
}