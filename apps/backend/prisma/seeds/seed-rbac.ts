import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * RBAC Seed Script
 * Seeds roles and permissions into the database
 *
 * Usage: npx ts-node prisma/seeds/seed-rbac.ts
 * Or: pnpm prisma db seed (if configured in package.json)
 */

interface PermissionData {
  resource: string;
  action: string;
  description: string;
}

interface RoleData {
  name: string;
  description: string;
  permissions: string[]; // Format: "resource:action"
}

const PERMISSIONS: PermissionData[] = [
  // Profile
  {
    resource: 'profile',
    action: 'create',
    description: 'Create user profiles',
  },
  { resource: 'profile', action: 'read', description: 'View user profiles' },
  {
    resource: 'profile',
    action: 'update',
    description: 'Update user profiles',
  },
  {
    resource: 'profile',
    action: 'delete',
    description: 'Delete user profiles',
  },

  // Messaging
  {
    resource: 'messaging',
    action: 'create',
    description: 'Send messages, start conversations',
  },
  {
    resource: 'messaging',
    action: 'read',
    description: 'Read messages and conversations',
  },
  {
    resource: 'messaging',
    action: 'update',
    description: 'Edit messages, manage conversation status',
  },
  { resource: 'messaging', action: 'delete', description: 'Delete messages' },

  // Coach
  { resource: 'coach', action: 'read', description: 'View coach profile' },
  { resource: 'coach', action: 'update', description: 'Update coach profile' },

  // Coaching
  {
    resource: 'coaching',
    action: 'read',
    description: 'View dashboard, clients, revenue',
  },
  {
    resource: 'coaching',
    action: 'update',
    description: 'Update booking status',
  },

  // Booking
  {
    resource: 'booking',
    action: 'create',
    description: 'Create coaching bookings',
  },
  { resource: 'booking', action: 'read', description: 'View bookings' },
  { resource: 'booking', action: 'cancel', description: 'Cancel bookings' },

  // Subscription
  {
    resource: 'subscription',
    action: 'read',
    description: 'View subscriptions',
  },
  {
    resource: 'subscription',
    action: 'update',
    description: 'Pause/resume/cancel subscriptions',
  },

  // Payment
  { resource: 'payment', action: 'read', description: 'View payment history' },
  { resource: 'payment', action: 'refund', description: 'Process refunds' },

  // Shop
  {
    resource: 'shop',
    action: 'catalog-read',
    description: 'View shop catalog in admin',
  },
  {
    resource: 'shop',
    action: 'catalog-update',
    description: 'Create or update shop products',
  },
  {
    resource: 'shop',
    action: 'inventory-read',
    description: 'View shop inventory',
  },
  {
    resource: 'shop',
    action: 'inventory-update',
    description: 'Adjust shop inventory',
  },
  {
    resource: 'shop',
    action: 'discount-read',
    description: 'View shop discount codes',
  },
  {
    resource: 'shop',
    action: 'discount-update',
    description: 'Create or update shop discount codes',
  },
  {
    resource: 'shop',
    action: 'referral-read',
    description: 'View shop referral codes',
  },
  {
    resource: 'shop',
    action: 'referral-update',
    description: 'Create or update shop referral codes',
  },
  {
    resource: 'shop',
    action: 'order-read',
    description: 'View shop orders',
  },
  {
    resource: 'shop',
    action: 'customer-read',
    description: 'View shop customers',
  },
  {
    resource: 'shop',
    action: 'review-moderate',
    description: 'Edit or delete product reviews',
  },

  // Notification
  {
    resource: 'notification',
    action: 'read',
    description: 'View notifications',
  },
  {
    resource: 'notification',
    action: 'update',
    description: 'Mark notifications as read',
  },

  // Calendar
  {
    resource: 'calendar',
    action: 'create',
    description: 'Create calendar events',
  },
  { resource: 'calendar', action: 'read', description: 'View calendar events' },
  {
    resource: 'calendar',
    action: 'update',
    description: 'Update calendar events',
  },
  {
    resource: 'calendar',
    action: 'delete',
    description: 'Delete calendar events',
  },

  // Health
  {
    resource: 'health',
    action: 'create',
    description: 'Create health records',
  },
  { resource: 'health', action: 'read', description: 'View health records' },
  {
    resource: 'health',
    action: 'update',
    description: 'Update health records',
  },
  {
    resource: 'health',
    action: 'delete',
    description: 'Delete health records',
  },

  // Workout Plans
  {
    resource: 'workout',
    action: 'create',
    description: 'Create workout plans and plan sessions',
  },
  {
    resource: 'workout',
    action: 'read',
    description: 'View workout plans and assignments',
  },
  {
    resource: 'workout',
    action: 'update',
    description: 'Update workout plans and assignments',
  },
  {
    resource: 'workout',
    action: 'delete',
    description: 'Delete workout plans and plan entities',
  },

  // Blog
  { resource: 'blog', action: 'create', description: 'Create blog posts' },
  { resource: 'blog', action: 'read', description: 'View blog posts' },
  { resource: 'blog', action: 'update', description: 'Update blog posts' },
  { resource: 'blog', action: 'delete', description: 'Delete blog posts' },

  // Gym
  {
    resource: 'gym',
    action: 'create',
    description: 'Create gyms and locations',
  },
  { resource: 'gym', action: 'read', description: 'View gyms and locations' },
  {
    resource: 'gym',
    action: 'update',
    description: 'Update gyms and locations',
  },
  {
    resource: 'gym',
    action: 'delete',
    description: 'Delete gyms and locations',
  },

  // Exercise
  { resource: 'exercise', action: 'create', description: 'Create exercises' },
  { resource: 'exercise', action: 'read', description: 'View exercises' },
  { resource: 'exercise', action: 'update', description: 'Update exercises' },
  { resource: 'exercise', action: 'delete', description: 'Delete exercises' },

  // Status/Incident
  {
    resource: 'status',
    action: 'create',
    description: 'Create status services',
  },
  { resource: 'incident', action: 'create', description: 'Create incidents' },
  { resource: 'incident', action: 'update', description: 'Update incidents' },
  {
    resource: 'incident',
    action: 'add-note',
    description: 'Add notes to incidents',
  },

  // Consent/Legal
  { resource: 'consent', action: 'read', description: 'View consent records' },
  {
    resource: 'consent',
    action: 'create',
    description: 'Create legal documents',
  },
  {
    resource: 'consent',
    action: 'update',
    description: 'Update legal documents',
  },
  {
    resource: 'legal',
    action: 'create',
    description: 'Create legal documents',
  },
  {
    resource: 'legal',
    action: 'update',
    description: 'Update legal documents',
  },

  // User management
  { resource: 'user', action: 'read', description: 'View user information' },
  { resource: 'user', action: 'update', description: 'Update user status' },
  { resource: 'user', action: 'delete', description: 'Delete users' },

  // Customer
  {
    resource: 'customer',
    action: 'read',
    description: 'View customer payment info',
  },

  // Elevate (Social Feed)
  {
    resource: 'elevate',
    action: 'create',
    description: 'Create posts, comments, high-fives',
  },
  {
    resource: 'elevate',
    action: 'read',
    description: 'View social feed and posts',
  },
  {
    resource: 'elevate',
    action: 'update',
    description: 'Update own posts and comments',
  },
  {
    resource: 'elevate',
    action: 'delete',
    description: 'Delete own posts and comments',
  },

  // FAQ
  {
    resource: 'faq',
    action: 'create',
    description: 'Create FAQs and FAQ categories',
  },
  {
    resource: 'faq',
    action: 'read',
    description: 'View FAQs and FAQ categories',
  },
  {
    resource: 'faq',
    action: 'update',
    description: 'Update FAQs and FAQ categories',
  },
  {
    resource: 'faq',
    action: 'delete',
    description: 'Delete FAQs and FAQ categories',
  },

  // Admin (platform administration)
  {
    resource: 'admin',
    action: 'read',
    description: 'View admin dashboard, stats, audit logs',
  },
  {
    resource: 'admin',
    action: 'create',
    description: 'Create admin resources (assign roles/permissions)',
  },
  {
    resource: 'admin',
    action: 'update',
    description: 'Update admin settings (private mode, verification)',
  },
  {
    resource: 'admin',
    action: 'delete',
    description: 'Remove admin resources (unassign roles/permissions)',
  },

  // Challenge
  {
    resource: 'challenge',
    action: 'create',
    description: 'Create challenges and join challenges',
  },
  {
    resource: 'challenge',
    action: 'read',
    description: 'View challenges and leaderboards',
  },
  {
    resource: 'challenge',
    action: 'update',
    description: 'Update challenges and log progress',
  },
  {
    resource: 'challenge',
    action: 'delete',
    description: 'Delete challenges and leave challenges',
  },

  // Marketing
  {
    resource: 'marketing',
    action: 'read',
    description: 'View subscribers and newsletter stats',
  },
  {
    resource: 'marketing',
    action: 'create',
    description: 'Create newsletters',
  },
  {
    resource: 'marketing',
    action: 'update',
    description: 'Update newsletters',
  },
  {
    resource: 'marketing',
    action: 'delete',
    description: 'Delete newsletters',
  },

  // Team
  {
    resource: 'team',
    action: 'read',
    description: 'View team members and ambassadors',
  },
  {
    resource: 'team',
    action: 'update',
    description: 'Update team members and ambassadors',
  },

  // Contract
  {
    resource: 'contract',
    action: 'read',
    description: 'View coaching contracts (admin)',
  },

  // Nutrition (admin food/recipe management)
  {
    resource: 'nutrition',
    action: 'create',
    description: 'Create foods (admin)',
  },
  {
    resource: 'nutrition',
    action: 'read',
    description: 'View foods list (admin)',
  },
  {
    resource: 'nutrition',
    action: 'update',
    description: 'Update and verify foods (admin)',
  },
  {
    resource: 'nutrition',
    action: 'delete',
    description: 'Delete foods (admin)',
  },

  // Recipe
  {
    resource: 'recipe',
    action: 'create',
    description: 'Create recipe categories (admin)',
  },
  {
    resource: 'recipe',
    action: 'read',
    description: 'View recipes and categories (admin)',
  },
  {
    resource: 'recipe',
    action: 'update',
    description: 'Update and verify recipes (admin)',
  },
  {
    resource: 'recipe',
    action: 'delete',
    description: 'Delete recipes and categories (admin)',
  },

  // Release Note
  {
    resource: 'release-note',
    action: 'create',
    description: 'Create release notes',
  },
  {
    resource: 'release-note',
    action: 'read',
    description: 'View release notes (admin)',
  },
  {
    resource: 'release-note',
    action: 'update',
    description: 'Update release notes',
  },
  {
    resource: 'release-note',
    action: 'delete',
    description: 'Delete release notes',
  },

  // Spotlight
  {
    resource: 'spotlight',
    action: 'read',
    description: 'View spotlight submissions (admin)',
  },
  {
    resource: 'spotlight',
    action: 'create',
    description: 'Create spotlight posts',
  },
  {
    resource: 'spotlight',
    action: 'update',
    description: 'Update spotlight posts',
  },
  {
    resource: 'spotlight',
    action: 'delete',
    description: 'Delete spotlight posts',
  },

  // Climb
  {
    resource: 'climb',
    action: 'create',
    description: 'Create climb entries',
  },
  { resource: 'climb', action: 'read', description: 'View climb entries' },
  {
    resource: 'climb',
    action: 'delete',
    description: 'Delete climb entries',
  },

  // Integration
  {
    resource: 'integration',
    action: 'read',
    description: 'View integration connections',
  },
  {
    resource: 'integration',
    action: 'update',
    description: 'Connect/disconnect integrations',
  },

  // Achievement
  {
    resource: 'achievement',
    action: 'read',
    description: 'View achievements and progress',
  },
  {
    resource: 'achievement',
    action: 'create',
    description: 'Check and unlock achievements',
  },

  // Coaching (additional actions)
  {
    resource: 'coaching',
    action: 'create',
    description: 'Create coaching availability and packages',
  },
  {
    resource: 'coaching',
    action: 'delete',
    description: 'Delete coaching availability and packages',
  },

  // Wildcard (admin only)
  { resource: '*', action: '*', description: 'Full access to all resources' },
];

