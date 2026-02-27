# Profile Edit Feature — Test Cases

---

## TC-001: Edit profile with valid data

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Profile" link in the navigation bar
6. Change the First Name field to "Johnny"
7. Change the Last Name field to "Smith"
8. Enter "+84 123 456 789" into the Phone field
9. Type "I love testing!" into the Bio textarea
10. Select "Japan" from the Country dropdown
11. Click the "Save Changes" button

**Expected Result:** Success message "Profile updated successfully!" is displayed

---

## TC-002: Edit profile with empty first name

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Profile" link in the navigation bar
6. Clear the First Name field (leave it empty)
7. Click "Save Changes"

**Expected Result:** Validation error "First name is required" is displayed

---

## TC-003: Edit profile with empty last name

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Profile" link in the navigation bar
6. Clear the Last Name field (leave it empty)
7. Click "Save Changes"

**Expected Result:** Validation error "Last name is required" is displayed

---

## TC-004: Cancel profile editing

**Priority:** Low

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Profile" link in the navigation bar
6. Change the First Name to something different
7. Click the "Cancel" button

**Expected Result:** User is redirected back to /dashboard.html without saving changes

---

## TC-005: Toggle notification preferences

**Priority:** Low

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Profile" link in the navigation bar
6. Uncheck "Email notifications" checkbox
7. Check "SMS notifications" checkbox
8. Click "Save Changes"

**Expected Result:** Success message is displayed, notification preferences are updated
