import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';

export class User {
  static async create(userData) {
    const {
      companyId,
      email,
      password,
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      phone,
      userType,
      roleId,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query(`
      INSERT INTO users (
        company_id, email, password_hash, first_name, last_name, middle_name,
        date_of_birth, phone, user_type, role_id,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, email, first_name, last_name, user_type, is_active, created_at
    `, [
      companyId, email, hashedPassword, firstName, lastName, middleName,
      dateOfBirth, phone, userType, roleId,
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship
    ]);

    return result.rows[0];
  }

  static async findById(id, includeCompany = false) {
    let queryText = `
      SELECT u.id, u.company_id, u.email, u.phone, u.first_name, u.last_name, u.middle_name,
             u.date_of_birth, u.user_type, u.is_active, u.email_verified, u.phone_verified,
             u.last_login_at, u.profile_image_url, u.emergency_contact_name,
             u.emergency_contact_phone, u.emergency_contact_relationship, u.preferences,
             u.created_at, u.updated_at,
             r.name as role_name, r.permissions as role_permissions
    `;

    if (includeCompany) {
      queryText += `, c.name as company_name, c.type as company_type`;
    }

    queryText += `
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
    `;

    if (includeCompany) {
      queryText += ` LEFT JOIN companies c ON u.company_id = c.id`;
    }

    queryText += ` WHERE u.id = $1`;

    const result = await query(queryText, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query(`
      SELECT u.id, u.company_id, u.email, u.password_hash, u.first_name, u.last_name,
             u.user_type, u.is_active, u.email_verified, u.last_login_at,
             r.name as role_name, r.permissions as role_permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1 AND u.is_active = true
    `, [email]);

    return result.rows[0];
  }

  static async findByCompany(companyId, userType = null, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    let queryText = `
      SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.user_type,
             u.is_active, u.email_verified, u.phone_verified, u.last_login_at,
             u.profile_image_url, u.created_at,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.company_id = $1
    `;
    
    const params = [companyId];
    
    if (userType) {
      queryText += ` AND u.user_type = $${params.length + 1}`;
      params.push(userType);
    }
    
    queryText += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM users WHERE company_id = $1`;
    const countParams = [companyId];
    
    if (userType) {
      countQuery += ` AND user_type = $2`;
      countParams.push(userType);
    }
    
    const countResult = await query(countQuery, countParams);
    
    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    };
  }

  static async updateById(id, updates) {
    const allowedFields = [
      'phone', 'first_name', 'last_name', 'middle_name', 'date_of_birth',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      'profile_image_url', 'preferences', 'is_active', 'email_verified', 'phone_verified'
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
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, user_type, is_active, updated_at
    `, values);

    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await query(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email
    `, [hashedPassword, id]);

    return result.rows[0];
  }

  static async updateLastLogin(id) {
    await query(`
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async deleteById(id) {
    // Soft delete - set is_active to false
    const result = await query(`
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, is_active
    `, [id]);

    return result.rows[0];
  }

  static async getPropertyAssignments(userId) {
    const result = await query(`
      SELECT upa.*, p.name as property_name, p.address_line1, p.city, p.state
      FROM user_property_assignments upa
      JOIN properties p ON upa.property_id = p.id
      WHERE upa.user_id = $1 AND upa.is_active = true
      ORDER BY upa.created_at DESC
    `, [userId]);

    return result.rows;
  }

  static async assignToProperty(userId, propertyId, assignmentType, startDate = new Date()) {
    const result = await query(`
      INSERT INTO user_property_assignments (user_id, property_id, assignment_type, start_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, property_id, assignment_type, start_date)
      DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, propertyId, assignmentType, startDate]);

    return result.rows[0];
  }
}