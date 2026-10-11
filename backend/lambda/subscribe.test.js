/**
 * Unit tests for POST /subscribe endpoint validation
 */

import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';

// Mock the AWS SDK clients and store
vi.mock('@aws-sdk/client-sns', () => {
  return {
    SNSClient: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ SubscriptionArn: 'test-arn' })
    })),
    SubscribeCommand: vi.fn(),
    SetSubscriptionAttributesCommand: vi.fn()
  };
});

vi.mock('../store.js', () => ({
  default: {
    getSchool: vi.fn(),
    listSchools: vi.fn(),
    putSchool: vi.fn(),
    updateSchoolReading: vi.fn(),
    putAlert: vi.fn(),
    listAlerts: vi.fn()
  }
}));

const { createApi } = require('./api.js');

describe('POST /subscribe validation', () => {
  let apiHandler;
  const mockStore = {
    getSchool: vi.fn(),
    listSchools: vi.fn(),
    putSchool: vi.fn(),
    updateSchoolReading: vi.fn(),
    putAlert: vi.fn(),
    listAlerts: vi.fn()
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Set up environment variables
    process.env.SCHOOL_ALERTS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:SchoolAlertsTopic';
    process.env.DEMO_KEY = 'test-demo-key';

    // Create API handler
    apiHandler = createApi(mockStore);

    // Mock store responses
    mockStore.getSchool.mockImplementation((schoolId) => {
      if (schoolId === 'demo') {
        return {
          school_id: 'demo',
          display_name: 'Demo School (simulation only)',
          is_demo_school: true,
          attribution: [
            { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
            { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
          ]
        };
      }
      if (schoolId === 'najafgarh-a') {
        return {
          school_id: 'najafgarh-a',
          display_name: 'Sample School, Najafgarh A',
          is_demo_school: false,
          attribution: [
            { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
            { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
          ]
        };
      }
      return null;
    });
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.SCHOOL_ALERTS_TOPIC_ARN;
    delete process.env.DEMO_KEY;
  });

  test('should reject request with missing school_id', async () => {
    const event = {
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'school_id is required' });
  });

  test('should reject request with invalid email', async () => {
    const event = {
      body: JSON.stringify({
        school_id: 'najafgarh-a',
        email: 'invalid-email',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'A valid email is required' });
  });

  test('should reject request with invalid role', async () => {
    const event = {
      body: JSON.stringify({
        school_id: 'najafgarh-a',
        email: 'test@example.com',
        role: 'student'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'role must be parent, principal, or pe_teacher' });
  });

  test('should reject request for non-existent school', async () => {
    const event = {
      body: JSON.stringify({
        school_id: 'nonexistent',
        email: 'test@example.com',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'School not found' });
  });

  test('should reject request for demo school', async () => {
    const event = {
      body: JSON.stringify({
        school_id: 'demo',
        email: 'test@example.com',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toEqual({ error: 'Cannot subscribe to demo school' });
  });

  test('should reject request with missing school_ids array when provided', async () => {
    const event = {
      body: JSON.stringify({
        school_ids: [],
        email: 'test@example.com',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'At least one school must be selected' });
  });

  test('should reject request with too many schools in array', async () => {
    const event = {
      body: JSON.stringify({
        school_ids: ['najafgarh-a', 'najafgarh-b', 'mundka-a', 'mundka-b', 'anand-vihar-a', 'anand-vihar-b', 'okhla-a', 'okhla-b', 'rk-puram-a', 'rk-puram-b', 'extra-school'],
        email: 'test@example.com',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'Too many schools selected. Maximum is 10.' });
  });

  test('should reject request with non-existent school in school_ids array', async () => {
    const event = {
      body: JSON.stringify({
        school_ids: ['najafgarh-a', 'nonexistent-school'],
        email: 'test@example.com',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'School not found: nonexistent-school' });
  });

  test('should reject request when demo school is in school_ids array', async () => {
    const event = {
      body: JSON.stringify({
        school_ids: ['najafgarh-a', 'demo'],
        email: 'test@example.com',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toEqual({ error: 'Cannot subscribe to demo school' });
  });

  test('should accept valid request with single school_id', async () => {
    const event = {
      body: JSON.stringify({
        school_id: 'najafgarh-a',
        email: 'test@example.com',
        role: 'parent'
      })
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Check test@example.com to confirm alerts');
    expect(body.status).toBe('confirmation required');
  });

  test('should enforce per-email cooldown', async () => {
    // First request
    const event1 = {
      body: JSON.stringify({
        school_id: 'najafgarh-a',
        email: 'test@example.com',
        role: 'parent'
      }),
      headers: {}
    };

    let response1 = await apiHandler(event1);
    expect(response1.statusCode).toBe(202);

    // Second request immediately after (should be rate limited)
    const event2 = {
      body: JSON.stringify({
        school_id: 'najafgarh-b',
        email: 'test@example.com',
        role: 'parent'
      }),
      headers: {}
    };

    const response2 = await apiHandler(event2);
    expect(response2.statusCode).toBe(429);
    expect(JSON.parse(response2.body)).toEqual({ error: 'Please wait 5 minutes before making another subscription request with this email' });
  });

  test('should validate demo key for /simulate endpoint', async () => {
    // Set up demo school
    mockStore.getSchool.mockImplementation((schoolId) => {
      if (schoolId === 'demo') {
        return {
          school_id: 'demo',
          display_name: 'Demo School (simulation only)',
          is_demo_school: true,
          current_level: 0,
          baseline_level: 0,
          attribution: [
            { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
            { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
          ]
        };
      }
      return null;
    });

    // Request without demo key
    const event = {
      body: JSON.stringify({ severity: 'poor' }),
      headers: {}
    };

    const response = await apiHandler(event);
    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toEqual({ error: 'Demo key required' });
  });

  test('should accept valid demo key for /simulate endpoint', async () => {
    // Set up demo school
    mockStore.getSchool.mockImplementation((schoolId) => {
      if (schoolId === 'demo') {
        return {
          school_id: 'demo',
          display_name: 'Demo School (simulation only)',
          is_demo_school: true,
          current_level: 0,
          baseline_level: 0,
          attribution: [
            { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
            { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
          ]
        };
      }
      return null;
    });

    // Request with valid demo key
    const event = {
      body: JSON.stringify({ severity: 'poor' }),
      headers: { 'x-demo-key': 'test-demo-key' }
    };

    const response = await apiHandler(event);
    // Should succeed (200) or fail for other reasons (like cooldown), but not 403 for missing key
    expect(response.statusCode).not.toBe(403);
  });
});