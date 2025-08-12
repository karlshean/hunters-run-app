import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { authenticate, authorize, requireSameCompany } from '../middleware/auth.js';
import { validateMaintenanceRequest } from '../middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/maintenance/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `maintenance-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get maintenance categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await MaintenanceRequest.getCategories();

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get maintenance categories',
      error: error.message
    });
  }
});

// Get maintenance requests (property-specific or user-specific)
router.get('/', requireSameCompany, async (req, res) => {
  try {
    const {
      propertyId,
      status,
      priority,
      assignedTo,
      categoryId,
      unitId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (categoryId) filters.categoryId = categoryId;
    if (unitId) filters.unitId = unitId;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    let result;

    if (req.user.user_type === 'tenant') {
      // Tenants can only see their own requests
      result = await MaintenanceRequest.findByTenant(
        req.user.id,
        parseInt(page),
        parseInt(limit)
      );
    } else if (req.user.user_type === 'maintenance' && !propertyId) {
      // Maintenance staff can see requests assigned to them
      result = await MaintenanceRequest.findByAssignedTo(
        req.user.id,
        status,
        parseInt(page),
        parseInt(limit)
      );
    } else if (propertyId) {
      // Property-specific requests for managers/admins
      result = await MaintenanceRequest.findByProperty(
        propertyId,
        filters,
        parseInt(page),
        parseInt(limit)
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required for this user type'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get maintenance requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get maintenance requests',
      error: error.message
    });
  }
});

// Get single maintenance request
router.get('/:id', async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id, true);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    // Check permissions - tenants can only see their own requests
    if (req.user.user_type === 'tenant' && request.tenant_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check same company for other user types
    if (req.user.user_type !== 'tenant') {
      // Get property to check company
      const { query } = await import('../config/database.js');
      const propertyResult = await query(
        'SELECT company_id FROM properties WHERE id = $1',
        [request.property_id]
      );
      
      if (propertyResult.rows.length === 0 || propertyResult.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: { request }
    });
  } catch (error) {
    console.error('Get maintenance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get maintenance request',
      error: error.message
    });
  }
});

// Create new maintenance request
router.post('/', 
  upload.array('images', 5),
  validateMaintenanceRequest,
  async (req, res) => {
    try {
      const requestData = {
        ...req.body,
        tenantId: req.user.user_type === 'tenant' ? req.user.id : req.body.tenantId,
        images: req.files ? req.files.map(file => ({
          url: `/uploads/maintenance/${file.filename}`,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        })) : []
      };

      // Check if user has access to the property
      if (req.user.user_type !== 'tenant') {
        const { query } = await import('../config/database.js');
        const propertyResult = await query(
          'SELECT company_id FROM properties WHERE id = $1',
          [requestData.propertyId]
        );
        
        if (propertyResult.rows.length === 0 || propertyResult.rows[0].company_id !== req.user.company_id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this property'
          });
        }
      }

      const request = await MaintenanceRequest.create(requestData);

      // Add initial update record
      await MaintenanceRequest.addUpdate(request.id, req.user.id, {
        updateType: 'creation',
        message: 'Maintenance request created',
        isVisibleToTenant: true
      });

      res.status(201).json({
        success: true,
        message: 'Maintenance request created successfully',
        data: { request }
      });
    } catch (error) {
      console.error('Create maintenance request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create maintenance request',
        error: error.message
      });
    }
  }
);

