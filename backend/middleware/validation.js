import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('firstName').trim().isLength({ min: 1, max: 100 }),
  body('lastName').trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().isMobilePhone(),
  body('userType').isIn(['admin', 'manager', 'maintenance', 'tenant', 'vendor']),
  handleValidationErrors
];

export const validateUserLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidationErrors
];

// Property validation rules
export const validateProperty = [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('addressLine1').trim().isLength({ min: 1, max: 255 }),
  body('city').trim().isLength({ min: 1, max: 100 }),
  body('state').trim().isLength({ min: 2, max: 50 }),
  body('zipCode').trim().isLength({ min: 5, max: 20 }),
  body('propertyType').isIn(['apartment_complex', 'single_family', 'commercial', 'mixed_use']),
  body('totalUnits').optional().isInt({ min: 0 }),
  handleValidationErrors
];

// Unit validation rules
export const validateUnit = [
  body('unitNumber').trim().isLength({ min: 1, max: 20 }),
  body('unitType').optional().trim().isLength({ max: 50 }),
  body('bedrooms').optional().isInt({ min: 0 }),
  body('bathrooms').optional().isDecimal(),
  body('squareFootage').optional().isInt({ min: 1 }),
  body('rentAmount').optional().isDecimal({ decimal_digits: '0,2' }),
  body('status').optional().isIn(['vacant', 'occupied', 'maintenance', 'unavailable']),
  handleValidationErrors
];

// Maintenance request validation rules
export const validateMaintenanceRequest = [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('description').trim().isLength({ min: 10 }),
  body('priority').optional().isIn(['emergency', 'urgent', 'normal', 'low']),
  body('locationDescription').optional().trim().isLength({ max: 500 }),
  body('permissionToEnter').optional().isBoolean(),
  handleValidationErrors
];

// Lease validation rules
export const validateLease = [
  body('startDate').isISO8601().toDate(),
  body('endDate').isISO8601().toDate(),
  body('monthlyRent').isDecimal({ decimal_digits: '0,2' }),
  body('securityDeposit').optional().isDecimal({ decimal_digits: '0,2' }),
  body('leaseType').optional().isIn(['residential', 'commercial', 'month_to_month']),
  handleValidationErrors
];

// Transaction validation rules
export const validateTransaction = [
  body('transactionType').isIn(['rent', 'fee', 'deposit', 'expense', 'refund']),
  body('amount').isDecimal({ decimal_digits: '0,2' }),
  body('transactionDate').isISO8601().toDate(),
  body('description').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
];