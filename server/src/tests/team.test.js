import '../tests/setup.js';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as teamService from '../services/team.service.js';
import * as teamRepository from '../repositories/team.repository.js';
import Team from '../models/team.model.js';
import Department from '../models/department.model.js';

describe('Team Tenant Isolation', () => {
  describe('Service Layer Isolation', () => {
    it('should block fetching a team not belonging to the tenant (IDOR prevention)', async () => {
      mock.method(Team, 'findOne', () => {
        return {
          populate: () => ({
            populate: () => ({
              exec: async () => null
            })
          })
        };
      });

      await assert.rejects(
        () => teamService.getTeamById('team1', 'org2'),
        { statusCode: 404, message: 'Team not found' }
      );

      mock.restoreAll();
    });
  });

  describe('Repository Layer Isolation', () => {
    it('should inject organizationId into findOne query', async () => {
      let queryPassed = null;
      mock.method(Team, 'findOne', (query) => {
        queryPassed = query;
        return {
          populate: () => ({
            populate: () => ({
              exec: async () => ({ id: 'team1' })
            })
          })
        };
      });

      await teamRepository.findByIdAndOrganization('team1', 'tenant123');

      assert.ok(queryPassed);
      assert.equal(queryPassed.organizationId, 'tenant123', 'organizationId must be injected into the query');
      assert.equal(queryPassed._id, 'team1');

      mock.restoreAll();
    });
  });

  describe('Service Business Rules', () => {
    it('should validate department belongs to the same organization when creating a team', async () => {
      // Department not found for this tenant -> should reject
      mock.method(Department, 'findOne', () => {
        return {
          populate: () => ({
            exec: async () => null // Department doesn't belong to this tenant
          })
        };
      });

      await assert.rejects(
        () => teamService.createTeam('org1', { departmentId: 'dept_other_org', name: 'Alpha' }),
        { statusCode: 404, message: 'Department not found' }
      );

      mock.restoreAll();
    });

    it('should handle duplicate team name conflict within same department', async () => {
      // Department exists for this tenant
      mock.method(Department, 'findOne', () => {
        return {
          populate: () => ({
            exec: async () => ({ _id: 'dept1', organizationId: 'org1', name: 'Engineering' })
          })
        };
      });

      // Team creation fails with duplicate key
      mock.method(Team, 'create', async () => {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      });

      await assert.rejects(
        () => teamService.createTeam('org1', { departmentId: 'dept1', name: 'Alpha' }),
        { statusCode: 409 }
      );

      mock.restoreAll();
    });
  });
});
