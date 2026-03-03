# 🖐️ Advanced HITL Features Test (v2)

This test plan verifies Human-in-the-Loop (HITL) capabilities with the **ShopDemo** app at `http://localhost:4000`.

## 1. Test Login and Dashboard Navigation

**Goal**: Verify login flow and user menu hover interaction.

- **Step 1**: Navigate to "/".
- **Step 2**: Login with email "user@example.com" and password "Password123!".
- **Step 3**: Verify the dashboard page shows "Welcome back, John Doe!".
- **Step 4**: Hover over the user menu in the top right to open the dropdown.
- **Step 5**: Click "My Profile" in the dropdown to navigate to the profile page.
- **Step 6**: Verify the page title shows "Edit Profile".

## 2. Test Product Search and Cart

**Goal**: Verify product filtering, add to cart, and checkout.

- **Step 1**: Login with email "user@example.com" and password "Password123!".
- **Step 2**: Click the "Products" link in the navbar.
- **Step 3**: Type "keyboard" into the search input field.
- **Step 4**: Click the "Add to Cart" button for "Mechanical Keyboard".
- **Step 5**: Verify the notification says "Mechanical Keyboard added to cart".
- **Step 6**: Clear the search input field.
- **Step 7**: Scroll down and click the "Add to Cart" button for "Leather Wallet".
- **Step 8**: Verify the cart summary shows "2 items".
- **Step 9**: Click the "Checkout" button.
- **Step 10**: Verify the notification says "Order placed successfully! 🎉".

## 3. Test Profile Edit with HITL

**Goal**: Test editing profile form with checkbox interaction — may require HITL.

- **Step 1**: Login with email "user@example.com" and password "Password123!".
- **Step 2**: Click "Profile" in the navbar.
- **Step 3**: Clear the "First Name" field and type "Jane".
- **Step 4**: Clear the "Last Name" field and type "Smith".
- **Step 5**: Type "+84 999 888 777" into the phone field.
- **Step 6**: Select "Japan" from the country dropdown.
- **Step 7**: Check the "SMS notifications" checkbox.
  - _HITL Tip_: If the AI fails, use **🖱 Click** mode and click the SMS checkbox.
- **Step 8**: Click "Save Changes".
- **Step 9**: Verify the success message says "Profile updated successfully!".
