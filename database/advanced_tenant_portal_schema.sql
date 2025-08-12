-- Advanced Tenant Portal - Additional Schema for Tier 1 Features
-- Online payments, messaging, lease documents, amenity booking, enhanced maintenance

-- ==========================================
-- PAYMENT SYSTEM
-- ==========================================

-- Payment Methods (tenant's saved payment methods)
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL, -- ach, card, paypal, venmo, paynearme
    provider VARCHAR(50) NOT NULL, -- stripe, paypal, etc.
    external_id VARCHAR(255), -- external payment method ID
    account_type VARCHAR(50), -- checking, savings, credit, debit
    last_four VARCHAR(4),
    bank_name VARCHAR(100),
    card_brand VARCHAR(50), -- visa, mastercard, amex
    expiry_month INTEGER,
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    nickname VARCHAR(100), -- "Primary Checking", "Credit Card", etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments (actual payment records)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id),
    transaction_id UUID REFERENCES transactions(id),
    amount DECIMAL(10,2) NOT NULL,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- rent, fee, deposit, utility
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, refunded
    external_transaction_id VARCHAR(255), -- Stripe payment intent ID, etc.
    confirmation_number VARCHAR(100),
    scheduled_date DATE,
    processed_date TIMESTAMP,
    failure_reason TEXT,
    receipt_url VARCHAR(500),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto-Pay Settings
CREATE TABLE auto_pay_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    payment_amount DECIMAL(10,2), -- null for full balance
    payment_day INTEGER NOT NULL, -- day of month (1-28)
    include_late_fees BOOLEAN DEFAULT true,
    include_utilities BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- MESSAGING SYSTEM
-- ==========================================

-- Message Threads (conversation between tenant and management)
CREATE TABLE message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- open, closed, urgent, resolved
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    category VARCHAR(50), -- maintenance, billing, general, complaint, compliment
    assigned_to UUID REFERENCES users(id), -- staff member assigned to handle
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages within threads
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, document, system
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN DEFAULT false, -- internal staff notes
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Read Receipts
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- ==========================================
-- LEASE DOCUMENT MANAGEMENT
-- ==========================================

-- Digital Lease Documents
CREATE TABLE lease_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- lease, addendum, renewal, amendment, notice
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_current BOOLEAN DEFAULT true,
    requires_signature BOOLEAN DEFAULT false,
    signed_date TIMESTAMP,
    signed_by_tenant_id UUID REFERENCES users(id),
    signature_data JSONB, -- electronic signature details
    is_tenant_accessible BOOLEAN DEFAULT true,
    effective_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Signature Requests
