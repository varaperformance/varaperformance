-- Roles and Permissions Seed SQL
-- Run this to initialize RBAC tables with default roles and permissions
-- Usage: psql -d your_database -f seed-rbac.sql
-- Or via Docker: docker exec -i postgres psql -U your_user -d your_db < seed-rbac.sql

-- ============================================
-- ROLES
-- ============================================

INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Administrator', 'Full system access, can manage all resources', NOW(), NOW()),
  (gen_random_uuid(), 'Moderator', 'Content moderation, user management', NOW(), NOW()),
  (gen_random_uuid(), 'Coach', 'Coaching services, client management, messaging', NOW(), NOW()),
  (gen_random_uuid(), 'Client', 'Booking services, messaging with coaches, personal data', NOW(), NOW()),
  (gen_random_uuid(), 'Finance', 'Payment and billing management', NOW(), NOW()),
  (gen_random_uuid(), 'Legal', 'Legal document management, consent tracking', NOW(), NOW()),
  (gen_random_uuid(), 'Support', 'Customer support, incident management', NOW(), NOW()),
  (gen_random_uuid(), 'User', 'Basic authenticated user, personal health tracking', NOW(), NOW()),
  (gen_random_uuid(), 'ShopManager', 'Shop catalog, inventory, discount, and referral ops', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PERMISSIONS
-- ============================================

INSERT INTO "Permission" (id, resource, action, description, "createdAt", "updatedAt") VALUES
  -- Profile permissions
  (gen_random_uuid(), 'profile', 'create', 'Create user profiles', NOW(), NOW()),
  (gen_random_uuid(), 'profile', 'read', 'View user profiles', NOW(), NOW()),
  (gen_random_uuid(), 'profile', 'update', 'Update user profiles', NOW(), NOW()),
  (gen_random_uuid(), 'profile', 'delete', 'Delete user profiles', NOW(), NOW()),
  
  -- Messaging permissions
  (gen_random_uuid(), 'messaging', 'create', 'Send messages, start conversations', NOW(), NOW()),
  (gen_random_uuid(), 'messaging', 'read', 'Read messages and conversations', NOW(), NOW()),
  (gen_random_uuid(), 'messaging', 'update', 'Edit messages, manage conversation status', NOW(), NOW()),
  (gen_random_uuid(), 'messaging', 'delete', 'Delete messages', NOW(), NOW()),
  
  -- Coach permissions
  (gen_random_uuid(), 'coach', 'read', 'View coach profile', NOW(), NOW()),
  (gen_random_uuid(), 'coach', 'update', 'Update coach profile', NOW(), NOW()),
  
  -- Coaching permissions
  (gen_random_uuid(), 'coaching', 'read', 'View dashboard, clients, revenue', NOW(), NOW()),
  (gen_random_uuid(), 'coaching', 'update', 'Update booking status', NOW(), NOW()),
  
  -- Booking permissions
  (gen_random_uuid(), 'booking', 'create', 'Create coaching bookings', NOW(), NOW()),
  (gen_random_uuid(), 'booking', 'read', 'View bookings', NOW(), NOW()),
  (gen_random_uuid(), 'booking', 'cancel', 'Cancel bookings', NOW(), NOW()),
  
  -- Subscription permissions
  (gen_random_uuid(), 'subscription', 'read', 'View subscriptions', NOW(), NOW()),
  (gen_random_uuid(), 'subscription', 'update', 'Pause/resume/cancel subscriptions', NOW(), NOW()),
  
  -- Payment permissions
  (gen_random_uuid(), 'payment', 'read', 'View payment history', NOW(), NOW()),
  (gen_random_uuid(), 'payment', 'refund', 'Process refunds', NOW(), NOW()),

  -- Shop permissions
  (gen_random_uuid(), 'shop', 'catalog-read', 'View shop catalog in admin', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'catalog-update', 'Create or update shop products', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'inventory-read', 'View shop inventory', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'inventory-update', 'Adjust shop inventory', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'discount-read', 'View shop discount codes', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'discount-update', 'Create or update shop discount codes', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'referral-read', 'View shop referral codes', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'referral-update', 'Create or update shop referral codes', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'order-read', 'View shop orders', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'customer-read', 'View shop customers', NOW(), NOW()),
  (gen_random_uuid(), 'shop', 'review-moderate', 'Edit or delete product reviews', NOW(), NOW()),
  
  -- Notification permissions
  (gen_random_uuid(), 'notification', 'read', 'View notifications', NOW(), NOW()),
  (gen_random_uuid(), 'notification', 'update', 'Mark notifications as read', NOW(), NOW()),

  -- Calendar permissions
  (gen_random_uuid(), 'calendar', 'create', 'Create calendar events', NOW(), NOW()),
  (gen_random_uuid(), 'calendar', 'read', 'View calendar events', NOW(), NOW()),
  (gen_random_uuid(), 'calendar', 'update', 'Update calendar events', NOW(), NOW()),
  (gen_random_uuid(), 'calendar', 'delete', 'Delete calendar events', NOW(), NOW()),
  
  -- Health permissions
  (gen_random_uuid(), 'health', 'create', 'Create health records', NOW(), NOW()),
  (gen_random_uuid(), 'health', 'read', 'View health records', NOW(), NOW()),
  (gen_random_uuid(), 'health', 'update', 'Update health records', NOW(), NOW()),
  (gen_random_uuid(), 'health', 'delete', 'Delete health records', NOW(), NOW()),

  -- Workout permissions
  (gen_random_uuid(), 'workout', 'create', 'Create workout plans and plan sessions', NOW(), NOW()),
  (gen_random_uuid(), 'workout', 'read', 'View workout plans and assignments', NOW(), NOW()),
  (gen_random_uuid(), 'workout', 'update', 'Update workout plans and assignments', NOW(), NOW()),
  (gen_random_uuid(), 'workout', 'delete', 'Delete workout plans and plan entities', NOW(), NOW()),
  
  -- Blog permissions
  (gen_random_uuid(), 'blog', 'create', 'Create blog posts', NOW(), NOW()),
  (gen_random_uuid(), 'blog', 'read', 'View blog posts', NOW(), NOW()),
  (gen_random_uuid(), 'blog', 'update', 'Update blog posts', NOW(), NOW()),
  (gen_random_uuid(), 'blog', 'delete', 'Delete blog posts', NOW(), NOW()),
  
  -- Gym permissions
  (gen_random_uuid(), 'gym', 'create', 'Create gyms and locations', NOW(), NOW()),
  (gen_random_uuid(), 'gym', 'read', 'View gyms and locations', NOW(), NOW()),
  (gen_random_uuid(), 'gym', 'update', 'Update gyms and locations', NOW(), NOW()),
  (gen_random_uuid(), 'gym', 'delete', 'Delete gyms and locations', NOW(), NOW()),
  
  -- Exercise permissions
  (gen_random_uuid(), 'exercise', 'create', 'Create exercises', NOW(), NOW()),
  (gen_random_uuid(), 'exercise', 'read', 'View exercises', NOW(), NOW()),
  (gen_random_uuid(), 'exercise', 'update', 'Update exercises', NOW(), NOW()),
  (gen_random_uuid(), 'exercise', 'delete', 'Delete exercises', NOW(), NOW()),
  
  -- Status/Incident permissions
  (gen_random_uuid(), 'status', 'create', 'Create status services', NOW(), NOW()),
  (gen_random_uuid(), 'incident', 'create', 'Create incidents', NOW(), NOW()),
  (gen_random_uuid(), 'incident', 'update', 'Update incidents', NOW(), NOW()),
  (gen_random_uuid(), 'incident', 'add-note', 'Add notes to incidents', NOW(), NOW()),
  
  -- Consent/Legal permissions
  (gen_random_uuid(), 'consent', 'read', 'View consent records', NOW(), NOW()),
  (gen_random_uuid(), 'consent', 'create', 'Create legal documents', NOW(), NOW()),
  (gen_random_uuid(), 'consent', 'update', 'Update legal documents', NOW(), NOW()),
  (gen_random_uuid(), 'legal', 'create', 'Create legal documents', NOW(), NOW()),
  (gen_random_uuid(), 'legal', 'update', 'Update legal documents', NOW(), NOW()),
  
  -- User management permissions
  (gen_random_uuid(), 'user', 'read', 'View user information', NOW(), NOW()),
  (gen_random_uuid(), 'user', 'update', 'Update user status', NOW(), NOW()),
  (gen_random_uuid(), 'user', 'delete', 'Delete users', NOW(), NOW()),
  
  -- Customer permissions
  (gen_random_uuid(), 'customer', 'read', 'View customer payment info', NOW(), NOW()),

  -- Elevate permissions
  (gen_random_uuid(), 'elevate', 'create', 'Create elevate posts and interactions', NOW(), NOW()),
  (gen_random_uuid(), 'elevate', 'read', 'View elevate feed and partners', NOW(), NOW()),
  (gen_random_uuid(), 'elevate', 'update', 'Update own elevate content', NOW(), NOW()),
  (gen_random_uuid(), 'elevate', 'delete', 'Delete own elevate content', NOW(), NOW()),
  
  -- FAQ permissions
  (gen_random_uuid(), 'faq', 'create', 'Create FAQs and FAQ categories', NOW(), NOW()),
  (gen_random_uuid(), 'faq', 'read', 'View FAQs and FAQ categories', NOW(), NOW()),
  (gen_random_uuid(), 'faq', 'update', 'Update FAQs and FAQ categories', NOW(), NOW()),
  (gen_random_uuid(), 'faq', 'delete', 'Delete FAQs and FAQ categories', NOW(), NOW()),

  -- Admin permissions
  (gen_random_uuid(), 'admin', 'read', 'View admin dashboard, stats, audit logs', NOW(), NOW()),
  (gen_random_uuid(), 'admin', 'create', 'Create admin resources (assign roles/permissions)', NOW(), NOW()),
  (gen_random_uuid(), 'admin', 'update', 'Update admin settings (private mode, verification)', NOW(), NOW()),
  (gen_random_uuid(), 'admin', 'delete', 'Remove admin resources (unassign roles/permissions)', NOW(), NOW()),

  -- Challenge permissions
  (gen_random_uuid(), 'challenge', 'create', 'Create challenges and join challenges', NOW(), NOW()),
  (gen_random_uuid(), 'challenge', 'read', 'View challenges and leaderboards', NOW(), NOW()),
  (gen_random_uuid(), 'challenge', 'update', 'Update challenges and log progress', NOW(), NOW()),
  (gen_random_uuid(), 'challenge', 'delete', 'Delete challenges and leave challenges', NOW(), NOW()),

  -- Marketing permissions
  (gen_random_uuid(), 'marketing', 'read', 'View subscribers and newsletter stats', NOW(), NOW()),
  (gen_random_uuid(), 'marketing', 'create', 'Create newsletters', NOW(), NOW()),
  (gen_random_uuid(), 'marketing', 'update', 'Update newsletters', NOW(), NOW()),
  (gen_random_uuid(), 'marketing', 'delete', 'Delete newsletters', NOW(), NOW()),

  -- Team permissions
  (gen_random_uuid(), 'team', 'read', 'View team members and ambassadors', NOW(), NOW()),
  (gen_random_uuid(), 'team', 'update', 'Update team members and ambassadors', NOW(), NOW()),

  -- Contract permissions
  (gen_random_uuid(), 'contract', 'read', 'View coaching contracts (admin)', NOW(), NOW()),

  -- Nutrition permissions (admin)
  (gen_random_uuid(), 'nutrition', 'create', 'Create foods (admin)', NOW(), NOW()),
  (gen_random_uuid(), 'nutrition', 'read', 'View foods list (admin)', NOW(), NOW()),
  (gen_random_uuid(), 'nutrition', 'update', 'Update and verify foods (admin)', NOW(), NOW()),
  (gen_random_uuid(), 'nutrition', 'delete', 'Delete foods (admin)', NOW(), NOW()),

  -- Recipe permissions (admin)
  (gen_random_uuid(), 'recipe', 'create', 'Create recipe categories (admin)', NOW(), NOW()),
  (gen_random_uuid(), 'recipe', 'read', 'View recipes and categories (admin)', NOW(), NOW()),
  (gen_random_uuid(), 'recipe', 'update', 'Update and verify recipes (admin)', NOW(), NOW()),
  (gen_random_uuid(), 'recipe', 'delete', 'Delete recipes and categories (admin)', NOW(), NOW()),

  -- Release Note permissions
  (gen_random_uuid(), 'release-note', 'create', 'Create release notes', NOW(), NOW()),
  (gen_random_uuid(), 'release-note', 'read', 'View release notes (admin)', NOW(), NOW()),
  (gen_random_uuid(), 'release-note', 'update', 'Update release notes', NOW(), NOW()),
  (gen_random_uuid(), 'release-note', 'delete', 'Delete release notes', NOW(), NOW()),

  -- Spotlight permissions
  (gen_random_uuid(), 'spotlight', 'read', 'View spotlight submissions (admin)', NOW(), NOW()),
  (gen_random_uuid(), 'spotlight', 'create', 'Create spotlight posts', NOW(), NOW()),
  (gen_random_uuid(), 'spotlight', 'update', 'Update spotlight posts', NOW(), NOW()),
  (gen_random_uuid(), 'spotlight', 'delete', 'Delete spotlight posts', NOW(), NOW()),

  -- Climb permissions
  (gen_random_uuid(), 'climb', 'create', 'Create climb entries', NOW(), NOW()),
  (gen_random_uuid(), 'climb', 'read', 'View climb entries', NOW(), NOW()),
  (gen_random_uuid(), 'climb', 'delete', 'Delete climb entries', NOW(), NOW()),

  -- Integration permissions
  (gen_random_uuid(), 'integration', 'read', 'View integration connections', NOW(), NOW()),
  (gen_random_uuid(), 'integration', 'update', 'Connect/disconnect integrations', NOW(), NOW()),

  -- Achievement permissions
  (gen_random_uuid(), 'achievement', 'read', 'View achievements and progress', NOW(), NOW()),
  (gen_random_uuid(), 'achievement', 'create', 'Check and unlock achievements', NOW(), NOW()),

  -- Coaching (additional actions)
  (gen_random_uuid(), 'coaching', 'create', 'Create coaching availability and packages', NOW(), NOW()),
  (gen_random_uuid(), 'coaching', 'delete', 'Delete coaching availability and packages', NOW(), NOW()),

  -- Wildcard permission for admin
  (gen_random_uuid(), '*', '*', 'Full access to all resources', NOW(), NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================
-- ROLE PERMISSIONS MAPPING
-- ============================================

-- Administrator: Wildcard access
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'Administrator' AND p.resource = '*' AND p.action = '*'
ON CONFLICT DO NOTHING;

-- Moderator permissions
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'Moderator' AND (
  (p.resource = 'blog' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'health' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'exercise' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'faq' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'user' AND p.action IN ('read', 'update')) OR
  (p.resource = 'incident' AND p.action IN ('create', 'update', 'add-note')) OR
  (p.resource = 'shop' AND p.action = 'review-moderate') OR
  (p.resource = 'challenge' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'nutrition' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'recipe' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'release-note' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'spotlight' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'elevate' AND p.action = 'moderate')
)
ON CONFLICT DO NOTHING;

-- Coach permissions
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'Coach' AND (
  (p.resource = 'coach' AND p.action IN ('read', 'update')) OR
  (p.resource = 'coaching' AND p.action IN ('read', 'create', 'update', 'delete')) OR
  (p.resource = 'calendar' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'messaging' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'notification' AND p.action IN ('read', 'update')) OR
  (p.resource = 'profile' AND p.action IN ('read', 'update')) OR
  (p.resource = 'health' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'elevate' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'workout' AND p.action IN ('create', 'read', 'update', 'delete'))
)
ON CONFLICT DO NOTHING;

-- Client permissions
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'Client' AND (
  (p.resource = 'booking' AND p.action IN ('create', 'read', 'cancel')) OR
  (p.resource = 'subscription' AND p.action IN ('read', 'update')) OR
  (p.resource = 'calendar' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'messaging' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'notification' AND p.action IN ('read', 'update')) OR
  (p.resource = 'profile' AND p.action IN ('read', 'update', 'delete')) OR
  (p.resource = 'health' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'payment' AND p.action = 'read') OR
  (p.resource = 'elevate' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'workout' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'challenge' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'climb' AND p.action IN ('create', 'read', 'delete')) OR
  (p.resource = 'achievement' AND p.action IN ('read', 'create')) OR
  (p.resource = 'integration' AND p.action IN ('read', 'update'))
)
ON CONFLICT DO NOTHING;

-- Finance permissions
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'Finance' AND (
  (p.resource = 'payment' AND p.action IN ('read', 'refund')) OR
  (p.resource = 'subscription' AND p.action = 'read') OR
  (p.resource = 'customer' AND p.action = 'read') OR
  (p.resource = 'shop' AND p.action IN ('order-read', 'customer-read', 'discount-read', 'referral-read', 'inventory-read'))
)
ON CONFLICT DO NOTHING;

-- Legal permissions
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'Legal' AND (
  (p.resource = 'consent' AND p.action IN ('read', 'create', 'update')) OR
  (p.resource = 'legal' AND p.action IN ('create', 'update'))
)
ON CONFLICT DO NOTHING;

-- Support permissions
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'Support' AND (
  (p.resource = 'status' AND p.action = 'create') OR
  (p.resource = 'incident' AND p.action IN ('create', 'update', 'add-note')) OR
  (p.resource = 'user' AND p.action = 'read') OR
  (p.resource = 'faq' AND p.action = 'read')
)
ON CONFLICT DO NOTHING;

-- User (basic) permissions
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'User' AND (
  (p.resource = 'profile' AND p.action IN ('read', 'update')) OR
  (p.resource = 'health' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'workout' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'calendar' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'notification' AND p.action IN ('read', 'update')) OR
  (p.resource = 'messaging' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'elevate' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'challenge' AND p.action IN ('create', 'read', 'update', 'delete')) OR
  (p.resource = 'climb' AND p.action IN ('create', 'read', 'delete')) OR
  (p.resource = 'achievement' AND p.action IN ('read', 'create')) OR
  (p.resource = 'integration' AND p.action IN ('read', 'update'))
)
ON CONFLICT DO NOTHING;

-- ShopManager permissions
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "Role" r, "Permission" p
WHERE r.name = 'ShopManager' AND (
  (p.resource = 'shop' AND p.action IN ('catalog-read', 'catalog-update', 'inventory-read', 'inventory-update', 'discount-read', 'discount-update', 'referral-read', 'referral-update', 'order-read', 'customer-read', 'review-moderate'))
)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify the seed:
-- SELECT r.name as role, COUNT(rp."permissionId") as permission_count
-- FROM "Role" r
-- LEFT JOIN "RolePermission" rp ON r.id = rp."roleId"
-- GROUP BY r.name
-- ORDER BY r.name;

-- SELECT r.name as role, p.resource, p.action
-- FROM "RolePermission" rp
-- JOIN "Role" r ON rp."roleId" = r.id
-- JOIN "Permission" p ON rp."permissionId" = p.id
-- ORDER BY r.name, p.resource, p.action;
