import express from 'express';
import { Property } from '../models/Property.js';
import { authenticate, authorize, requireSameCompany } from '../middleware/auth.js';
import { validateProperty } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication and same company access
router.use(authenticate);
router.use(requireSameCompany);

// Get all properties for the company
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      propertyType,
      search
    } = req.query;

    const filters = {};
    if (propertyType) filters.propertyType = propertyType;
    if (search) filters.search = search;

    const result = await Property.findByCompany(
      req.companyId,
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get properties',
      error: error.message
    });
  }
});

// Get single property by ID
router.get('/:id', async (req, res) => {
  try {
    const { includeUnits = false } = req.query;
    const property = await Property.findById(req.params.id, includeUnits === 'true');
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if property belongs to user's company
    if (property.company_id !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get property',
      error: error.message
    });
  }
});

// Create new property
router.post('/', authorize('admin', 'manager'), validateProperty, async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      companyId: req.companyId
    };

    const property = await Property.create(propertyData);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property }
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property',
      error: error.message
    });
  }
});

// Update property
router.put('/:id', authorize('admin', 'manager'), validateProperty, async (req, res) => {
  try {
    // First check if property exists and belongs to company
    const existingProperty = await Property.findById(req.params.id);
    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (existingProperty.company_id !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedProperty = await Property.updateById(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: { property: updatedProperty }
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update property',
      error: error.message
    });
  }
});

// Delete property (soft delete)
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    // First check if property exists and belongs to company
    const existingProperty = await Property.findById(req.params.id);
    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (existingProperty.company_id !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const deletedProperty = await Property.deleteById(req.params.id);

    res.json({
      success: true,
      message: 'Property deleted successfully',
      data: { property: deletedProperty }
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: error.message
    });
  }
});

// Get property buildings
router.get('/:id/buildings', async (req, res) => {
  try {
    // First check if property exists and belongs to company
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.company_id !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const buildings = await Property.getBuildings(req.params.id);

    res.json({
      success: true,
      data: { buildings }
    });
  } catch (error) {
    console.error('Get buildings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get buildings',
      error: error.message
    });
  }
});

// Create building for property
router.post('/:id/buildings', authorize('admin', 'manager'), async (req, res) => {
  try {
    // First check if property exists and belongs to company
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.company_id !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const building = await Property.createBuilding(req.params.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Building created successfully',
      data: { building }
    });
  } catch (error) {
    console.error('Create building error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create building',
      error: error.message
    });
  }
});

// Get property dashboard stats
router.get('/:id/dashboard', async (req, res) => {
  try {
    // First check if property exists and belongs to company
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.company_id !== req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [stats, recentActivity] = await Promise.all([
      Property.getDashboardStats(req.params.id),
      Property.getRecentActivity(req.params.id, 10)
    ]);

    res.json({
      success: true,
      data: {
        stats,
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

export default router;