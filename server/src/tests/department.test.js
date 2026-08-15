import '../tests/setup.js';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as departmentService from '../services/department.service.js';
import * as departmentRepository from '../repositories/department.repository.js';
import Department from '../models/department.model.js';

describe('Department Tenant Isolation', () => {
  describe('Service Layer Isolation', () => {
    it('should block fetching a department not belonging to the tenant (IDOR prevention)', async () => {
      mock.method(Department, 'findOne', () => {
        return {
          populate: () => ({
            exec: async () => null // Simulates not found / wrong tenant
          })
        };
      });

      // Tenant 2 attempting to fetch Tenant 1's department
      await assert.rejects(
        () => departmentService.getDepartmentById('dept1', 'org2'),
        { statusCode: 404, message: 'Department not found' }
      );

      mock.restoreAll();
    });
  });

  describe('Repository Layer Isolation', () => {
    it('should inject organizationId into findOne query', async () => {
      let queryPassed = null;
      mock.method(Department, 'findOne', (query) => {
        queryPassed = query;
        return {
          populate: () => ({
            exec: async () => ({ id: 'dept1' })
          })
        };
      });

      await departmentRepository.findByIdAndOrganization('dept1', 'tenant123');

      assert.ok(queryPassed);
      assert.equal(queryPassed.organizationId, 'tenant123', 'organizationId must be injected into the query');
      assert.equal(queryPassed._id, 'dept1');

      mock.restoreAll();
    });

    it('should inject organizationId into find query for listing', async () => {
      let queryPassed = null;
      mock.method(Department, 'find', (query) => {
        queryPassed = query;
        return {
          populate: () => ({
            skip: () => ({
              limit: () => ({
                sort: () => ({
                  exec: async () => []
                })
              })
            })
          })
        };
      });
      mock.method(Department, 'countDocuments', () => {
        return { exec: async () => 0 };
      });

      await departmentRepository.findManyByOrganization('tenant456', {});

      assert.ok(queryPassed);
      assert.equal(queryPassed.organizationId, 'tenant456');

      mock.restoreAll();
    });
  });

  describe('Service Business Rules', () => {
    it('should handle duplicate department name conflict', async () => {
      mock.method(Department, 'create', async () => {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      });

      await assert.rejects(
        () => departmentService.createDepartment('org1', { name: 'Engineering' }),
        { statusCode: 409 }
      );

      mock.restoreAll();
    });
  });
});
