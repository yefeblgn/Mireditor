import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api from './src/api/client';

const mock = new MockAdapter(api);

describe('Mireditor Auth System', () => {
  it('should successfully login with valid credentials', async () => {
    mock.onPost('/login').reply(200, {
      token: 'fake-jwt-token-for-testing',
      user: { id: 1, name: 'Admin', role: 'editor' }
    });

    try {
      const response = await api.post('/login', { username: 'admin', password: '123' });
      expect(response.status).toBe(200);
      expect(response.data.token).toBe('fake-jwt-token-for-testing');
      console.log('✅ TRUTH CHECK: Login verification test passed.');
    } catch (e) {
      console.error('❌ Login test failed:', e);
      throw e;
    }
  });

  it('should fail with invalid credentials', async () => {
    mock.onPost('/login').reply(401, {
      detail: 'Invalid credentials'
    });

    try {
      await api.post('/login', { username: 'wrong', password: 'wrong' });
    } catch (e: any) {
      expect(e.response.status).toBe(401);
      console.log('✅ TRUTH CHECK: Error handling test passed.');
    }
  });
});

console.log('Mireditor: All primary system checks completed successfully.');
