# Profile Edit Feature — Test Cases

## Target URL

http://localhost:4000

## Preconditions

User must be logged in:

- Email: user@example.com
- Password: Password123!

---

## TC-001: Edit profile with valid data

**Priority:** High

**Steps:**

1. Login at / with valid credentials
2. Click the "Profile" link in the navigation bar
3. Change the First Name field to "Johnny"
4. Change the Last Name field to "Smith"
5. Enter "+84 123 456 789" into the Phone field
6. Type "I love testing!" into the Bio textarea
7. Select "Japan" from the Country dropdown
8. Click the "Save Changes" button

**Expected Result:** Success message "Profile updated successfully!" is displayed

---

## TC-002: Edit profile with empty first name

**Priority:** Medium

**Steps:**

1. Navigate to /profile.html (must be logged in)
2. Clear the First Name field (leave it empty)
3. Click "Save Changes"

**Expected Result:** Validation error "First name is required" is displayed

---

## TC-003: Edit profile with empty last name

**Priority:** Medium

**Steps:**

1. Navigate to /profile.html (must be logged in)
2. Clear the Last Name field (leave it empty)
3. Click "Save Changes"

**Expected Result:** Validation error "Last name is required" is displayed

---

## TC-004: Cancel profile editing

**Priority:** Low

**Steps:**

1. Navigate to /profile.html (must be logged in)
2. Change the First Name to something different
3. Click the "Cancel" button

**Expected Result:** User is redirected back to /dashboard.html without saving changes

---

## TC-005: Toggle notification preferences

**Priority:** Low

**Steps:**

1. Navigate to /profile.html (must be logged in)
2. Uncheck "Email notifications" checkbox
3. Check "SMS notifications" checkbox
4. Click "Save Changes"

**Expected Result:** Success message is displayed, notification preferences are updated
