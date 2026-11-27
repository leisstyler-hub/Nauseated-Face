import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('admin proxy accepts only the two email verification OTP routes',()=>{
 const route=readFileSync(new URL('../src/app/api/auth/neon/[...path]/route.ts',import.meta.url),'utf8');
 assert.ok(route.includes("'email-otp/verify-email'"));
 assert.ok(route.includes("'email-otp/send-verification-otp'"));
 assert.ok(!route.includes("'sign-in/email-otp'"));
});
