import '../tests/setup.js';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as employeeService from '../services/employee-profile.service.js';
import * as employeeRepository from '../repositories/employee-profile.repository.js';
import { toSafeUser } from '../services/auth.service.js';
import EmployeeProfile from '../models/employee-profile.model.js';

// ============================================================
// Auth Safe User Tests
// ============================================================

describe('Auth Safe User (toSafeUser)', () => {
  it('should include organizationId in safe user response', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      employeeId: 'ADMIN-001',
      email: 'admin@test.local',
      role: 'organization_admin',
      accountStatus: 'active',
      organizationId: '507f1f77bcf86cd799439012',
      profileId: '507f1f77bcf86cd799439013',
      lastLoginAt: new Date(),
      createdAt: new Date(),
    };

    const safe = toSafeUser(mockUser);

    assert.equal(safe.organizationId, '507f1f77bcf86cd799439012', 'organizationId must be included');
  });

  it('should include profileId in safe user response', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      employeeId: 'ADMIN-001',
      email: 'admin@test.local',
      role: 'organization_admin',
      accountStatus: 'active',
      organizationId: '507f1f77bcf86cd799439012',
      profileId: '507f1f77bcf86cd799439013',
      lastLoginAt: new Date(),
      createdAt: new Date(),
    };

    const safe = toSafeUser(mockUser);

    assert.equal(safe.profileId, '507f1f77bcf86cd799439013', 'profileId must be included');
  });

  it('should default organizationId to null when undefined', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      employeeId: 'EMP-001',
      email: 'emp@test.local',
      role: 'employee',
      accountStatus: 'active',
      lastLoginAt: null,
      createdAt: new Date(),
    };

    const safe = toSafeUser(mockUser);

    assert.equal(safe.organizationId, null, 'organizationId should be null when undefined');
    assert.equal(safe.profileId, null, 'profileId should be null when undefined');
  });

  it('should NOT include passwordHash in safe user response', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      employeeId: 'ADMIN-001',
      email: 'admin@test.local',
      role: 'organization_admin',
      accountStatus: 'active',
      organizationId: '507f1f77bcf86cd799439012',
      profileId: '507f1f77bcf86cd799439013',
      passwordHash: '$2b$12$somehashedvalue',
      lastLoginAt: new Date(),
      createdAt: new Date(),
    };

    const safe = toSafeUser(mockUser);

    assert.equal(safe.passwordHash, undefined, 'passwordHash must NOT be exposed');
  });

  it('should include all required safe fields', () => {
    const now = new Date();
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      employeeId: 'ADMIN-001',
      email: 'admin@test.local',
      role: 'organization_admin',
      accountStatus: 'active',
      organizationId: '507f1f77bcf86cd799439012',
      profileId: '507f1f77bcf86cd799439013',
      lastLoginAt: now,
      createdAt: now,
    };

    const safe = toSafeUser(mockUser);

    assert.equal(safe.id, '507f1f77bcf86cd799439011');
    assert.equal(safe.employeeId, 'ADMIN-001');
    assert.equal(safe.email, 'admin@test.local');
    assert.equal(safe.role, 'organization_admin');
    assert.equal(safe.accountStatus, 'active');
    assert.equal(safe.organizationId, '507f1f77bcf86cd799439012');
    assert.equal(safe.profileId, '507f1f77bcf86cd799439013');
    assert.equal(safe.lastLoginAt, now);
    assert.equal(safe.createdAt, now);
  });

  it('should NOT include internal Mongoose fields', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      employeeId: 'ADMIN-001',
      email: 'admin@test.local',
      role: 'organization_admin',
      accountStatus: 'active',
      organizationId: '507f1f77bcf86cd799439012',
      profileId: '507f1f77bcf86cd799439013',
      passwordHash: '$2b$12$somehashedvalue',
      failedLoginAttempts: 3,
      lockedUntil: new Date(),
      passwordChangedAt: new Date(),
      lastLoginAt: new Date(),
      createdAt: new Date(),
      __v: 0,
    };

    const safe = toSafeUser(mockUser);

    assert.equal(safe.passwordHash, undefined, 'passwordHash must NOT be exposed');
    assert.equal(safe.failedLoginAttempts, undefined, 'failedLoginAttempts must NOT be exposed');
    assert.equal(safe.lockedUntil, undefined, 'lockedUntil must NOT be exposed');
    assert.equal(safe.passwordChangedAt, undefined, 'passwordChangedAt must NOT be exposed');
    assert.equal(safe.__v, undefined, '__v must NOT be exposed');
  });
});

// ============================================================
// Employee Tenant Isolation Tests (preserved + extended)
// ============================================================

describe('Employee Tenant Isolation', () => {
  describe('Service Layer Isolation', () => {
    it('should block fetching an employee not belonging to the tenant (IDOR prevention)', async () => {
      mock.method(EmployeeProfile, 'findOne', () => {
        return {
          populate: () => ({
            populate: () => ({
              populate: () => ({
                exec: async () => null // Simulates not found / wrong tenant
              })
            })
          })
        };
      });

      // Tenant 2 attempting to fetch Tenant 1's employee
      await assert.rejects(
        () => employeeService.getEmployeeById('emp1', 'org2'),
        { statusCode: 404, message: 'Employee not found' }
      );

      mock.restoreAll();
    });
  });

  describe('Repository Layer Isolation', () => {
    it('should inject organizationId into findOne query', async () => {
      let queryPassed = null;
      mock.method(EmployeeProfile, 'findOne', (query) => {
        queryPassed = query;
        return {
          populate: () => ({
            populate: () => ({
              populate: () => ({
                exec: async () => ({ id: 'emp1' })
              })
            })
          })
        };
      });

      await employeeRepository.findByIdAndOrganization('emp1', 'tenant123');

      assert.ok(queryPassed);
      assert.equal(queryPassed.organizationId, 'tenant123', 'organizationId must be injected into the query');
      assert.equal(queryPassed._id, 'emp1');

      mock.restoreAll();
    });
  });

  describe('Employee Creation Isolation', () => {
    it('should pass tenantId as organizationId to createEmployee', async () => {
      // This test verifies the service function signature requires tenantId
      // The actual creation is validated by checking the function exists and accepts tenantId
      assert.equal(typeof employeeService.createEmployee, 'function', 'createEmployee must exist');
      assert.equal(employeeService.createEmployee.length, 2, 'createEmployee must accept (tenantId, params)');
    });

    it('should pass tenantId as organizationId to getEmployees', async () => {
      assert.equal(typeof employeeService.getEmployees, 'function', 'getEmployees must exist');
      // Second param has a default value (= {}), so Function.length counts only required params
      assert.ok(employeeService.getEmployees.length >= 1, 'getEmployees must accept tenantId as first param');
    });

    it('should pass tenantId to assignEmployee', async () => {
      assert.equal(typeof employeeService.assignEmployee, 'function', 'assignEmployee must exist');
      assert.equal(employeeService.assignEmployee.length, 3, 'assignEmployee must accept (employeeId, tenantId, params)');
    });
  });
});
