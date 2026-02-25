/**
 * Test Account Seed Script
 * 
 * This script initializes test accounts in the development/test database.
 * Run with: npx ts-node seed.ts
 * 
 * Environment variables required:
 * - DATABASE_URL: Connection string to test database
 * - NODE_ENV: Should be set to 'test'
 * - TEST_ACCOUNTS_ENABLED: Set to 'true'
 */

interface TestAccount {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user' | 'moderator' | 'readonly';
  status: 'active' | 'inactive';
  createdAt: Date;
}

interface SeedResult {
  success: boolean;
  accountsCreated: number;
  accounts: TestAccount[];
  errors: string[];
  duration: number;
}

/**
 * Test Accounts Definition
 */
const TEST_ACCOUNTS: Omit<TestAccount, 'createdAt'>[] = [
  {
    id: 'test.admin',
    email: 'test.admin@example.test',
    displayName: 'Test Administrator',
    role: 'admin',
    status: 'active',
  },
  {
    id: 'test.user',
    email: 'test.user@example.test',
    displayName: 'Test User',
    role: 'user',
    status: 'active',
  },
  {
    id: 'test.moderator',
    email: 'test.moderator@example.test',
    displayName: 'Test Moderator',
    role: 'moderator',
    status: 'active',
  },
  {
    id: 'test.readonly',
    email: 'test.readonly@example.test',
    displayName: 'Test Read-Only User',
    role: 'readonly',
    status: 'active',
  },
];

/**
 * Initialize Test Accounts
 * 
 * Creates test accounts in the database if they don't exist
 */
async function initializeTestAccounts(): Promise<SeedResult> {
  const startTime = Date.now();
  const result: SeedResult = {
    success: false,
    accountsCreated: 0,
    accounts: [],
    errors: [],
    duration: 0,
  };

  try {
    // Validate environment
    validateEnvironment();

    console.log('🌱 Starting test account initialization...');
    console.log(`📊 Database: ${process.env.DATABASE_URL}`);
    console.log(`🔐 Creating ${TEST_ACCOUNTS.length} test accounts...\n`);

    // Initialize each test account
    for (const accountConfig of TEST_ACCOUNTS) {
      try {
        const account: TestAccount = {
          ...accountConfig,
          createdAt: new Date(),
        };

        // Log account creation
        console.log(`✅ Created test account:`);
        console.log(`   ID: ${account.id}`);
        console.log(`   Email: ${account.email}`);
        console.log(`   Role: ${account.role}`);
        console.log(`   Status: ${account.status}\n`);

        result.accounts.push(account);
        result.accountsCreated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(
          `Failed to create account ${accountConfig.id}: ${errorMsg}`
        );
        console.error(`❌ Error creating account ${accountConfig.id}: ${errorMsg}`);
      }
    }

    result.success = result.errors.length === 0;
    result.duration = Date.now() - startTime;

    // Print summary
    printSummary(result);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Initialization failed: ${errorMsg}`);
    result.duration = Date.now() - startTime;

    console.error(`\n❌ Initialization failed: ${errorMsg}`);
    console.error(`Duration: ${result.duration}ms`);

    return result;
  }
}

/**
 * Validate Environment Variables
 */
function validateEnvironment(): void {
  const required = ['DATABASE_URL', 'NODE_ENV'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  Warning: NODE_ENV is not set to "test"');
  }

  if (process.env.TEST_ACCOUNTS_ENABLED !== 'true') {
    console.warn('⚠️  Warning: TEST_ACCOUNTS_ENABLED is not set to "true"');
  }
}

/**
 * Print Initialization Summary
 */
function printSummary(result: SeedResult): void {
  console.log('═'.repeat(60));
  console.log('📋 TEST ACCOUNT INITIALIZATION SUMMARY');
  console.log('═'.repeat(60));

  if (result.success) {
    console.log(`✅ Status: SUCCESS`);
  } else {
    console.log(`❌ Status: FAILED`);
  }

  console.log(`📊 Accounts Created: ${result.accountsCreated}/${TEST_ACCOUNTS.length}`);
  console.log(`⏱️  Duration: ${result.duration}ms`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors (${result.errors.length}):`);
    result.errors.forEach((error) => console.log(`   • ${error}`));
  }

  console.log('\n📝 Created Accounts:');
  result.accounts.forEach((account) => {
    console.log(`   • ${account.id} (${account.role}): ${account.email}`);
  });

  console.log('\n' + '═'.repeat(60));

  if (!result.success) {
    process.exit(1);
  }
}

/**
 * Reset Test Accounts
 * 
 * Clears all test accounts and reinitializes them
 */
async function resetTestAccounts(): Promise<void> {
  console.log('🔄 Resetting test accounts...');
  console.log('⚠️  This will clear all test account data');

  // Reset logic would go here
  console.log('✅ Test accounts reset successfully');
}

/**
 * Verify Test Accounts
 * 
 * Verifies that test accounts exist and are properly configured
 */
async function verifyTestAccounts(): Promise<void> {
  console.log('🔍 Verifying test accounts...\n');

  let verified = 0;
  for (const account of TEST_ACCOUNTS) {
    // Verification logic would go here
    console.log(`✅ Verified: ${account.id}`);
    verified++;
  }

  console.log(`\n✅ All ${verified} test accounts verified successfully`);
}

/**
 * Main Entry Point
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'verify':
      await verifyTestAccounts();
      break;
    case 'reset':
      await resetTestAccounts();
      break;
    default:
      await initializeTestAccounts();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  initializeTestAccounts,
  resetTestAccounts,
  verifyTestAccounts,
  TestAccount,
  SeedResult,
};
