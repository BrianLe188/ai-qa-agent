# Product & Cart Feature — Test Cases

---

## TC-001: View all products

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Products" link in the navigation bar

**Expected Result:** Products page is displayed with a grid of products including Wireless Headphones, USB-C Hub, Mechanical Keyboard, etc.

---

## TC-002: Search for a product

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Products" link in the navigation bar
6. Type "keyboard" into the search input field

**Expected Result:** Only "Mechanical Keyboard" product is shown in the grid, other products are hidden

---

## TC-003: Filter by category

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Products" link in the navigation bar
6. Select "Clothing" from the category dropdown filter

**Expected Result:** Only clothing items are shown: "T-Shirt (Dev Edition)" and "Hoodie (Code Mode)"

---

## TC-004: Sort products by price low to high

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Products" link in the navigation bar
6. Select "Price: Low → High" from the sort dropdown

**Expected Result:** Products are reordered with cheapest first (Phone Case $15.00) and most expensive last (Mechanical Keyboard $120.00)

---

## TC-005: Add product to cart

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Products" link in the navigation bar
6. Click the "Add to Cart" button on the first product card "Wireless Headphones"

**Expected Result:** Cart summary appears at the bottom showing "Wireless Headphones × 1" with total "$89.99", and a notification "Wireless Headphones added to cart" is briefly shown

---

## TC-006: Add multiple products and checkout

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Products" link in the navigation bar
6. Click "Add to Cart" on "Wireless Headphones"
7. Click "Add to Cart" on "USB-C Hub"
8. Verify the cart summary shows 2 items
9. Click the "Checkout" button in the cart summary

**Expected Result:** Notification "Order placed successfully! 🎉" appears and cart is cleared

---

## TC-007: Search with no results

**Priority:** Low

**Steps:**

1. Navigate to /
2. Enter email "user@example.com" into the email field
3. Enter password "Password123!" into the password field
4. Click the "Sign In" button
5. Click the "Products" link in the navigation bar
6. Type "nonexistent product xyz" into the search field

**Expected Result:** No products are displayed in the grid
