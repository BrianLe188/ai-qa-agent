# Login Feature — Test Cases

## Target URL

http://localhost:4000

## Test Credentials

- Email: user@example.com
- Password: Password123!

---

## TC-001: Login with valid credentials

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button

**Expected Result:** User is redirected to /dashboard.html and sees "Welcome back" message

---

## TC-002: Login with invalid password

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "wrongpassword" into the password field
4. Click the "Sign In" button

**Expected Result:** Error message "Invalid email or password" is displayed, user stays on login page

---

## TC-003: Login with empty fields

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Leave email field empty
3. Leave password field empty
4. Click the "Sign In" button

**Expected Result:** Validation errors shown for required fields

---

## TC-004: Login with invalid email format

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Enter "notanemail" into the email field
3. Enter "Password123!" into the password field
4. Click the "Sign In" button

**Expected Result:** Validation error for invalid email format is displayed
