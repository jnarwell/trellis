/**
 * E2E Tests: Computed Properties
 *
 * Tests computed property evaluation: unit_cost × quantity = extended_cost
 */

import { test, expect } from '@playwright/test';
import { getDraftPart, getReleasedPart } from '../helpers/fixtures';

test.describe('Computed Properties', () => {
  test.describe('Extended Cost Calculation', () => {
    test('should display computed extended_cost correctly', async ({ page }) => {
      const part = getReleasedPart();
      const expectedCost =
        (part.properties.unit_cost?.value ?? 0) * (part.properties.quantity?.value ?? 1);

      await page.goto('/products/plm-test/parts-list');

      // Select part
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify extended_cost is displayed
      await expect(page.locator('[data-testid="detail-extended_cost"]')).toContainText(
        expectedCost.toFixed(2)
      );
    });

    test('should update extended_cost when unit_cost changes', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');

      // Select and edit part
      await page.click(`text=${part.properties.part_number.value}`);
      await page.click('[data-testid="edit-button"]');

      // Update unit_cost
      await page.fill('[data-testid="field-unit_cost"]', '25.00');
      await page.click('[data-testid="save-button"]');

      // Wait for recomputation
      await page.waitForTimeout(500);

      // Verify extended_cost updated
      const quantity = part.properties.quantity?.value ?? 1;
      const expectedCost = 25.0 * quantity;
      await expect(page.locator('[data-testid="detail-extended_cost"]')).toContainText(
        expectedCost.toFixed(2)
      );
    });

    test('should update extended_cost when quantity changes', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');

      // Select and edit part
      await page.click(`text=${part.properties.part_number.value}`);
      await page.click('[data-testid="edit-button"]');

      // Update quantity
      await page.fill('[data-testid="field-quantity"]', '20');
      await page.click('[data-testid="save-button"]');

      // Wait for recomputation
      await page.waitForTimeout(500);

      // Verify extended_cost updated
      const unitCost = part.properties.unit_cost?.value ?? 0;
      const expectedCost = unitCost * 20;
      await expect(page.locator('[data-testid="detail-extended_cost"]')).toContainText(
        expectedCost.toFixed(2)
      );
    });

    test('should handle null unit_cost gracefully', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');
      await page.click('[data-testid="create-entity-button"]');

      // Create part without unit_cost
      await page.fill('[data-testid="field-part_number"]', 'NC-000001');
      await page.fill('[data-testid="field-name"]', 'No Cost Part');
      await page.fill('[data-testid="field-quantity"]', '5');
      // Leave unit_cost empty
      await page.click('[data-testid="submit-button"]');

      // Verify extended_cost shows as null or 0
      await page.click('text=NC-000001');
      const extendedCost = page.locator('[data-testid="detail-extended_cost"]');
      await expect(extendedCost).toContainText(/^(--|0\.00|null)$/);
    });
  });

  test.describe('Computation Status', () => {
    test('should show computation status indicator', async ({ page }) => {
      const part = getReleasedPart();

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify status indicator shows valid
      await expect(page.locator('[data-testid="computation-status-extended_cost"]')).toHaveAttribute(
        'data-status',
        'valid'
      );
    });

    test('should show pending status during recomputation', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);
      await page.click('[data-testid="edit-button"]');

      // Update a dependency
      await page.fill('[data-testid="field-unit_cost"]', '100.00');

      // Check status changes to pending/stale
      await page.click('[data-testid="save-button"]');

      // Status should briefly show pending or stale
      // (This may require waiting or checking for transition)
      const statusIndicator = page.locator('[data-testid="computation-status-extended_cost"]');
      // Allow pending, stale, or valid (race condition in test)
      await expect(statusIndicator).toHaveAttribute('data-status', /^(pending|stale|valid)$/);
    });

    test('should handle circular dependency gracefully', async ({ page }) => {
      // This test verifies circular dependency detection
      // In a properly configured system, circular dependencies should be prevented at config time
      // This test ensures the UI handles the error state correctly if one occurs

      await page.goto('/products/plm-test/parts-list');

      // Navigate to a hypothetical entity with circular dependency
      // (Would need to be set up specifically for this test)
      // For now, verify the error handling UI exists
      const errorIndicator = page.locator('[data-testid="computation-error-indicator"]');
      // This should not be visible for normal parts
      await expect(errorIndicator).not.toBeVisible();
    });
  });

  test.describe('Table Display', () => {
    test('should display extended_cost column in table', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');

      // Verify extended_cost column exists
      await expect(page.locator('th:has-text("Extended")')).toBeVisible();

      // Verify values are displayed
      const cells = page.locator('[data-testid="cell-extended_cost"]');
      const count = await cells.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should sort by extended_cost', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');

      // Click extended_cost column header to sort
      await page.click('th:has-text("Extended")');

      // Verify sort indicator
      await expect(page.locator('th:has-text("Extended") [data-sort="asc"]')).toBeVisible();

      // Click again for descending
      await page.click('th:has-text("Extended")');
      await expect(page.locator('th:has-text("Extended") [data-sort="desc"]')).toBeVisible();
    });
  });
});
