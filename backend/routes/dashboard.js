import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireSameCompany } from '../middleware/auth.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { Property } from '../models/Property.js';

const router = express.Router();

// All routes require authentication and same company access
router.use(authenticate);
router.use(requireSameCompany);

// Get company-wide dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_properties,
        COUNT(DISTINCT u.id) as total_units,
        COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) as occupied_units,
        COUNT(DISTINCT CASE WHEN u.status = 'vacant' THEN u.id END) as vacant_units,
        COUNT(DISTINCT CASE WHEN u.status = 'maintenance' THEN u.id END) as maintenance_units,
        COUNT(DISTINCT users.id) FILTER (WHERE users.user_type = 'tenant') as total_tenants,
        COUNT(DISTINCT users.id) FILTER (WHERE users.user_type = 'maintenance') as maintenance_staff,
        COALESCE(SUM(CASE WHEN l.status = 'active' THEN l.monthly_rent END), 0) as total_monthly_rent
      FROM companies c
      LEFT JOIN properties p ON c.id = p.company_id AND p.is_active = true
      LEFT JOIN units u ON p.id = u.property_id AND u.is_active = true
      LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
      LEFT JOIN users ON c.id = users.company_id AND users.is_active = true
      WHERE c.id = $1
      GROUP BY c.id
    `, [companyId]);

    // Get maintenance stats
    const maintenanceStats = await MaintenanceRequest.getDashboardStats();

    // Get recent activity across all properties
    const recentActivityResult = await query(`
      SELECT 
        al.action,
        al.description,
        al.created_at,
        u.first_name || ' ' || u.last_name as user_name,
        al.entity_type,
        al.entity_id,
        p.name as property_name
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN properties p ON (
        (al.entity_type = 'property' AND al.entity_id::text = p.id::text)
        OR (al.entity_type = 'unit' AND al.entity_id::text IN (
          SELECT u.id::text FROM units u WHERE u.property_id = p.id
        ))
        OR (al.entity_type = 'maintenance_request' AND al.entity_id::text IN (
          SELECT mr.id::text FROM maintenance_requests mr WHERE mr.property_id = p.id
        ))
      )
      WHERE al.company_id = $1
      ORDER BY al.created_at DESC
      LIMIT 10
    `, [companyId]);

    const stats = statsResult.rows[0] || {
      total_properties: 0,
      total_units: 0,
      occupied_units: 0,
      vacant_units: 0,
      maintenance_units: 0,
      total_tenants: 0,
      maintenance_staff: 0,
      total_monthly_rent: 0
    };

    // Calculate occupancy rate
    const occupancyRate = stats.total_units > 0 
      ? ((stats.occupied_units / stats.total_units) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          ...stats,
          occupancyRate: parseFloat(occupancyRate)
        },
        maintenance: maintenanceStats,
        recentActivity: recentActivityResult.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message
    });
  }
});

// Get property-specific dashboard stats
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

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

    const [stats, recentActivity, maintenanceStats] = await Promise.all([
      Property.getDashboardStats(propertyId),
      Property.getRecentActivity(propertyId, 10),
      MaintenanceRequest.getDashboardStats(propertyId)
    ]);

    res.json({
      success: true,
      data: {
        property: stats,
        maintenance: maintenanceStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get property dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get property dashboard',
      error: error.message
    });
  }
});

// Get maintenance dashboard for staff
router.get('/maintenance', async (req, res) => {
  try {
    const userId = req.user.id;
    const isMaintenanceStaff = req.user.user_type === 'maintenance';

    // Get stats (either for specific user if maintenance staff, or all if manager/admin)
    const stats = await MaintenanceRequest.getDashboardStats(
      null, // no property filter
      isMaintenanceStaff ? userId : null
    );

    // Get recent requests
    const recentRequests = await MaintenanceRequest.getRecentRequests(
      15,
      null, // no property filter
      isMaintenanceStaff ? userId : null
    );

    // Get requests by status
    const statusBreakdownResult = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(CASE WHEN priority = 'emergency' THEN 1 ELSE 0 END) as emergency_ratio
      FROM maintenance_requests mr
      JOIN properties p ON mr.property_id = p.id
      WHERE p.company_id = $1
        ${isMaintenanceStaff ? 'AND mr.assigned_to = $2' : ''}
        AND mr.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'emergency' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'assigned' THEN 3
          WHEN 'in_progress' THEN 4
          WHEN 'completed' THEN 5
          ELSE 6
        END
    `, isMaintenanceStaff ? [req.user.company_id, userId] : [req.user.company_id]);

    // Get category breakdown
    const categoryBreakdownResult = await query(`
      SELECT 
        mc.name,
        mc.color,
        COUNT(mr.id) as count,
        AVG(CASE WHEN mr.status = 'completed' AND mr.completed_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (mr.completed_at - mr.created_at))/3600 END) as avg_completion_hours
      FROM maintenance_categories mc
      LEFT JOIN maintenance_requests mr ON mc.id = mr.category_id
      LEFT JOIN properties p ON mr.property_id = p.id
      WHERE mc.is_active = true
        AND (mr.id IS NULL OR (
          p.company_id = $1
          ${isMaintenanceStaff ? 'AND mr.assigned_to = $2' : ''}
          AND mr.created_at >= CURRENT_DATE - INTERVAL '30 days'
        ))
      GROUP BY mc.id, mc.name, mc.color
      ORDER BY count DESC
    `, isMaintenanceStaff ? [req.user.company_id, userId] : [req.user.company_id]);

    res.json({
      success: true,
      data: {
        stats,
        recentRequests,
        statusBreakdown: statusBreakdownResult.rows,
        categoryBreakdown: categoryBreakdownResult.rows
      }
    });
  } catch (error) {
    console.error('Get maintenance dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get maintenance dashboard',
      error: error.message
    });
  }
});

