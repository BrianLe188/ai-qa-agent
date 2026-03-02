# Product & Cart Feature — Test Cases (v2 — High-Level Steps)

---

## TC-001: View all products

**Priority:** High

**Steps:**

1. Navigate to /
2. Login with valid credentials
3. Go to the Products page

**Expected Result:** Products page is displayed with a grid of products including Wireless Headphones, USB-C Hub, Mechanical Keyboard, etc.

---

## TC-002: Search for a product

**Priority:** High

**Steps:**

1. Navigate to /
2. Login and go to Products page
3. Search for "keyboard"

**Expected Result:** Only "Mechanical Keyboard" product is shown in the grid, other products are hidden

---

## TC-003: Filter by category

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Login and go to Products page
3. Filter products by category "Clothing"

**Expected Result:** Only clothing items are shown: "T-Shirt (Dev Edition)" and "Hoodie (Code Mode)"

---

## TC-004: Sort products by price low to high

**Priority:** Medium

**Steps:**

1. Navigate to /
2. Login and go to Products page
3. Sort products by "Price: Low → High"

**Expected Result:** Products are reordered with cheapest first (Phone Case $15.00) and most expensive last (Mechanical Keyboard $120.00)

---

## TC-005: Add product to cart

**Priority:** High

**Steps:**

1. Navigate to /
2. Login and go to Products page
3. Add "Wireless Headphones" to the cart

**Expected Result:** Cart summary appears at the bottom showing "Wireless Headphones × 1" with total "$89.99", and a notification "Wireless Headphones added to cart" is briefly shown

---

## TC-006: Add multiple products and checkout

**Priority:** High

**Steps:**

1. Navigate to /
2. Login and go to Products page
3. Add "Wireless Headphones" and "USB-C Hub" to the cart
4. Proceed to checkout from the cart summary

**Expected Result:** Notification "Order placed successfully! 🎉" appears and cart is cleared

---

## TC-007: Search with no results

**Priority:** Low

**Steps:**

1. Navigate to /
2. Login and go to Products page
3. Search for a nonexistent product "nonexistent product xyz"

**Expected Result:** No products are displayed in the grid
