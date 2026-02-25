# Test Account Setup Guide

This guide provides step-by-step instructions for setting up test accounts in your development environment.

## Prerequisites

- Node.js 16+ installed
- Access to your development database
- Git repository cloned locally
- Environment variables configured

## Setup Steps

### 1. Environment Configuration

Create a `.env.test` file in your project root with the following variables:

```env
DATABASE_URL=your_test_database_connection_string
TEST_ACCOUNTS_ENABLED=true
NODE_ENV=test
```

### 2. Initialize Test Accounts

Run the seed script to initialize test accounts:

```bash
npx ts-node seed.ts
```

Or if using npm scripts:

```bash
npm run seed
```

### 3. Verify Setup

Check that test accounts were created successfully:

```bash
npm run test:verify-accounts
```

You should see confirmation that all test accounts are properly initialized.

## Test Accounts Available

The following test accounts will be created:

| Account | Role | Purpose |
|---------|------|---------|
| `test.admin` | Administrator | Full system access for testing admin features |
| `test.user` | Standard User | Regular user for functional testing |
| `test.moderator` | Moderator | Content moderation testing |
| `test.readonly` | Read-Only | Permission and access control testing |

## Database Reset

To reset test accounts and start fresh:

```bash
npm run seed:reset
```

This will:
1. Clear existing test account data
2. Re-initialize fresh test accounts
3. Verify all accounts are properly set up

## Troubleshooting

### Accounts Not Created
- Verify DATABASE_URL environment variable is set
- Check database connection and permissions
- Ensure test database is running and accessible

### Connection Errors
- Verify NODE_ENV=test is set
- Check that test database port is accessible
- Confirm credentials in .env.test

### Permission Denied
- Ensure database user has appropriate CREATE/DROP permissions
- Check that the user can write to the test database

## Security Notes

- Never commit `.env.test` with real database credentials
- Use a dedicated test database, not production
- Rotate test credentials periodically
- Clear test accounts after running tests in CI/CD pipelines

## Next Steps

1. Review TEST_ACCOUNTS.md for detailed account information
2. Check TEST_CREDENTIALS_QUICK_REFERENCE.txt for login details
3. Start development with authenticated test accounts
