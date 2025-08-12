-- Hunters Run App - Complete Database Schema
-- Enterprise Property Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- CORE ENTITIES
-- ==========================================

-- Companies/Property Management Groups
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    type VARCHAR(50) NOT NULL DEFAULT 'property_management', -- property_management, vendor, contractor
    tax_id VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'US',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties (Hunters Run, Shean Properties, etc.)
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'US',
    property_type VARCHAR(50) NOT NULL, -- apartment_complex, single_family, commercial, mixed_use
    total_units INTEGER DEFAULT 0,
    built_year INTEGER,
    square_footage INTEGER,
    lot_size_sqft INTEGER,
    parking_spaces INTEGER,
    amenities TEXT[],
    description TEXT,
    property_manager_id UUID,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}', -- custom property settings
    coordinates POINT, -- GPS coordinates
    images JSONB DEFAULT '[]', -- array of image URLs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buildings (for apartment complexes like A, B, C buildings)
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- A, B, C, North, South, etc.
    building_number VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    floors INTEGER DEFAULT 1,
    units_per_floor INTEGER,
    total_units INTEGER,
    built_year INTEGER,
    square_footage INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    coordinates POINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Units (A1-A8, B1-B8, etc.)
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    unit_number VARCHAR(20) NOT NULL, -- A1, A2, B1, 101, 102, etc.
    floor_number INTEGER,
    unit_type VARCHAR(50), -- studio, 1br, 2br, 3br, etc.
    bedrooms INTEGER DEFAULT 0,
    bathrooms DECIMAL(2,1) DEFAULT 0,
    square_footage INTEGER,
    rent_amount DECIMAL(10,2),
    security_deposit DECIMAL(10,2),
    pet_deposit DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'vacant', -- vacant, occupied, maintenance, unavailable
    amenities TEXT[],
    description TEXT,
    notes TEXT,
    images JSONB DEFAULT '[]',
    lease_start_date DATE,
    lease_end_date DATE,
    last_inspection_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, unit_number)
);

-- ==========================================
-- USER MANAGEMENT
-- ==========================================

-- Roles and Permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]', -- array of permission strings
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (tenants, managers, maintenance staff, etc.)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    ssn_last4 VARCHAR(4),
    user_type VARCHAR(50) NOT NULL, -- admin, manager, maintenance, tenant, vendor
    role_id UUID REFERENCES roles(id),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    profile_image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    email_verification_token VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Addresses
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address_type VARCHAR(50) DEFAULT 'current', -- current, previous, emergency, billing
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'US',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Property Assignments (for managers, maintenance staff)
CREATE TABLE user_property_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL, -- manager, maintenance, leasing_agent
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id, assignment_type, start_date)
);

-- ==========================================
-- TENANT MANAGEMENT
-- ==========================================

-- Leases
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    primary_tenant_id UUID REFERENCES users(id),
    lease_type VARCHAR(50) DEFAULT 'residential', -- residential, commercial, month_to_month
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2),
    pet_deposit DECIMAL(10,2),
    late_fee DECIMAL(10,2) DEFAULT 50.00,
    lease_terms TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, expired, terminated, pending
    renewal_date DATE,
    move_in_date DATE,
    move_out_date DATE,
    termination_reason VARCHAR(200),
    documents JSONB DEFAULT '[]', -- lease document URLs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lease Tenants (for multiple tenants on one lease)
CREATE TABLE lease_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    responsibility_percentage DECIMAL(5,2) DEFAULT 100.00,
    move_in_date DATE,
    move_out_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lease_id, tenant_id)
);

-- ==========================================
-- MAINTENANCE SYSTEM
-- ==========================================

-- Maintenance Categories
CREATE TABLE maintenance_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color code
    icon VARCHAR(50),
    priority_level INTEGER DEFAULT 3, -- 1=emergency, 2=urgent, 3=normal, 4=low
    estimated_duration_hours INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Requests
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES maintenance_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- emergency, urgent, normal, low
    status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, in_progress, completed, cancelled, on_hold
    urgency_level INTEGER DEFAULT 3, -- 1-5 scale
    location_description TEXT, -- "Kitchen sink", "Bedroom 1 window", etc.
    tenant_availability TEXT,
    permission_to_enter BOOLEAN DEFAULT false,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    assigned_to UUID REFERENCES users(id), -- maintenance staff
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    tenant_rating INTEGER, -- 1-5 stars
    tenant_feedback TEXT,
    internal_notes TEXT,
    images JSONB DEFAULT '[]', -- before/after photos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Request Updates (status changes, notes)