CREATE TABLE signature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_document_id UUID REFERENCES lease_documents(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- sign, initial, acknowledge
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, expired, cancelled
    due_date DATE,
    reminder_sent_at TIMESTAMP,
    signed_at TIMESTAMP,
    signature_ip INET,
    signature_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- AMENITY BOOKING SYSTEM
-- ==========================================

-- Property Amenities
CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amenity_type VARCHAR(50) NOT NULL, -- pool, gym, clubhouse, bbq_area, parking, storage
    capacity INTEGER, -- max people/units that can use simultaneously
    location_description TEXT,
    operating_hours JSONB, -- {"monday": "6:00-22:00", "tuesday": "6:00-22:00", etc.}
    booking_rules JSONB, -- advance notice, max duration, restrictions, etc.
    fee_amount DECIMAL(10,2) DEFAULT 0,
    requires_deposit BOOLEAN DEFAULT false,
    deposit_amount DECIMAL(10,2),
    images JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Amenity Bookings
CREATE TABLE amenity_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    party_size INTEGER DEFAULT 1,
    purpose VARCHAR(255), -- "Birthday party", "Business meeting", etc.
    status VARCHAR(50) DEFAULT 'confirmed', -- pending, confirmed, cancelled, completed, no_show
    total_fee DECIMAL(10,2) DEFAULT 0,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT false,
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid, refunded
    special_requests TEXT,
    setup_notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ENHANCED MAINTENANCE FEATURES
-- ==========================================

-- Maintenance Request Feedback (detailed rating system)
CREATE TABLE maintenance_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    would_recommend BOOLEAN,
    comments TEXT,
    improvement_suggestions TEXT,
    photos JSONB DEFAULT '[]', -- after photos from tenant
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Scheduling (preferred times for tenant)
CREATE TABLE maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preferred_date DATE,
    preferred_time_start TIME,
    preferred_time_end TIME,
    alternative_dates DATE[],
    availability_notes TEXT,
    contact_method VARCHAR(50) DEFAULT 'phone', -- phone, text, email
    special_instructions TEXT,
    status VARCHAR(50) DEFAULT 'requested', -- requested, scheduled, confirmed, completed
    scheduled_date TIMESTAMP,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Categories with tenant self-service options
CREATE TABLE maintenance_self_service (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES maintenance_categories(id) ON DELETE CASCADE,
    issue_title VARCHAR(255) NOT NULL,
    issue_description TEXT,
    troubleshooting_steps JSONB, -- step-by-step guide
    required_photos TEXT[], -- what photos to take
    estimated_resolution_time VARCHAR(100),
    tools_needed TEXT[],
    when_to_call_maintenance TEXT,
    safety_warnings TEXT[],
    video_tutorial_url VARCHAR(500),
    is_tenant_fixable BOOLEAN DEFAULT false,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- TENANT PORTAL PREFERENCES
-- ==========================================

-- Notification Preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    rent_reminders BOOLEAN DEFAULT true,
    payment_confirmations BOOLEAN DEFAULT true,
    maintenance_updates BOOLEAN DEFAULT true,
    community_announcements BOOLEAN DEFAULT true,
    emergency_alerts BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    reminder_days_before_rent INTEGER DEFAULT 3,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portal Access Logs
CREATE TABLE portal_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_type VARCHAR(50) NOT NULL, -- login, logout, view_documents, make_payment, etc.
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- mobile, desktop, tablet
    session_duration INTEGER, -- in seconds
    pages_visited TEXT[],
    features_used TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Payment system indexes
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_scheduled_date ON payments(scheduled_date);
CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);

-- Messaging system indexes
CREATE INDEX idx_message_threads_tenant_id ON message_threads(tenant_id);
CREATE INDEX idx_message_threads_status ON message_threads(status);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Amenity booking indexes
CREATE INDEX idx_amenity_bookings_tenant_id ON amenity_bookings(tenant_id);
CREATE INDEX idx_amenity_bookings_amenity_id ON amenity_bookings(amenity_id);
CREATE INDEX idx_amenity_bookings_date ON amenity_bookings(booking_date);
CREATE INDEX idx_amenities_property_id ON amenities(property_id);

-- Enhanced maintenance indexes
CREATE INDEX idx_maintenance_feedback_request_id ON maintenance_feedback(maintenance_request_id);
CREATE INDEX idx_maintenance_schedules_request_id ON maintenance_schedules(maintenance_request_id);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_pay_settings_updated_at BEFORE UPDATE ON auto_pay_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_threads_updated_at BEFORE UPDATE ON message_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lease_documents_updated_at BEFORE UPDATE ON lease_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_amenities_updated_at BEFORE UPDATE ON amenities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_amenity_bookings_updated_at BEFORE UPDATE ON amenity_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- DEFAULT DATA
-- ==========================================

-- Default Amenities for Properties (these would be added per property)
-- INSERT INTO amenities (property_id, name, description, amenity_type, capacity, booking_rules) VALUES
-- Example data structure - these would be property-specific

-- Default Notification Preferences (created when user registers)
-- Handled in application code during user registration

-- Default Maintenance Self-Service entries
INSERT INTO maintenance_self_service (category_id, issue_title, issue_description, troubleshooting_steps, is_tenant_fixable, difficulty_level) 
SELECT 
    id,
    'Clogged Drain',
    'Water draining slowly or not at all',
    '["Check for visible blockage", "Try plunging", "Use drain cleaner", "Remove and clean P-trap if accessible"]',
    true,
    2
FROM maintenance_categories WHERE name = 'Plumbing'
LIMIT 1;

INSERT INTO maintenance_self_service (category_id, issue_title, issue_description, troubleshooting_steps, is_tenant_fixable, difficulty_level)
SELECT 
    id,
    'Circuit Breaker Tripped',
    'Power out to specific area of unit',
    '["Locate electrical panel", "Check for tripped breakers", "Reset breaker by switching off then on", "Test outlets"]',
    true,
    1
FROM maintenance_categories WHERE name = 'Electrical'
LIMIT 1;