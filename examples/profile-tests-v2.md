# Profile Edit Feature — Test Cases (v2 — High-Level Steps)

---

## TC-001: Edit profile with valid data

**Priority:** High

**Steps:**

1. Navigate to /
2. Login and navigate to the Profile page
3. Update profile with:
   - First Name: Johnny
   - Last Name: Smith
   - Phone: +84 123 456 789
   - Bio: I love testing!
   - Country: Japan
4. Save the changes

**Expected Result:** Success message "Profile updated successfully!" is displayed

---

## TC-002: Edit profile with empty first name

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Login and go to Profile page
3. Clear the First Name field and save changes

**Expected Result:** Validation error "First name is required" is displayed

---

## TC-003: Edit profile with empty last name

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Login and go to Profile page
3. Clear the Last Name field and save changes

**Expected Result:** Validation error "Last name is required" is displayed

---

## TC-004: Cancel profile editing

**Priority:** Low

**Steps:**

1. Navigate to /
2. Login and go to Profile page
3. Modify some profile information but click the Cancel button

**Expected Result:** User is redirected back to the Dashboard without saving changes

---

## TC-005: Toggle notification preferences

**Priority:** Low

**Steps:**

1. Navigate to /
2. Login and go to Profile page
3. Disable Email notifications and enable SMS notifications
4. Save the changes

**Expected Result:** Success message is displayed, notification preferences are updated
