import express from 'express';
import { User } from '../models/User.js';
import { authenticate, authorize, requireSameCompany } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and same company access
router.use(authenticate);
router.use(requireSameCompany);

// Get users by company and type
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const {
      userType,
      page = 1,
      limit = 50
    } = req.query;

    const result = await User.findByCompany(
      req.user.company_id,
      userType,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
});

// Get single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, true);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user belongs to same company (or is the same user)
    if (user.company_id !== req.user.company_id && user.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
});

// Update user (admin/manager can update others, users can update themselves)
router.put('/:id', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const isOwnProfile = targetUserId === req.user.id;
    const canEditOthers = ['admin', 'manager'].includes(req.user.user_type);

    if (!isOwnProfile && !canEditOthers) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if target user exists and belongs to same company
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (targetUser.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Define what fields each user type can update
    let allowedFields = [
      'phone', 'firstName', 'lastName', 'middleName', 'dateOfBirth',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
      'profileImageUrl', 'preferences'
    ];

    // Admins and managers can update additional fields for other users
    if (!isOwnProfile && canEditOthers) {
      allowedFields.push('isActive', 'emailVerified', 'phoneVerified', 'userType', 'roleId');
    }

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const updatedUser = await User.updateById(targetUserId, updates);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// Deactivate user (soft delete)
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // Cannot deactivate own account
    if (targetUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Check if target user exists and belongs to same company
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (targetUser.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const deactivatedUser = await User.deleteById(targetUserId);

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: { user: deactivatedUser }
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
});

// Get user property assignments
router.get('/:id/properties', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const isOwnProfile = targetUserId === req.user.id;
    const canViewOthers = ['admin', 'manager'].includes(req.user.user_type);

    if (!isOwnProfile && !canViewOthers) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if target user exists and belongs to same company
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (targetUser.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const assignments = await User.getPropertyAssignments(targetUserId);

    res.json({
      success: true,
      data: { assignments }
    });
  } catch (error) {
    console.error('Get user properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user property assignments',
      error: error.message
    });
  }
});

// Assign user to property
router.post('/:id/properties', authorize('admin', 'manager'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { propertyId, assignmentType, startDate } = req.body;

    if (!propertyId || !assignmentType) {
      return res.status(400).json({
        success: false,
        message: 'Property ID and assignment type are required'
      });
    }

    // Check if target user exists and belongs to same company
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (targetUser.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify property belongs to same company
    const { query } = await import('../config/database.js');
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

    const assignment = await User.assignToProperty(
      targetUserId,
      propertyId,
      assignmentType,
      startDate ? new Date(startDate) : new Date()
    );

    res.status(201).json({
      success: true,
      message: 'User assigned to property successfully',
      data: { assignment }
    });
  } catch (error) {
    console.error('Assign user to property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign user to property',
      error: error.message
    });
  }
});

// Get maintenance staff (for assignment dropdowns)
router.get('/roles/maintenance', authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await User.findByCompany(
      req.user.company_id,
      'maintenance',
      1,
      100
    );

    res.json({
      success: true,
      data: {
        maintenanceStaff: result.users.map(user => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          phone: user.phone,
          isActive: user.is_active
        }))
      }
    });
  } catch (error) {
    console.error('Get maintenance staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get maintenance staff',
      error: error.message
    });
  }
});

export default router;