// Update maintenance request
router.put('/:id', 
  upload.array('images', 5),
  async (req, res) => {
    try {
      // Get existing request to check permissions
      const existingRequest = await MaintenanceRequest.findById(req.params.id);
      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message: 'Maintenance request not found'
        });
      }

      // Check permissions
      const canEdit = (
        req.user.user_type === 'admin' ||
        req.user.user_type === 'manager' ||
        (req.user.user_type === 'maintenance' && existingRequest.assigned_to === req.user.id) ||
        (req.user.user_type === 'tenant' && existingRequest.tenant_id === req.user.id)
      );

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updateData = { ...req.body };

      // Handle new images
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => ({
          url: `/uploads/maintenance/${file.filename}`,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        }));

        updateData.images = [...(existingRequest.images || []), ...newImages];
      }

      const oldStatus = existingRequest.status;
      const updatedRequest = await MaintenanceRequest.updateById(req.params.id, updateData);

      // Add update record if status changed or if there's a message
      if (updateData.status && updateData.status !== oldStatus) {
        await MaintenanceRequest.addUpdate(req.params.id, req.user.id, {
          updateType: 'status_change',
          oldStatus,
          newStatus: updateData.status,
          message: req.body.updateMessage || `Status changed to ${updateData.status}`,
          images: req.files ? req.files.map(file => `/uploads/maintenance/${file.filename}`) : [],
          isVisibleToTenant: true
        });
      } else if (req.body.updateMessage) {
        await MaintenanceRequest.addUpdate(req.params.id, req.user.id, {
          updateType: 'note',
          message: req.body.updateMessage,
          images: req.files ? req.files.map(file => `/uploads/maintenance/${file.filename}`) : [],
          isVisibleToTenant: req.body.isVisibleToTenant !== false
        });
      }

      res.json({
        success: true,
        message: 'Maintenance request updated successfully',
        data: { request: updatedRequest }
      });
    } catch (error) {
      console.error('Update maintenance request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update maintenance request',
        error: error.message
      });
    }
  }
);

// Assign maintenance request
router.put('/:id/assign', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { assignedTo, message } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Assigned to user ID is required'
      });
    }

    const existingRequest = await MaintenanceRequest.findById(req.params.id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    const updatedRequest = await MaintenanceRequest.updateById(req.params.id, {
      assignedTo,
      status: existingRequest.status === 'pending' ? 'assigned' : existingRequest.status
    });

    // Add assignment update
    await MaintenanceRequest.addUpdate(req.params.id, req.user.id, {
      updateType: 'assignment',
      message: message || 'Request assigned to maintenance staff',
      isVisibleToTenant: true
    });

    res.json({
      success: true,
      message: 'Maintenance request assigned successfully',
      data: { request: updatedRequest }
    });
  } catch (error) {
    console.error('Assign maintenance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign maintenance request',
      error: error.message
    });
  }
});

// Rate completed maintenance request (tenants only)
router.put('/:id/rate', authorize('tenant'), async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const existingRequest = await MaintenanceRequest.findById(req.params.id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    if (existingRequest.tenant_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (existingRequest.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed requests'
      });
    }

    const updatedRequest = await MaintenanceRequest.updateById(req.params.id, {
      tenantRating: rating,
      tenantFeedback: feedback
    });

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: { request: updatedRequest }
    });
  } catch (error) {
    console.error('Rate maintenance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate maintenance request',
      error: error.message
    });
  }
});

// Get maintenance dashboard stats
router.get('/dashboard/stats', requireSameCompany, async (req, res) => {
  try {
    const { propertyId } = req.query;

    const stats = await MaintenanceRequest.getDashboardStats(
      propertyId || null,
      req.user.user_type === 'maintenance' ? req.user.id : null
    );

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get maintenance dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get maintenance dashboard stats',
      error: error.message
    });
  }
});

// Get recent maintenance requests
router.get('/dashboard/recent', requireSameCompany, async (req, res) => {
  try {
    const { propertyId, limit = 10 } = req.query;

    const recentRequests = await MaintenanceRequest.getRecentRequests(
      parseInt(limit),
      propertyId || null,
      req.user.user_type === 'maintenance' ? req.user.id : null
    );

    res.json({
      success: true,
      data: { recentRequests }
    });
  } catch (error) {
    console.error('Get recent maintenance requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent maintenance requests',
      error: error.message
    });
  }
});

export default router;