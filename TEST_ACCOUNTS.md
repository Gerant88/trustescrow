# Test Accounts Documentation

This document provides detailed information about all available test accounts for development and testing purposes.

## Account Overview

All test accounts are preconfigured with specific roles, permissions, and data for different testing scenarios.

### Admin Account

**Account ID:** `test.admin`  
**Display Name:** Test Administrator  
**Email:** test.admin@example.test  
**Role:** Administrator  
**Status:** Active  

**Capabilities:**
- Full system access
- User management
- System configuration
- All feature testing
- Database access (test environment)

**Use Cases:**
- Testing administrative features
- User management workflows
- System configuration changes
- Permission and role testing

---

### Standard User Account

**Account ID:** `test.user`  
**Display Name:** Test User  
**Email:** test.user@example.test  
**Role:** Standard User  
**Status:** Active  

**Capabilities:**
- Create and edit own content
- Basic feature access
- Standard user workflows

**Use Cases:**
- Testing core application features
- User workflow testing
- Content creation and editing
- Standard user experience validation

---

### Moderator Account

**Account ID:** `test.moderator`  
**Display Name:** Test Moderator  
**Email:** test.moderator@example.test  
**Role:** Moderator  
**Status:** Active  

**Capabilities:**
- Content review and moderation
- User account flags
- Report handling
- Moderation actions

**Use Cases:**
- Testing moderation features
- Content review workflows
- Report handling procedures
- User management from moderator perspective

---

### Read-Only Account

**Account ID:** `test.readonly`  
**Display Name:** Test Read-Only User  
**Email:** test.readonly@example.test  
**Role:** Read-Only Viewer  
**Status:** Active  

**Capabilities:**
- View-only access
- No edit or delete permissions
- No administrative access

**Use Cases:**
- Permission testing
- Access control validation
- Read-only user workflows
- Feature visibility testing

---

## Account Data

Each test account comes pre-populated with sample data:

### Profiles

- Complete user profiles with contact information
- Profile pictures and metadata
- Account creation and modification timestamps

### Content

- Sample content items for testing
- Various content states (draft, published, archived)
- Ownership and permission associations

### Activity

- Historical activity logs
- Previous interactions and actions
- Transaction records (if applicable)

## Credentials Management

All test account credentials are managed through the seed system and should be rotated regularly.

For quick access to credentials, see `TEST_CREDENTIALS_QUICK_REFERENCE.txt`.

## Testing with Test Accounts

### Recommended Testing Approach

1. **Isolate Tests** - Each test should use an appropriate test account
2. **Use Transactions** - Wrap test data in database transactions for cleanup
3. **Reset State** - Clear account data between test suites
4. **Verify Permissions** - Test both allowed and denied actions

### Example Test Patterns

```javascript
// Admin feature test
const adminSession = authenticateAs('test.admin');
adminSession.manageSetting('feature_flag', true);

// User workflow test
const userSession = authenticateAs('test.user');
const content = userSession.createContent('Test Content');

// Permission test
const roSession = authenticateAs('test.readonly');
expect(roSession.deleteContent).toThrow('Permission Denied');
```

## Account Lifecycle

### Initial Setup
- Accounts are created during seed phase
- All accounts start with default data
- Accounts are immediately usable

### During Testing
- Test data may be modified during test execution
- Accounts maintain state across test sessions
- Activity logs are preserved

### Reset/Cleanup
- Use `npm run seed:reset` to clear all test data
- Fresh test accounts are recreated
- Original configuration is restored

## Security Considerations

- Test credentials should never be used in production
- Do not share test database access widely
- Rotate test credentials quarterly
- Monitor test account activity
- Clear test data in CI/CD cleanup phases

## Support and Maintenance

For issues or questions about test accounts:
1. Check this documentation
2. Review SETUP_GUIDE.md for initialization steps
3. Consult TEST_CREDENTIALS_QUICK_REFERENCE.txt for quick lookups
4. Contact the development team for configuration changes
