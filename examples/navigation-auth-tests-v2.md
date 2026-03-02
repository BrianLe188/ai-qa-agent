# Navigation & Auth Guard — Test Cases (v2 — High-Level Steps)

---

## TC-001: Navigate between pages after login

**Priority:** High

**Steps:**

1. Navigate to / and login
2. Verify you are on the Dashboard
3. Navigate to Products, then Profile, then back to the Dashboard
4. Verify each page loads correctly

**Expected Result:** All navigation links work correctly and each page loads with the correct title

---

## TC-002: Auth guard — dashboard without login

**Priority:** High

**Steps:**

1. Access /dashboard.html directly without logging in

**Expected Result:** User is automatically redirected to the login page (/)

---

## TC-003: Auth guard — products without login

**Priority:** High

**Steps:**

1. Access /products.html directly without logging in

**Expected Result:** User is automatically redirected to the login page (/)

---

## TC-004: Logout functionality

**Priority:** High

**Steps:**

1. Login to the application
2. Click the Logout button in the navigation bar

**Expected Result:** User is redirected to the login page, session is cleared

---

## TC-005: Login page redirect when already logged in

**Priority:** Medium

**Steps:**

1. Login and verify you are on the Dashboard
2. Try to navigate back to the root URL (/)

**Expected Result:** User is automatically redirected back to /dashboard.html since they are already logged in