const ROLES: RoleData[] = [
  {
    name: 'Administrator',
    description: 'Full system access, can manage all resources',
    permissions: ['*:*'],
  },
  {
    name: 'Moderator',
    description: 'Content moderation, user management',
    permissions: [
      'blog:create',
      'blog:read',
      'blog:update',
      'blog:delete',
      'health:create',
      'health:read',
      'health:update',
      'health:delete',
      'exercise:create',
      'exercise:read',
      'exercise:update',
      'exercise:delete',
      'faq:create',
      'faq:read',
      'faq:update',
      'faq:delete',
      'user:read',
      'user:update',
      'incident:create',
      'incident:update',
      'incident:add-note',
      'shop:review-moderate',
      'challenge:create',
      'challenge:read',
      'challenge:update',
      'challenge:delete',
      'nutrition:create',
      'nutrition:read',
      'nutrition:update',
      'nutrition:delete',
      'recipe:create',
      'recipe:read',
      'recipe:update',
      'recipe:delete',
      'release-note:create',
      'release-note:read',
      'release-note:update',
      'release-note:delete',
      'spotlight:create',
      'spotlight:read',
      'spotlight:update',
      'spotlight:delete',
      'elevate:moderate',
    ],
  },
  {
    name: 'Coach',
    description: 'Coaching services, client management, messaging',
    permissions: [
      'coach:read',
      'coach:update',
      'coaching:read',
      'coaching:create',
      'coaching:update',
      'coaching:delete',
      'messaging:create',
      'messaging:read',
      'messaging:update',
      'messaging:delete',
      'notification:read',
      'notification:update',
      'calendar:create',
      'calendar:read',
      'calendar:update',
      'calendar:delete',
      'profile:read',
      'profile:update',
      'health:create',
      'health:read',
      'health:update',
      'health:delete',
      'elevate:create',
      'elevate:read',
      'elevate:update',
      'elevate:delete',
      'workout:create',
      'workout:read',
      'workout:update',
      'workout:delete',
    ],
  },
  {
    name: 'Client',
    description: 'Booking services, messaging with coaches, personal data',
    permissions: [
      'booking:create',
      'booking:read',
      'booking:cancel',
      'subscription:read',
      'subscription:update',
      'messaging:create',
      'messaging:read',
      'messaging:update',
      'messaging:delete',
      'notification:read',
      'notification:update',
      'calendar:create',
      'calendar:read',
      'calendar:update',
      'calendar:delete',
      'profile:read',
      'profile:update',
      'profile:delete',
      'health:create',
      'health:read',
      'health:update',
      'health:delete',
      'payment:read',
      'elevate:create',
      'elevate:read',
      'elevate:update',
      'elevate:delete',
      'workout:create',
      'workout:read',
      'workout:update',
      'workout:delete',
      'challenge:create',
      'challenge:read',
      'challenge:update',
      'challenge:delete',
      'climb:create',
      'climb:read',
      'climb:delete',
      'achievement:read',
      'achievement:create',
      'integration:read',
      'integration:update',
    ],
  },
  {
    name: 'Finance',
    description: 'Payment and billing management',
    permissions: [
      'payment:read',
      'payment:refund',
      'subscription:read',
      'customer:read',
      'shop:inventory-read',
      'shop:discount-read',
      'shop:referral-read',
      'shop:order-read',
      'shop:customer-read',
      'shop:review-moderate',
    ],
  },
  {
    name: 'ShopManager',
    description: 'Shop catalog, inventory, discount, and referral ops',
    permissions: [
      'shop:catalog-read',
      'shop:catalog-update',
      'shop:inventory-read',
      'shop:inventory-update',
      'shop:discount-read',
      'shop:discount-update',
      'shop:referral-read',
      'shop:referral-update',
      'shop:order-read',
      'shop:customer-read',
      'shop:review-moderate',
    ],
  },
  {
    name: 'Legal',
    description: 'Legal document management, consent tracking',
    permissions: [
      'consent:read',
      'consent:create',
      'consent:update',
      'legal:create',
      'legal:update',
    ],
  },
  {
    name: 'Support',
    description: 'Customer support, incident management',
    permissions: [
      'status:create',
      'incident:create',
      'incident:update',
      'incident:add-note',
      'user:read',
      'faq:read',
    ],
  },
  {
    name: 'User',
    description: 'Basic authenticated user, personal health tracking',
    permissions: [
      'messaging:create',
      'messaging:read',
      'messaging:update',
      'messaging:delete',
      'profile:read',
      'profile:update',
      'health:create',
      'health:read',
      'health:update',
      'health:delete',
      'workout:create',
      'workout:read',
      'workout:update',
      'workout:delete',
      'notification:read',
      'notification:update',
      'calendar:create',
      'calendar:read',
      'calendar:update',
      'calendar:delete',
      'elevate:create',
      'elevate:read',
      'elevate:update',
      'elevate:delete',
      'challenge:create',
      'challenge:read',
      'challenge:update',
      'challenge:delete',
      'climb:create',
      'climb:read',
      'climb:delete',
      'achievement:read',
      'achievement:create',
      'integration:read',
      'integration:update',
    ],
  },
];