CREATE TABLE maintenance_request_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- who made the update
    update_type VARCHAR(50), -- status_change, note, assignment, completion
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    message TEXT,
    images JSONB DEFAULT '[]',
    is_visible_to_tenant BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- VENDOR MANAGEMENT
-- ==========================================

-- Vendors/Contractors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    vendor_type VARCHAR(100), -- plumber, electrician, hvac, general, cleaning, etc.
    specialties TEXT[],
    email VARCHAR(255),
    phone VARCHAR(20),
    emergency_phone VARCHAR(20),
    website VARCHAR(255),
    license_number VARCHAR(100),
    insurance_expiry DATE,
    rating DECIMAL(3,2), -- average rating
    is_preferred BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    payment_terms VARCHAR(100),
    tax_id VARCHAR(50),
    w9_on_file BOOLEAN DEFAULT false,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    service_areas TEXT[], -- zip codes they serve
    notes TEXT,
    documents JSONB DEFAULT '[]', -- insurance, licenses, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Services/Pricing
CREATE TABLE vendor_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID REFERENCES maintenance_categories(id),
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    hourly_rate DECIMAL(10,2),
    flat_rate DECIMAL(10,2),
    minimum_charge DECIMAL(10,2),
    emergency_rate DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Work Orders
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_request_id UUID REFERENCES maintenance_requests(id),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, in_progress, completed, cancelled
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    scheduled_date TIMESTAMP,
    completed_date TIMESTAMP,
    work_performed TEXT,
    parts_used TEXT,
    warranty_period_days INTEGER,
    images JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]', -- invoices, receipts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- FINANCIAL MANAGEMENT
-- ==========================================

-- Chart of Accounts
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, account_code)
);

-- Transactions (rent, fees, expenses, etc.)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    account_id UUID REFERENCES chart_of_accounts(id),
    transaction_type VARCHAR(50) NOT NULL, -- rent, fee, deposit, expense, refund, etc.
    category VARCHAR(100), -- late_fee, maintenance, utilities, etc.
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, cancelled
    payment_method VARCHAR(50), -- cash, check, ach, card, money_order, etc.
    payment_reference VARCHAR(100), -- check number, transaction ID, etc.
    payment_date DATE,
    late_fee_assessed DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    receipt_url VARCHAR(500),
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20), -- monthly, quarterly, annually
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utility Bills
CREATE TABLE utility_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    utility_type VARCHAR(50) NOT NULL, -- electric, gas, water, sewer, trash, internet, etc.
    provider_name VARCHAR(255),
    account_number VARCHAR(100),
    billing_period_start DATE,
    billing_period_end DATE,
    due_date DATE,
    amount DECIMAL(10,2) NOT NULL,
    usage_amount DECIMAL(10,2),
    usage_unit VARCHAR(20), -- kwh, ccf, gallons, etc.
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue
    payment_date DATE,
    bill_image_url VARCHAR(500),
    is_tenant_responsible BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- COMMUNICATIONS
-- ==========================================

-- Communication Templates
CREATE TABLE communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50), -- email, sms, notice, letter
    subject VARCHAR(500),
    body_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- available template variables
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communications Log
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    communication_type VARCHAR(50) NOT NULL, -- email, sms, phone, in_person, notice
    subject VARCHAR(500),
    message TEXT,
    status VARCHAR(50) DEFAULT 'sent', -- draft, sent, delivered, read, failed
    priority VARCHAR(20) DEFAULT 'normal',
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}', -- email headers, SMS details, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- LISTINGS & MARKETING
-- ==========================================

-- Listings
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    rent_amount DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2),
    available_date DATE,
    lease_term_months INTEGER DEFAULT 12,
    pet_policy VARCHAR(100),
    smoking_allowed BOOLEAN DEFAULT false,
    utilities_included TEXT[],
    amenities TEXT[],
    showing_instructions TEXT,
    application_fee DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, pending, rented, expired
    featured BOOLEAN DEFAULT false,
    images JSONB DEFAULT '[]',
    virtual_tour_url VARCHAR(500),
    floor_plan_url VARCHAR(500),
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Listing Syndication (where listings are posted)
CREATE TABLE listing_syndications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL, -- zillow, apartments.com, craigslist, etc.
    external_id VARCHAR(255), -- ID from external platform
    posting_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, expired, error
    last_sync_at TIMESTAMP,
    sync_errors TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- DOCUMENTS & FILES
