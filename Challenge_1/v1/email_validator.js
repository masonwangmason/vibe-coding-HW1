/**
 * Validates email addresses using regex pattern matching
 * Handles plus addressing, subdomains, and various TLDs
 */
function validateEmail(email) {
  // Comprehensive email regex pattern
  const emailRegex = /^[a-zA-Z0-9._+%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Trim whitespace
  email = email.trim();
  
  // Check basic format
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Additional validations
  const [local, domain] = email.split('@');
  
  // Local part shouldn't start or end with a dot
  if (local.startsWith('.') || local.endsWith('.')) {
    return false;
  }
  
  // No consecutive dots in local part
  if (local.includes('..')) {
    return false;
  }
  
  // Domain shouldn't start or end with a hyphen or dot
  if (domain.startsWith('-') || domain.endsWith('-') || 
      domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }
  
  // Check length constraints
  if (local.length > 64 || domain.length > 255) {
    return false;
  }
  
  return true;
}

// Test cases
console.log('=== Valid Email Addresses ===');
const validEmails = [
  'user@example.com',
  'john.doe@company.co.uk',
  'alice+newsletter@subdomain.example.com',
  'test_user123@mail-server.org',
  'admin@localhost.localdomain',
  'user%test@example.com',
  'first.last+tag@sub.domain.com'
];

validEmails.forEach(email => {
  console.log(`${email}: ${validateEmail(email) ? '✓ Valid' : '✗ Invalid'}`);
});

console.log('\n=== Invalid Email Addresses ===');
const invalidEmails = [
  'notanemail',
  '@example.com',
  'user@',
  'user..name@example.com',
  '.user@example.com',
  'user.@example.com',
  'user@.example.com',
  'user@example',
  'user name@example.com',
  'user@exam ple.com',
  'user@@example.com',
  ''
];

invalidEmails.forEach(email => {
  console.log(`${email || '(empty)'}: ${validateEmail(email) ? '✓ Valid' : '✗ Invalid'}`);
});

// Edge cases with plus addressing
console.log('\n=== Plus Addressing (Gmail-style) ===');
const plusAddressing = [
  'john+work@gmail.com',
  'jane+shopping+deals@example.org',
  'user+test123@company.co'
];

plusAddressing.forEach(email => {
  console.log(`${email}: ${validateEmail(email) ? '✓ Valid' : '✗ Invalid'}`);
});

// Subdomain test cases
console.log('\n=== Subdomain Variations ===');
const subdomains = [
  'user@mail.example.com',
  'admin@dev.staging.company.io',
  'test@a.b.c.d.example.net'
];

subdomains.forEach(email => {
  console.log(`${email}: ${validateEmail(email) ? '✓ Valid' : '✗ Invalid'}`);
});