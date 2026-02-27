# Navigation & Auth Guard — Test Cases

## Target URL

http://localhost:4000

## Test Credentials

- Email: user@example.com
- Password: Password123!

---

## TC-001: Navigate between pages after login

**Priority:** High

**Steps:**

1. Navigate to /
2. Login with user@example.com / Password123!
3. Verify user is on /dashboard.html
4. Click "Products" in the navigation bar
5. Verify user is on /products.html
6. Click "Profile" in the navigation bar
7. Verify user is on /profile.html
8. Click "Dashboard" in the navigation bar
9. Verify user is back on /dashboard.html

**Expected Result:** All navigation links work correctly and each page loads with the active nav link highlighted

---

## TC-002: Auth guard — dashboard without login

**Priority:** High

**Steps:**

1. Clear session storage (ensure logged out)
2. Navigate directly to /dashboard.html

**Expected Result:** User is redirected to the login page (/)

---

## TC-003: Auth guard — products without login

**Priority:** High

**Steps:**

1. Ensure logged out
2. Navigate directly to /products.html

**Expected Result:** User is redirected to the login page (/)

---

## TC-004: Logout functionality

**Priority:** High

**Steps:**

1. Navigate to /
2. Login with valid credentials
3. Verify user is on dashboard
4. Click the "Logout" button in the navigation bar

**Expected Result:** User is redirected to the login page, session is cleared

---

## TC-005: Login page redirect when already logged in

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Login with valid credentials
3. User is now on /dashboard.html
4. Navigate back to / (login page)

**Expected Result:** User is automatically redirected to /dashboard.html since they are already logged in
