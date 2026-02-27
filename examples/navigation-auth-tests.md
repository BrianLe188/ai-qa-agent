# Navigation & Auth Guard — Test Cases

---

## TC-001: Navigate between pages after login

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Verify user is redirected to /dashboard.html
6. Click "Products" link in the navigation bar
7. Verify user is on /products.html
8. Click "Profile" link in the navigation bar
9. Verify user is on /profile.html
10. Click "Dashboard" link in the navigation bar
11. Verify user is back on /dashboard.html

**Expected Result:** All navigation links work correctly and each page loads with the correct title

---

## TC-002: Auth guard — dashboard without login

**Priority:** High

**Steps:**

1. Navigate directly to /dashboard.html (without logging in first)

**Expected Result:** User is automatically redirected to the login page (/)

---

## TC-003: Auth guard — products without login

**Priority:** High

**Steps:**

1. Navigate directly to /products.html (without logging in first)

**Expected Result:** User is automatically redirected to the login page (/)

---

## TC-004: Logout functionality

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Verify user is on dashboard
6. Click the "Logout" button in the navigation bar

**Expected Result:** User is redirected to the login page, session is cleared

---

## TC-005: Login page redirect when already logged in

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Verify user is now on /dashboard.html
6. Navigate back to / (the root URL)

**Expected Result:** User is automatically redirected back to /dashboard.html since they are already logged in
