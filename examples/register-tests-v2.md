# Registration Feature — Test Cases (v2 — High-Level Steps)

---

## TC-001: Register with valid information

**Priority:** High

**Steps:**

1. Navigate to /register.html
2. Register with name "Jane Smith", email "jane@example.com", and password "SecurePass123"
3. Agree to the Terms of Service and submit

**Expected Result:** Success message "Account created successfully!" is displayed

---

## TC-002: Register with password mismatch

**Priority:** High

**Steps:**

1. Navigate to /register.html
2. Fill registration form with "Jane Smith", "jane@example.com", and mismatched passwords "SecurePass123" / "DifferentPass456"
3. Agree to terms and submit

**Expected Result:** Error message "Passwords do not match" is displayed

---

## TC-003: Register with short password

**Priority:** Medium

**Steps:**

1. Navigate to /register.html
2. Register with a short password "short"
3. Agree to terms and submit

**Expected Result:** Error "Password must be at least 8 characters" is displayed

---

## TC-004: Register without agreeing to terms

**Priority:** Medium

**Steps:**

1. Navigate to /register.html
2. Fill all registration fields correctly but do not agree to Terms of Service
3. Submit the registration form

**Expected Result:** Error message about agreeing to Terms of Service is displayed

---

## TC-005: Register with empty name

**Priority:** Medium

**Steps:**

1. Navigate to /register.html
2. Register with an empty name, "jane@example.com", and "SecurePass123"
3. Agree to terms and submit

**Expected Result:** Validation error "Name must be at least 2 characters" is shown
