# Login Feature — Test Cases (v2 — High-Level Steps)

## Test Credentials

- Email: user@example.com
- Password: Password123!

---

## TC-001: Login with valid credentials

**Priority:** High

**Steps:**

1. Navigate to /
2. Login with email "user@example.com" and password "Password123!"

**Expected Result:** User is redirected to /dashboard.html and sees "Welcome back" message

---

## TC-002: Login with invalid password

**Priority:** High

**Steps:**

1. Navigate to /
2. Login with email "user@example.com" and password "wrongpassword"

**Expected Result:** Error message "Invalid email or password" is displayed, user stays on login page

---

## TC-003: Login with empty fields

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Leave email and password fields empty and submit the login form

**Expected Result:** Validation errors shown for required fields

---

## TC-004: Login with invalid email format

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Login with email "notanemail" and password "Password123!"

**Expected Result:** Validation error for invalid email format is displayed

---

## TC-005: Login then logout

**Priority:** High

**Steps:**

1. Navigate to /
2. Login with email "user@example.com" and password "Password123!"
3. Click the logout button

**Expected Result:** User is redirected back to login page and session is cleared

---

## TC-006: Remember me functionality

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Check the "Remember me" checkbox
3. Login with email "user@example.com" and password "Password123!"

**Expected Result:** User is logged in and the session persists after browser refresh

---

## TC-007: Password visibility toggle

**Priority:** Low

**Steps:**

1. Navigate to /
2. Enter "Password123!" into the password field
3. Toggle the password visibility button

**Expected Result:** Password field switches between hidden (dots) and visible (plain text)

---

## TC-008: Redirect to login when accessing protected page

**Priority:** High

**Steps:**

1. Navigate to /dashboard.html without logging in

**Expected Result:** User is redirected to the login page
