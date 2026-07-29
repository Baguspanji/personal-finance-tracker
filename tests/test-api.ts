import { dbConfig } from '../database/config';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

let authToken = '';

async function runApiTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING API ENDPOINT AUTOMATED TESTS');
  console.log(`🎯 Target Base URL: ${BASE_URL}`);
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  async function assertTest(
    name: string,
    fn: () => Promise<boolean>
  ) {
    try {
      const success = await fn();
      if (success) {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      } else {
        console.log(`  ❌ [FAIL] ${name}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ [ERROR] ${name}: ${(err as Error).message}`);
      failed++;
    }
  }

  // 1. LOGIN TEST
  await assertTest('POST /api/login (Valid credentials)', async () => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@finance.com',
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.token && data.user) {
      authToken = data.token;
      return true;
    }
    console.error('     Response:', data);
    return false;
  });

  await assertTest('POST /api/login (Invalid credentials - should fail)', async () => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@finance.com',
        password: 'wrongpassword',
      }),
    });
    return res.status === 401;
  });

  // 2. AUTH CHECK (/api/me)
  await assertTest('GET /api/me (With Bearer Token)', async () => {
    const res = await fetch(`${BASE_URL}/api/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const data = await res.json();
    return res.status === 200 && data.email === 'user@finance.com';
  });

  await assertTest('GET /api/me (Without token - should fail 401)', async () => {
    const res = await fetch(`${BASE_URL}/api/me`);
    return res.status === 401;
  });

  // 3. DASHBOARD SUMMARY
  await assertTest('GET /api/dashboard', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return (
      res.status === 200 &&
      typeof data.saldo === 'number' &&
      typeof data.pemasukanBulanIni === 'number'
    );
  });

  // 4. PAYMENT METHODS
  await assertTest('GET /api/payment-methods', async () => {
    const res = await fetch(`${BASE_URL}/api/payment-methods`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return res.status === 200 && Array.isArray(data) && data.length > 0;
  });

  // 5. CATEGORIES CRUD
  let testCategoryId = '';
  await assertTest('GET /api/categories', async () => {
    const res = await fetch(`${BASE_URL}/api/categories`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return res.status === 200 && Array.isArray(data);
  });

  await assertTest('POST /api/categories (Create new category)', async () => {
    const res = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Kategori Testing Uji API',
        type: 'expense',
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.id) {
      testCategoryId = data.id;
      return true;
    }
    return false;
  });

  await assertTest('PUT /api/categories/:id (Update category)', async () => {
    if (!testCategoryId) return false;
    const res = await fetch(`${BASE_URL}/api/categories/${testCategoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Kategori Testing Updated',
        type: 'expense',
      }),
    });
    const data = await res.json();
    return res.status === 200 && data.name === 'Kategori Testing Updated';
  });

  // 6. TRANSACTIONS CRUD
  let testTransactionId = '';
  await assertTest('GET /api/transactions', async () => {
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return res.status === 200 && Array.isArray(data);
  });

  await assertTest('POST /api/transactions (Create transaction)', async () => {
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        category_id: testCategoryId || 'cat_exp_1',
        payment_method_id: 'pm_1',
        transaction_type: 'expense',
        amount: 50000,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: 'Catatan Pengujian API',
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.id) {
      testTransactionId = data.id;
      return true;
    }
    return false;
  });

  await assertTest('GET /api/transactions/:id (Get single transaction)', async () => {
    if (!testTransactionId) return false;
    const res = await fetch(`${BASE_URL}/api/transactions/${testTransactionId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return res.status === 200 && data.id === testTransactionId;
  });

  await assertTest('DELETE /api/transactions/:id (Delete transaction)', async () => {
    if (!testTransactionId) return false;
    const res = await fetch(`${BASE_URL}/api/transactions/${testTransactionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return res.status === 200 && data.success === true;
  });

  await assertTest('DELETE /api/categories/:id (Delete created category)', async () => {
    if (!testCategoryId) return false;
    const res = await fetch(`${BASE_URL}/api/categories/${testCategoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return res.status === 200 && data.success === true;
  });

  // 7. LOGOUT
  await assertTest('POST /api/logout', async () => {
    const res = await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
    });
    const data = await res.json();
    return res.status === 200 && data.message === 'Berhasil logout';
  });

  console.log('\n==================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApiTests();