-- ==========================================

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE SET NULL,
    document_type VARCHAR(100) NOT NULL, -- lease, application, insurance, w9, invoice, etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    is_public BOOLEAN DEFAULT false,
    requires_signature BOOLEAN DEFAULT false,
    signed_at TIMESTAMP,
    signed_by_user_id UUID REFERENCES users(id),
    uploaded_by_user_id UUID REFERENCES users(id),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- SYSTEM TABLES
-- ==========================================

-- Activity Log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    entity_type VARCHAR(100), -- property, unit, maintenance_request, etc.
    entity_id UUID,
    action VARCHAR(100) NOT NULL, -- create, update, delete, view, assign, etc.
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value JSONB,
    setting_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, setting_key)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Property and Unit indexes
CREATE INDEX idx_properties_company_id ON properties(company_id);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_unit_number ON units(property_id, unit_number);

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_user_property_assignments_user_id ON user_property_assignments(user_id);
CREATE INDEX idx_user_property_assignments_property_id ON user_property_assignments(property_id);

-- Maintenance indexes
CREATE INDEX idx_maintenance_requests_property_id ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_requests_unit_id ON maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_requests_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_requests_assigned_to ON maintenance_requests(assigned_to);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_priority ON maintenance_requests(priority);
CREATE INDEX idx_maintenance_requests_created_at ON maintenance_requests(created_at DESC);

-- Transaction indexes
CREATE INDEX idx_transactions_property_id ON transactions(property_id);
CREATE INDEX idx_transactions_tenant_id ON transactions(tenant_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);

-- Communication indexes
CREATE INDEX idx_communications_company_id ON communications(company_id);
CREATE INDEX idx_communications_to_user_id ON communications(to_user_id);
CREATE INDEX idx_communications_created_at ON communications(created_at DESC);

-- Activity log indexes
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables with updated_at columns
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- DEFAULT DATA
-- ==========================================

-- Default Roles
INSERT INTO roles (id, name, description, permissions, is_system_role) VALUES
    (uuid_generate_v4(), 'Super Admin', 'Full system access', '["*"]', true),
    (uuid_generate_v4(), 'Property Manager', 'Manage properties and tenants', '["properties.*", "units.*", "tenants.*", "maintenance.*", "communications.*"]', true),
    (uuid_generate_v4(), 'Maintenance Staff', 'Handle maintenance requests', '["maintenance.*", "units.read", "properties.read"]', true),
    (uuid_generate_v4(), 'Tenant', 'Basic tenant access', '["maintenance.create", "maintenance.read_own", "communications.read_own"]', true),
    (uuid_generate_v4(), 'Leasing Agent', 'Handle leasing and applications', '["listings.*", "applications.*", "communications.*", "units.read"]', true);

-- Default Maintenance Categories
INSERT INTO maintenance_categories (id, name, description, color, icon, priority_level) VALUES
    (uuid_generate_v4(), 'Plumbing', 'Water, pipes, fixtures', '#3B82F6', 'wrench', 2),
    (uuid_generate_v4(), 'Electrical', 'Wiring, outlets, lighting', '#F59E0B', 'lightning-bolt', 2),
    (uuid_generate_v4(), 'HVAC', 'Heating, ventilation, air conditioning', '#10B981', 'fire', 2),
    (uuid_generate_v4(), 'Appliances', 'Refrigerator, washer, dryer, etc.', '#8B5CF6', 'cog', 3),
    (uuid_generate_v4(), 'Flooring', 'Carpet, hardwood, tile', '#F97316', 'home', 3),
    (uuid_generate_v4(), 'Painting', 'Interior and exterior painting', '#EC4899', 'color-swatch', 4),
    (uuid_generate_v4(), 'Pest Control', 'Insects, rodents', '#EF4444', 'bug', 2),
    (uuid_generate_v4(), 'Security', 'Locks, doors, windows', '#6B7280', 'shield-check', 1),
    (uuid_generate_v4(), 'General Maintenance', 'Other maintenance issues', '#6B7280', 'wrench-screwdriver', 3);