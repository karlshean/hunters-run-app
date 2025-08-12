# Hunters Run Property Management System

A comprehensive enterprise-grade property management platform built for multi-property operations with advanced tenant portal features.

## 🏢 Overview

Hunters Run App is a full-stack property management system that provides property managers, maintenance staff, and tenants with powerful tools to streamline operations and enhance communication. The platform supports multiple properties with role-based access control and enterprise-level security.

### Key Features

#### **Phase 1 - Core Platform ✅**
- **Multi-tenant Architecture**: Complete data isolation between property management companies
- **Role-based Access Control**: Admin, Manager, Maintenance Staff, Tenant, and Vendor roles
- **Property Management**: Multi-building support with visual property maps
- **Maintenance System**: Photo-centric request system with priority handling
- **User Management**: Comprehensive tenant and staff management
- **Dashboard Analytics**: Real-time insights and metrics

#### **Phase 2 - Advanced Tenant Portal ✅**
- **Online Payments**: Multiple payment methods (ACH, Cards, PayPal, Venmo) with auto-pay
- **Enhanced Messaging**: Real-time communication with file attachments and internal notes
- **Digital Lease Management**: Electronic signatures and document access
- **Amenity Booking**: Shared space reservations (Pool, Gym, Clubhouse, etc.)
- **Advanced Maintenance**: Self-service troubleshooting and enhanced feedback system

#### **Phase 3 - Future Enhancements**
- **Smart Home Integration**: IoT device management and automation
- **Community Features**: Tenant social platform and event management
- **Advanced Analytics**: Predictive maintenance and business intelligence
- **Mobile Apps**: Native iOS/Android applications
- **Vendor Management**: Enhanced contractor coordination system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd hunters-run-app
   npm run install:all
   ```

2. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb hunters_run_app
   
   # Run the main schema
   psql -d hunters_run_app -f database/schema.sql
   
   # Run the advanced features schema
   psql -d hunters_run_app -f database/advanced_tenant_portal_schema.sql
   ```

3. **Environment Configuration**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database credentials
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🔑 Demo Credentials

- **Manager**: manager@huntersrun.com / password123
- **Maintenance**: maintenance@huntersrun.com / password123  
- **Tenant**: tenant@huntersrun.com / password123

## 📱 User Interfaces

### Manager Dashboard
- Property overview and metrics
- Maintenance request assignment
- Tenant and unit management
- Financial tracking

### Maintenance Staff Mobile
- Assigned work orders
- Photo capture for before/after
- Status updates and completion
- Emergency request prioritization

### Tenant Portal
- Submit maintenance requests
- Request history and status
- Lease information
- Communication with management

## 🏗️ Architecture

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Authentication**: JWT with role-based access
- **Database**: Comprehensive enterprise schema
- **File Storage**: Local with cloud-ready architecture

## 📊 Database Design

Built for enterprise multi-tenant operations:

- **Companies**: Multi-property management groups
- **Properties → Buildings → Units**: Hierarchical property structure
- **Users**: Role-based with company isolation
- **Maintenance**: Priority-based request system
- **Transactions**: Financial tracking foundation
- **Documents**: Centralized file management

## 🛠️ Development

### Available Scripts

```bash
npm run dev              # Run both frontend and backend
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run build            # Build for production
npm start               # Start production server
```

### API Documentation

The backend provides RESTful APIs with the following main endpoints:

- `/api/auth` - Authentication and user management
- `/api/properties` - Property and building management
- `/api/units` - Unit management and details
- `/api/maintenance` - Maintenance request system
- `/api/payments` - Payment processing and methods
- `/api/messages` - Messaging and communication
- `/api/leases` - Lease documents and signatures
- `/api/dashboard` - Analytics and reporting
- `/api/users` - User management and assignments

## 🔒 Security

- Multi-tenant data isolation
- Role-based access control (RBAC)
- JWT authentication with refresh tokens
- Input validation and sanitization
- Rate limiting and security headers
- Secure file upload handling

## 🎨 Design System

Mobile-first responsive design with:
- Tailwind CSS utility framework
- Custom color palette for property management
- Accessible form components
- Status indicators and priority badges
- Photo-centric maintenance workflows

## 📝 License

ISC License - See LICENSE file for details

## 🤝 Contributing

This is an enterprise property management system. For feature requests or issues, please contact the development team.

## 🆘 Support

For technical support or questions about the system:
- Check the CLAUDE.md file for detailed development information
- Review API documentation in the `/docs` directory
- Contact the development team for deployment assistance