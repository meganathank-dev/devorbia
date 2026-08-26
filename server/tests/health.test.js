const request = require('supertest');
const app = require('../src/app');

describe('GET /api/v1/health', () => {
  it('should return 200 and health status', async () => {
    const response = await request(app).get('/api/v1/health');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('UP');
    expect(response.body.data).toHaveProperty('environment');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('database');
  });
});
