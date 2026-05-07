process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret';
process.env.DATABASE_URL ??= 'postgres://muvit:muvit@localhost:5432/muvit_test';
process.env.WEB_URL ??= 'http://localhost:3000';