async function main() {
  console.log('🔐 RBAC Seed Script');
  console.log('===================\n');

  // Seed permissions
  console.log('📋 Seeding permissions...');
  const permissionMap = new Map<string, string>();

  for (const perm of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: { description: perm.description },
      create: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
    });
    permissionMap.set(`${perm.resource}:${perm.action}`, permission.id);
  }
  console.log(`   ✅ Created ${permissionMap.size} permissions\n`);

  // Seed roles
  console.log('👥 Seeding roles...');
  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    // Add role permissions
    for (const permKey of roleData.permissions) {
      const permissionId = permissionMap.get(permKey);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permissionId,
          },
        });
      } else {
        console.warn(`   ⚠️  Permission not found: ${permKey}`);
      }
    }
    console.log(
      `   ✅ ${roleData.name}: ${roleData.permissions.length} permissions`,
    );
  }

  console.log('\n✅ RBAC seed completed successfully!');

  // Summary
  const roles = await prisma.role.findMany({
    include: { _count: { select: { permissions: true } } },
  });
  console.log('\n📊 Summary:');
  console.log('Role                | Permissions');
  console.log('--------------------|------------');
  for (const role of roles) {
    console.log(`${role.name.padEnd(20)}| ${role._count.permissions}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding RBAC:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