// Get tenant dashboard
router.get('/tenant', async (req, res) => {
  try {
    const tenantId = req.user.id;

    if (req.user.user_type !== 'tenant') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - tenant only'
      });
    }

    // Get tenant's current lease and unit info
    const leaseResult = await query(`
      SELECT 
        l.*,
        u.unit_number,
        u.rent_amount,
        p.name as property_name,
        p.address_line1 as property_address,
        b.name as building_name
      FROM leases l
      JOIN lease_tenants lt ON l.id = lt.lease_id
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      LEFT JOIN buildings b ON u.building_id = b.id
      WHERE lt.tenant_id = $1 AND l.status = 'active'
      LIMIT 1
    `, [tenantId]);

    const currentLease = leaseResult.rows[0] || null;

    // Get tenant's maintenance requests stats
    const maintenanceStatsResult = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_requests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
        AVG(CASE WHEN tenant_rating IS NOT NULL THEN tenant_rating END) as avg_rating_given
      FROM maintenance_requests 
      WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days'
    `, [tenantId]);

    const maintenanceStats = maintenanceStatsResult.rows[0];

    // Get recent maintenance requests
    const recentRequestsResult = await query(`
      SELECT 
        mr.id, mr.title, mr.status, mr.priority, mr.created_at, mr.completed_at,
        mc.name as category_name, mc.color as category_color
      FROM maintenance_requests mr
      LEFT JOIN maintenance_categories mc ON mr.category_id = mc.id
      WHERE mr.tenant_id = $1
      ORDER BY mr.created_at DESC
      LIMIT 5
    `, [tenantId]);

    // Get upcoming lease renewal info if applicable
    let leaseRenewalInfo = null;
    if (currentLease) {
      const renewalDate = new Date(currentLease.end_date);
      const today = new Date();
      const daysUntilRenewal = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilRenewal <= 90 && daysUntilRenewal > 0) {
        leaseRenewalInfo = {
          endDate: currentLease.end_date,
          daysUntilExpiration: daysUntilRenewal,
          needsAttention: daysUntilRenewal <= 30
        };
      }
    }

    res.json({
      success: true,
      data: {
        currentLease,
        maintenanceStats,
        recentRequests: recentRequestsResult.rows,
        leaseRenewalInfo
      }
    });
  } catch (error) {
    console.error('Get tenant dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tenant dashboard',
      error: error.message
    });
  }
});

export default router;