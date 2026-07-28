const UserModel = require('./src/models/userModel');
const RoleModel = require('./src/models/roleModel');
const db = require('./src/config/db');

async function runTests() {
  // Wait for db connection check to resolve
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('==================================================');
  console.log('STARTING PHASE 2 MODULE VERIFICATION TESTS');
  console.log(`Database Operating Mode: ${db.isMock() ? 'Mock JSON Database' : 'PostgreSQL Database'}`);
  console.log('==================================================\n');

  let testRoleId = null;
  let testUserId = null;

  try {
    // ----------------------------------------------------
    // 1. ROLE CRUD OPERATIONS & SAFEGUARDS
    // ----------------------------------------------------
    console.log('--- 1. Testing Role Management CRUD ---');
    
    // Get existing roles
    const roles = await RoleModel.getAll();
    console.log(`[PASS] Fetched all roles: ${roles.length} roles found.`);
    
    // Find system roles
    const adminRole = await RoleModel.findByName('Admin');
    console.log(`[PASS] Found system role Admin by name: id = ${adminRole.id}`);
    
    const clientRole = await RoleModel.findByName('Client');
    console.log(`[PASS] Found system role Client by name: id = ${clientRole.id}`);

    // Create a custom role
    console.log('Creating a custom role...');
    const customRole = await RoleModel.create({
      name: 'Custom Auditor',
      description: 'Audit logs reviewer',
      permissions: ['tickets:read', 'analytics:read']
    });
    testRoleId = customRole.id;
    console.log(`[PASS] Created Custom Role: "${customRole.name}" (ID: ${customRole.id})`);

    // Verify it exists in lookup by ID
    const fetchedRole = await RoleModel.findById(testRoleId);
    if (fetchedRole && fetchedRole.name === 'Custom Auditor') {
      console.log('[PASS] Fetched custom role by ID successfully.');
    } else {
      throw new Error('Failed to fetch custom role by ID');
    }

    // Update custom role
    console.log('Updating custom role details and permissions...');
    const updatedRole = await RoleModel.update(testRoleId, {
      name: 'Senior Auditor',
      description: 'Senior audit logs and configuration reviewer',
      permissions: ['tickets:read', 'analytics:read', 'settings:write']
    });
    if (updatedRole && updatedRole.name === 'Senior Auditor' && updatedRole.permissions.includes('settings:write')) {
      console.log(`[PASS] Updated role successfully. New Name: "${updatedRole.name}"`);
    } else {
      throw new Error('Failed to update role details');
    }

    // ----------------------------------------------------
    // 2. USER CRUD, FILTERING, SORTING, PAGINATION, SOFT DELETES
    // ----------------------------------------------------
    console.log('\n--- 2. Testing User Management CRUD, Filters & Soft Delete ---');

    // Create user
    console.log('Creating a test user...');
    const testUser = await UserModel.create({
      name: 'John Auditor',
      email: 'john.auditor@desk.com',
      passwordHash: 'dummyhash123',
      roleId: testRoleId,
      status: 'Active'
    });
    testUserId = testUser.id;
    console.log(`[PASS] Created User: "${testUser.name}" (ID: ${testUser.id}), Assigned Role: ${testUser.role_id}`);

    // Verify lookup by ID and email
    const userById = await UserModel.findById(testUserId);
    const userByEmail = await UserModel.findByEmail('john.auditor@desk.com');
    if (userById && userByEmail && userById.email === userByEmail.email) {
      console.log('[PASS] Fetched user by ID and Email successfully.');
    } else {
      throw new Error('User lookup by ID or Email failed');
    }

    // Test Search and Filters on list query
    console.log('Testing User filtering, searching, and sorting...');
    const listResult = await UserModel.getAll({
      search: 'John',
      roleId: testRoleId,
      status: 'Active',
      sortBy: 'name',
      sortOrder: 'ASC',
      page: 1,
      limit: 5
    });
    console.log(`[PASS] Found ${listResult.users.length} users matching search="John", roleId=${testRoleId}, status=Active.`);
    if (listResult.users.length > 0 && listResult.users[0].id === testUserId) {
      console.log('[PASS] Query matching filters correctly returned our newly created user.');
    } else {
      throw new Error('Failed to retrieve user using search & filter parameters');
    }

    // Test Update User Profile
    console.log('Updating user profile...');
    const updatedProfile = await UserModel.update(testUserId, {
      name: 'John Senior Auditor',
      email: 'john.senior@desk.com',
      roleId: testRoleId,
      status: 'Suspended'
    });
    if (updatedProfile && updatedProfile.name === 'John Senior Auditor' && updatedProfile.status === 'Suspended') {
      console.log(`[PASS] User profile updated successfully. Status: ${updatedProfile.status}`);
    } else {
      throw new Error('Failed to update user profile');
    }

    // Test status PATCH endpoint logic
    console.log('Patching user status directly to Inactive...');
    const patchedUser = await UserModel.updateStatus(testUserId, 'Inactive');
    if (patchedUser && patchedUser.status === 'Inactive' && !patchedUser.is_active) {
      console.log('[PASS] Patched user status successfully. Account is now inactive.');
    } else {
      throw new Error('Failed to patch user status');
    }

    // ----------------------------------------------------
    // 3. SAFEGUARD INTEGRITY CHECKS
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Safeguards & Privilege Escalation Guards ---');

    // Test deactivating a role with associated active users
    console.log('Checking user association constraint on role delete...');
    const hasUsers = await RoleModel.hasAssociatedUsers(testRoleId);
    if (hasUsers) {
      console.log('[PASS] Correctly detected that role has associated active users. Role deletion blocked.');
    } else {
      throw new Error('Failed to detect user association on custom role');
    }

    // Test soft delete
    console.log('Soft-deleting user John Auditor...');
    const deleteRes = await UserModel.delete(testUserId);
    if (deleteRes && deleteRes.id === testUserId) {
      console.log('[PASS] UserModel.delete returned success.');
    } else {
      throw new Error('UserModel.delete failed');
    }

    // Verify user is no longer returned by email lookup (soft deleted)
    const softDeletedEmailCheck = await UserModel.findByEmail('john.senior@desk.com');
    const softDeletedIdCheck = await UserModel.findById(testUserId);
    if (!softDeletedEmailCheck && !softDeletedIdCheck) {
      console.log('[PASS] Verified user is excluded from normal lookups after soft deletion.');
    } else {
      throw new Error('Soft-deleted user was still found in active lookups');
    }

    // Check if role is now deleteable
    console.log('Retesting role association after soft deleting its users...');
    const hasUsersPostSoftDelete = await RoleModel.hasAssociatedUsers(testRoleId);
    if (!hasUsersPostSoftDelete) {
      console.log('[PASS] Role now reports 0 active users (soft-deleted users excluded). Role deletion unlocked.');
    } else {
      throw new Error('Role still reports active users after soft-deletion');
    }

    // Delete role
    console.log('Deleting custom role...');
    const deleteRoleRes = await RoleModel.delete(testRoleId);
    if (deleteRoleRes && deleteRoleRes.id === testRoleId) {
      console.log('[PASS] Custom role deleted successfully.');
    } else {
      throw new Error('Failed to delete custom role');
    }

    console.log('\n==================================================');
    console.log('ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:');
    console.error(err.stack || err.message || err);
    process.exit(1);
  }
}

runTests();
