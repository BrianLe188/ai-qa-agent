# HITL Demo Test Cases

# These test cases are designed to test the Human-in-the-Loop feature.

# Some steps are intentionally vague or tricky to force the AI to fail,

# triggering HITL mode where the user can teach the agent by clicking.

## TC-001: Login and check dashboard stats

**Priority:** high  
**URL:** /

### Steps:

1. Enter "user@example.com" into the email field
2. Enter "Password123!" into the password field
3. Click the sign in button
4. Verify the page shows "Welcome back"
5. Check the third statistics box displays "3"

### Expected Result:

User should see the dashboard with the correct Wishlist stat of 3.

---

## TC-002: Use the search and filter on products page

**Priority:** high  
**URL:** /

### Steps:

1. Login with email "user@example.com" and password "Password123!"
2. Click the "Products" link in the navigation bar
3. Type "keyboard" in the search box
4. Change the category dropdown to "Electronics"
5. Verify only "Mechanical Keyboard" product is shown

### Expected Result:

Only the Mechanical Keyboard product card should be visible after filtering.

---

## TC-003: Sort products and add the cheapest one to cart

**Priority:** medium  
**URL:** /

### Steps:

1. Login with email "user@example.com" and password "Password123!"
2. Navigate to the Products page
3. Change the sort dropdown to "Price: Low → High"
4. Click the "Add to Cart" button on the very first product card
5. Verify the cart summary appears showing 1 item

### Expected Result:

The cheapest product (Phone Case $15.00) should be added to the cart.

---

## TC-004: Logout from the dashboard using the top-right button

**Priority:** high  
**URL:** /

### Steps:

1. Login with email "user@example.com" and password "Password123!"
2. Verify you are on the dashboard page
3. Find and click the small logout button in the top-right corner of the navigation
4. Verify the page redirects back to the login form

### Expected Result:

User should be logged out and see the login page again.
