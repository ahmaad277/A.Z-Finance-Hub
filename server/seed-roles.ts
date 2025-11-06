import { db } from "./db";
import { roles, permissions, rolePermissions, users, userSettings } from "@shared/schema";
import { hashPassword } from "./auth";

async function seedRolesAndPermissions() {
  console.log("Seeding roles, permissions, and default user...");

  // Check if roles already exist
  const existingRoles = await db.select().from(roles);
  
  if (existingRoles.length > 0) {
    console.log("ℹ️  Roles already exist, skipping seed");
    return;
  }

  // Create permissions first
  const permissionsList = [
    // System permissions
    { key: 'system:full_access', displayName: 'Full System Access', displayNameAr: 'الوصول الكامل للنظام', description: 'Complete control over entire system', descriptionAr: 'تحكم كامل بالنظام بأكمله', category: 'system' },
    { key: 'system:manage_platforms', displayName: 'Manage Platforms', displayNameAr: 'إدارة المنصات', description: 'Create, edit, delete platforms', descriptionAr: 'إنشاء وتعديل وحذف المنصات', category: 'platform' },
    
    // Data Access permissions
    { key: 'data:view_absolute_amounts', displayName: 'View Absolute Amounts', displayNameAr: 'عرض المبالغ الفعلية', description: 'See actual monetary values', descriptionAr: 'رؤية القيم النقدية الفعلية', category: 'data_access' },
    { key: 'data:view_percentages', displayName: 'View Percentages', displayNameAr: 'عرض النسب المئوية', description: 'See percentage data', descriptionAr: 'رؤية بيانات النسب المئوية', category: 'data_access' },
    { key: 'data:view_sensitive', displayName: 'View Sensitive Data', displayNameAr: 'عرض البيانات الحساسة', description: 'Access sensitive information', descriptionAr: 'الوصول للمعلومات الحساسة', category: 'data_access' },
    
    // Investment permissions
    { key: 'investments:create', displayName: 'Create Investments', displayNameAr: 'إنشاء استثمارات', description: 'Add new investments', descriptionAr: 'إضافة استثمارات جديدة', category: 'investments' },
    { key: 'investments:edit', displayName: 'Edit Investments', displayNameAr: 'تعديل الاستثمارات', description: 'Modify existing investments', descriptionAr: 'تعديل الاستثمارات الموجودة', category: 'investments' },
    { key: 'investments:delete', displayName: 'Delete Investments', displayNameAr: 'حذف الاستثمارات', description: 'Remove investments', descriptionAr: 'حذف الاستثمارات', category: 'investments' },
    
    // Cashflow permissions
    { key: 'cashflows:create', displayName: 'Create Cashflows', displayNameAr: 'إنشاء التدفقات النقدية', description: 'Add cashflow entries', descriptionAr: 'إضافة سجلات التدفق النقدي', category: 'cashflows' },
    { key: 'cashflows:edit', displayName: 'Edit Cashflows', displayNameAr: 'تعديل التدفقات النقدية', description: 'Modify cashflows', descriptionAr: 'تعديل التدفقات النقدية', category: 'cashflows' },
    { key: 'cashflows:delete', displayName: 'Delete Cashflows', displayNameAr: 'حذف التدفقات النقدية', description: 'Remove cashflows', descriptionAr: 'حذف التدفقات النقدية', category: 'cashflows' },
    
    // Cash Management permissions
    { key: 'cash:create', displayName: 'Create Cash Transactions', displayNameAr: 'إنشاء معاملات نقدية', description: 'Add cash transactions', descriptionAr: 'إضافة معاملات نقدية', category: 'cash' },
    { key: 'cash:edit', displayName: 'Edit Cash Transactions', displayNameAr: 'تعديل المعاملات النقدية', description: 'Modify cash transactions', descriptionAr: 'تعديل المعاملات النقدية', category: 'cash' },
    { key: 'cash:delete', displayName: 'Delete Cash Transactions', displayNameAr: 'حذف المعاملات النقدية', description: 'Remove cash transactions', descriptionAr: 'حذف المعاملات النقدية', category: 'cash' },
    
    // Analytics permissions
    { key: 'analytics:view_advanced', displayName: 'View Advanced Analytics', displayNameAr: 'عرض التحليلات المتقدمة', description: 'Access advanced analytics', descriptionAr: 'الوصول للتحليلات المتقدمة', category: 'analytics' },
    
    // User Management permissions
    { key: 'users:manage', displayName: 'Manage Users', displayNameAr: 'إدارة المستخدمين', description: 'Create, edit, suspend users', descriptionAr: 'إنشاء وتعديل وتعليق المستخدمين', category: 'users' },
    { key: 'users:impersonate', displayName: 'Impersonate Users', displayNameAr: 'انتحال شخصية المستخدمين', description: 'Login as other users', descriptionAr: 'تسجيل الدخول كمستخدمين آخرين', category: 'users' },
    
    // Export/View Request permissions
    { key: 'export:create', displayName: 'Create Export Requests', displayNameAr: 'إنشاء طلبات التصدير', description: 'Request data exports', descriptionAr: 'طلب تصدير البيانات', category: 'export' },
    { key: 'export:approve', displayName: 'Approve Export Requests', displayNameAr: 'الموافقة على طلبات التصدير', description: 'Approve export requests', descriptionAr: 'الموافقة على طلبات التصدير', category: 'export' },
    { key: 'view_requests:create', displayName: 'Create View Requests', displayNameAr: 'إنشاء طلبات العرض', description: 'Request data viewing access', descriptionAr: 'طلب الوصول لعرض البيانات', category: 'view_requests' },
    { key: 'view_requests:approve', displayName: 'Approve View Requests', displayNameAr: 'الموافقة على طلبات العرض', description: 'Approve view requests', descriptionAr: 'الموافقة على طلبات العرض', category: 'view_requests' },
    
    // Role Management permissions
    { key: 'roles:create', displayName: 'Create Roles', displayNameAr: 'إنشاء الأدوار', description: 'Create new roles', descriptionAr: 'إنشاء أدوار جديدة', category: 'roles' },
    { key: 'roles:edit', displayName: 'Edit Roles', displayNameAr: 'تعديل الأدوار', description: 'Modify existing roles', descriptionAr: 'تعديل الأدوار الموجودة', category: 'roles' },
    { key: 'roles:delete', displayName: 'Delete Roles', displayNameAr: 'حذف الأدوار', description: 'Remove roles', descriptionAr: 'حذف الأدوار', category: 'roles' },
    { key: 'roles:assign_temporary', displayName: 'Assign Temporary Roles', displayNameAr: 'تعيين أدوار مؤقتة', description: 'Grant temporary role access', descriptionAr: 'منح وصول مؤقت للأدوار', category: 'roles' },
    
    // Alert permissions
    { key: 'alerts:manage', displayName: 'Manage Alerts', displayNameAr: 'إدارة التنبيهات', description: 'Create, edit, delete alerts', descriptionAr: 'إنشاء وتعديل وحذف التنبيهات', category: 'alerts' },
    
    // Audit Log permissions
    { key: 'audit:view', displayName: 'View Audit Logs', displayNameAr: 'عرض سجلات التدقيق', description: 'Access audit trail', descriptionAr: 'الوصول لسجل التدقيق', category: 'audit' },
  ];

  const createdPermissions = await db.insert(permissions).values(permissionsList).returning();
  console.log(`✅ Created ${createdPermissions.length} permissions`);

  // Create a map of permission keys to IDs
  const permissionMap = new Map(createdPermissions.map(p => [p.key, p.id]));

  // Create roles
  const rolesList = [
    { 
      id: '1',
      name: 'owner', 
      displayName: 'Owner', 
      displayNameAr: 'المالك', 
      description: 'Full system access with all permissions',
      descriptionAr: 'وصول كامل للنظام مع جميع الصلاحيات',
      isSystem: 1 
    },
    { 
      id: '2',
      name: 'admin', 
      displayName: 'Admin', 
      displayNameAr: 'المسؤول', 
      description: 'Administrative access with most permissions',
      descriptionAr: 'وصول إداري مع معظم الصلاحيات',
      isSystem: 1 
    },
    { 
      id: '3',
      name: 'advanced_analyst', 
      displayName: 'Advanced Analyst', 
      displayNameAr: 'محلل متقدم', 
      description: 'Advanced analytics and data access',
      descriptionAr: 'تحليلات متقدمة ووصول للبيانات',
      isSystem: 1 
    },
    { 
      id: '4',
      name: 'basic_analyst', 
      displayName: 'Basic Analyst', 
      displayNameAr: 'محلل أساسي', 
      description: 'Basic analytics access',
      descriptionAr: 'وصول للتحليلات الأساسية',
      isSystem: 1 
    },
    { 
      id: '5',
      name: 'data_entry', 
      displayName: 'Data Entry', 
      displayNameAr: 'إدخال البيانات', 
      description: 'Can create and edit data',
      descriptionAr: 'يمكنه إنشاء وتعديل البيانات',
      isSystem: 1 
    },
    { 
      id: '6',
      name: 'viewer', 
      displayName: 'Viewer', 
      displayNameAr: 'مشاهد', 
      description: 'Read-only access',
      descriptionAr: 'وصول للقراءة فقط',
      isSystem: 1 
    },
  ];

  const createdRoles = await db.insert(roles).values(rolesList).returning();
  console.log(`✅ Created ${createdRoles.length} roles`);

  // Assign permissions to roles
  const rolePermissionsList = [];

  // Owner - ALL permissions
  createdPermissions.forEach(permission => {
    rolePermissionsList.push({
      roleId: '1',
      permissionId: permission.id,
    });
  });

  // Admin - Most permissions (exclude impersonation and some system)
  const adminPermissions = createdPermissions.filter(p => 
    p.key !== 'users:impersonate' && p.key !== 'system:full_access'
  );
  adminPermissions.forEach(permission => {
    rolePermissionsList.push({
      roleId: '2',
      permissionId: permission.id,
    });
  });

  // Advanced Analyst - Data access, analytics, view permissions
  const advancedAnalystPerms = createdPermissions.filter(p => 
    p.category === 'data_access' || 
    p.category === 'analytics' ||
    p.key === 'export:create'
  );
  advancedAnalystPerms.forEach(permission => {
    rolePermissionsList.push({
      roleId: '3',
      permissionId: permission.id,
    });
  });

  // Basic Analyst - Limited data access
  const basicAnalystPerms = createdPermissions.filter(p => 
    p.key === 'data:view_percentages'
  );
  basicAnalystPerms.forEach(permission => {
    rolePermissionsList.push({
      roleId: '4',
      permissionId: permission.id,
    });
  });

  // Data Entry - Create and edit permissions
  const dataEntryPerms = createdPermissions.filter(p => 
    ['investments:create', 'investments:edit', 'cashflows:create', 'cashflows:edit', 'cash:create', 'cash:edit'].includes(p.key)
  );
  dataEntryPerms.forEach(permission => {
    rolePermissionsList.push({
      roleId: '5',
      permissionId: permission.id,
    });
  });

  // Viewer - No special permissions (only inherent view access)

  await db.insert(rolePermissions).values(rolePermissionsList);
  console.log(`✅ Assigned ${rolePermissionsList.length} permissions to roles`);

  // Create default owner user
  const passwordHash = await hashPassword('admin123');
  const [defaultUser] = await db.insert(users).values({
    name: 'A.Z Finance Admin',
    email: 'admin@azfinance.sa',
    passwordHash,
    roleId: '1', // Owner role
    isActive: 1,
    createdBy: null,
  }).returning();

  console.log(`✅ Created default owner user: ${defaultUser.email}`);

  // Create default settings for the owner
  await db.insert(userSettings).values({
    userId: defaultUser.id,
    theme: 'dark',
    language: 'en',
    viewMode: 'classic',
    fontSize: 'medium',
    autoReinvest: 0,
    currency: 'SAR',
    notifyUpcoming: 1,
    notifyLate: 1,
    alertDaysBefore: 3,
  });

  console.log("✅ Roles, permissions, and default user seeded successfully");
  console.log("\n📝 Default Login Credentials:");
  console.log("   Email: admin@azfinance.sa");
  console.log("   Password: admin123");
  console.log("\n⚠️  Please change the default password after first login!\n");
}

seedRolesAndPermissions().catch((error) => {
  console.error("Error seeding roles and permissions:", error);
  process.exit(1);
});
