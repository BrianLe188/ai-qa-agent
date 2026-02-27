# Registration Feature — Test Cases

---

## TC-001: Register with valid information

**Priority:** High

**Steps:**

1. Navigate to /register.html
2. Enter "Jane Smith" into the Full Name field
3. Enter "jane@example.com" into the Email field
4. Enter "SecurePass123" into the Password field
5. Enter "SecurePass123" into the Confirm Password field
6. Check the "I agree to the Terms of Service" checkbox
7. Click the "Create Account" button

**Expected Result:** Success message "Account created successfully!" is displayed

---

## TC-002: Register with password mismatch

**Priority:** High

**Steps:**

1. Navigate to /register.html
2. Enter "Jane Smith" into the Full Name field
3. Enter "jane@example.com" into the Email field
4. Enter "SecurePass123" into the Password field
5. Enter "DifferentPass456" into the Confirm Password field
6. Check the Terms checkbox
7. Click the "Create Account" button

**Expected Result:** Error message "Passwords do not match" is displayed

---

## TC-003: Register with short password

**Priority:** Medium

**Steps:**

1. Navigate to /register.html
2. Enter "Jane Smith" into the Full Name field
3. Enter "jane@example.com" into the Email field
4. Enter "short" into the Password field
5. Enter "short" into the Confirm Password field
6. Check the Terms checkbox
7. Click the "Create Account" button

**Expected Result:** Error "Password must be at least 8 characters" is displayed

---

## TC-004: Register without agreeing to terms

**Priority:** Medium

**Steps:**

1. Navigate to /register.html
2. Enter "Jane Smith" into the Full Name field
3. Enter "jane@example.com" into the Email field
4. Enter "SecurePass123" into the Password field
5. Enter "SecurePass123" into the Confirm Password field
6. Leave the Terms checkbox unchecked
7. Click the "Create Account" button

**Expected Result:** Error message about agreeing to Terms of Service is displayed

---

## TC-005: Register with empty name

**Priority:** Medium

**Steps:**

1. Navigate to /register.html
2. Leave the Full Name field empty
3. Enter "jane@example.com" into the Email field
4. Enter "SecurePass123" into the Password and Confirm Password fields
5. Check the Terms checkbox
6. Click "Create Account"

**Expected Result:** Validation error "Name must be at least 2 characters" is shown
