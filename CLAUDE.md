# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hunters Run App** is an enterprise-grade property management system built for multi-property operations. It provides a comprehensive platform for managing properties, tenants, maintenance requests, and financial transactions across multiple property management companies.

### Architecture

- **Backend**: Node.js + Express.js + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL with comprehensive schema for enterprise operations
- **Authentication**: JWT-based with role-based access control
- **File Storage**: Local file system (configurable for cloud storage)

### Multi-Tenant Structure

The application is designed for multi-company operations with strict data isolation:
- Companies manage their own properties, tenants, and staff
- Users belong to specific companies and can only access their company's data
- Role-based permissions: admin, manager, maintenance, tenant, vendor

## Development Commands

### Setup and Installation
```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials and JWT secret
```

### Development
```bash
# Run both backend and frontend in development mode
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only  
npm run dev:frontend
```

### Production
```bash
# Build frontend for production
npm run build

# Start production server (backend)
npm start
```

### Database Setup
```bash
# Create PostgreSQL database
createdb hunters_run_app

# Run the schema (backend must be running)
psql -d hunters_run_app -f database/schema.sql
```

## Project Structure

```
hunters-run-app/
├── backend/                 # Node.js/Express API server
│   ├── config/             # Database and app configuration
│   ├── middleware/         # Authentication, validation, etc.
│   ├── models/            # Database models (User, Property, etc.)
│   ├── routes/            # API endpoints
│   ├── uploads/           # File upload storage
│   └── server.js          # Main server file
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   ├── pages/         # Page components
│   │   └── App.jsx        # Main app component
│   └── package.json
├── database/              # Database schemas and migrations
│   └── schema.sql         # Complete database schema
└── docs/                  # Project documentation
```

## Key Features (Phase 1 - Current Implementation)

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Company-based data isolation
- Password requirements and validation

### Property Management
- Multi-property support (Hunters Run, Shean Properties, etc.)
- Building-based organization (A, B, C buildings)
- Unit management with comprehensive details
- Property dashboard with key metrics

### Maintenance System
- Photo-centric maintenance requests
- Priority-based request handling (emergency, urgent, normal, low)
- Assignment to maintenance staff
- Status tracking and updates
- Mobile-optimized interface for maintenance staff
- Request history and rating system

### User Management
- Multi-role user system
- Property assignments for staff
- User profiles with emergency contacts
- Property-specific access controls

### Dashboard & Reporting
- Role-specific dashboards
- Property overview metrics
- Maintenance request statistics
- Recent activity tracking

## Database Architecture

### Core Tables
- `companies`: Multi-tenant company management
- `properties`: Property information and settings
- `buildings`: Building structure within properties
- `units`: Individual rental units (A1-A8, B1-B8, etc.)
- `users`: All system users with role-based access
- `leases`: Tenant lease agreements
- `maintenance_requests`: Core maintenance system
- `transactions`: Financial transactions
- `documents`: File management system

### Key Relationships
- Companies → Properties → Buildings → Units
- Users have roles and company associations
- Maintenance requests link properties, units, tenants, and staff
- Activity logging tracks all system changes

## API Structure

### Authentication Endpoints (`/api/auth`)
- POST `/login` - User authentication
- POST `/register` - User registration
- GET `/me` - Current user profile
- PUT `/me` - Update profile
- PUT `/change-password` - Change password

### Property Endpoints (`/api/properties`)
- GET `/` - List company properties
- POST `/` - Create new property
- GET `/:id` - Get property details
- PUT `/:id` - Update property
- GET `/:id/buildings` - Get property buildings
- POST `/:id/buildings` - Create building

### Maintenance Endpoints (`/api/maintenance`)
- GET `/` - List maintenance requests (filtered by role)
- POST `/` - Create new request (with file upload)
- GET `/:id` - Get request details
- PUT `/:id` - Update request
- PUT `/:id/assign` - Assign to staff
- GET `/categories` - List maintenance categories

### Unit Endpoints (`/api/units`)
- GET `/property/:propertyId` - Get units for property
- GET `/:id` - Get unit details
- POST `/` - Create new unit
- PUT `/:id` - Update unit

### Dashboard Endpoints (`/api/dashboard`)
- GET `/stats` - Company-wide statistics
- GET `/property/:id` - Property-specific dashboard
- GET `/maintenance` - Maintenance dashboard
- GET `/tenant` - Tenant-specific dashboard

## Frontend Architecture

### Routing Structure
- Public routes: `/login`, `/register`
- Admin/Manager routes: `/dashboard`, `/properties`, `/users`
- Maintenance routes: `/maintenance/dashboard`
- Tenant routes: `/tenant/dashboard`
- Universal routes: `/maintenance`, `/profile`

### State Management
- React Context for authentication
- Local component state for form handling
- API calls with axios and error handling

### UI Components
- Tailwind CSS for styling with custom design system
- Mobile-first responsive design
- Toast notifications for user feedback
- Loading states and error boundaries

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@localhost:5432/hunters_run_app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
NODE_ENV=development
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### Frontend (optional .env)
```
VITE_API_URL=http://localhost:3000/api
```

## Security Considerations

- All API endpoints require authentication except login/register
- Company-based data isolation prevents cross-tenant access
- File uploads are validated and stored securely
- Passwords are hashed with bcrypt
- Rate limiting on API endpoints
- Input validation on all endpoints

## Phase 2 Features (Future Implementation)

- **Payment Processing**: Stripe, PayNearMe, Venmo integration
- **Vendor Management**: Contractor profiles and work orders
- **Mass Communications**: Email/SMS campaigns
- **Listing Syndication**: Automated listing distribution
- **Financial Reporting**: Comprehensive financial analytics
- **Document Management**: Digital lease management
- **Tenant Portal**: Enhanced tenant self-service
- **Mobile Apps**: Native iOS/Android applications

## Testing and Quality Assurance

The system includes comprehensive error handling, input validation, and security measures. Database transactions ensure data consistency, and the multi-tenant architecture provides secure data isolation.

## Development Notes

- The system uses ES6 modules throughout
- All database queries use parameterized statements to prevent SQL injection
- File uploads are restricted to images for security
- The frontend uses a mobile-first design approach
- API responses follow a consistent format with success/error indicators

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **File Uploads**: Check upload directory permissions
3. **Authentication**: Verify JWT_SECRET is set in environment variables
4. **CORS Issues**: Check frontend URL in CORS configuration

### Development Tips
- Use provided demo credentials for testing different user roles
- Check browser console for frontend errors
- Monitor backend logs for API issues
- Database schema includes comprehensive indexes for performance