# 🖐️ Advanced HITL Features Test (v2)

This test plan is designed to verify the new Human-in-the-Loop (HITL) capabilities using the **ShopDemo** app.

## 1. Test Hover and Assert Modes

**Goal**: Verify the agent can learn to use the new user dropdown menu.

- **Step 1**: Open the app at "http://localhost:4000".
- **Step 2**: Login with email "user@example.com" and password "Password123!".
- **Step 3**: Hover over the user menu (the element with "▾" in the top right).
  - _Tip for Tester_: Use **👆 Hover** mode if the AI doesn't know how to trigger the menu.
- **Step 4**: Verify the dropdown contains the "My Profile" link.
  - _Tip for Tester_: Use **✅ Assert** mode to point to the "My Profile" text.
- **Step 5**: Click on "My Profile" to navigate to the profile page.

## 2. Test Scrolling and Data Capture

**Goal**: Verify the agent can find products that require scrolling.

- **Step 1**: Login with email "user@example.com" and password "Password123!".
- **Step 2**: Navigate to the "Products" page (click the "Products" link in navbar).
- **Step 3**: Scroll down to find the product "Leather Wallet".
  - _Tip for Tester_: Use **↕ Scroll** mode to teach the agent to scroll down to the bottom.
- **Step 4**: Click the "Add to Cart" button for "Leather Wallet".
- **Step 5**: Verify the notification at the bottom says "Leather Wallet added to cart".
  - _Tip for Tester_: Use **✅ Assert** mode on the notification toast.
- **Step 6**: Click the "Logout" option inside the user menu dropdown.
