/**
 * E2E Tests: Entity CRUD Operations
 *
 * Tests basic Create, Read, Update, Delete operations on part entities.
 */

import { test, expect } from '@playwright/test';
import {
  getAdminUser,
  getDraftPart,
  getReleasedPart,
  loadPartsFixture,
} from '../helpers/fixtures';

test.describe('Entity CRUD', () => {
  test.describe('Create', () => {
    test('should create a new part with required fields', async ({ page }) => {
      // Navigate to parts view
      await page.goto('/products/plm-test/parts-list');

      // Click create button
      await page.click('[data-testid="create-entity-button"]');

      // Fill required fields
      await page.fill('[data-testid="field-part_number"]', 'NW-999999');
      await page.fill('[data-testid="field-name"]', 'New Widget');

      // Submit
      await page.click('[data-testid="submit-button"]');

      // Verify entity was created
      await expect(page.locator('[data-testid="entity-created-toast"]')).toBeVisible();

      // Verify entity appears in table
      await expect(page.locator('text=NW-999999')).toBeVisible();
    });

    test('should validate part number format', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');
      await page.click('[data-testid="create-entity-button"]');

      // Fill with invalid format
      await page.fill('[data-testid="field-part_number"]', 'invalid');
      await page.fill('[data-testid="field-name"]', 'Test Part');
      await page.click('[data-testid="submit-button"]');

      // Verify validation error
      await expect(page.locator('[data-testid="validation-error-part_number"]')).toContainText(
        'Part number must be in format XX-000000'
      );
    });

    test('should reject creation with missing required fields', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');
      await page.click('[data-testid="create-entity-button"]');

      // Submit without filling required fields
      await page.click('[data-testid="submit-button"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="validation-error-part_number"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error-name"]')).toBeVisible();
    });
  });

  test.describe('Read', () => {
    test('should display parts in the data table', async ({ page }) => {
      const parts = loadPartsFixture();

      await page.goto('/products/plm-test/parts-list');

      // Verify parts are displayed
      for (const part of parts.slice(0, 3)) {
        await expect(page.locator(`text=${part.properties.part_number.value}`)).toBeVisible();
      }
    });

    test('should show part details when row is selected', async ({ page }) => {
      const part = getReleasedPart();

      await page.goto('/products/plm-test/parts-list');

      // Click on part row
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify detail view shows correct data
      await expect(page.locator('[data-testid="detail-part_number"]')).toContainText(
        part.properties.part_number.value
      );
      await expect(page.locator('[data-testid="detail-name"]')).toContainText(
        part.properties.name.value
      );
    });

    test('should paginate results correctly', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');

      // Verify pagination controls
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();

      // Click next page
      await page.click('[data-testid="pagination-next"]');

      // Verify page changed (URL or content)
      await expect(page).toHaveURL(/page=2/);
    });
  });

  test.describe('Update', () => {
    test('should update part properties', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');

      // Select part
      await page.click(`text=${part.properties.part_number.value}`);

      // Click edit button
      await page.click('[data-testid="edit-button"]');

      // Update name
      await page.fill('[data-testid="field-name"]', 'Updated Name');

      // Save
      await page.click('[data-testid="save-button"]');

      // Verify update toast
      await expect(page.locator('[data-testid="entity-updated-toast"]')).toBeVisible();

      // Verify updated value
      await expect(page.locator('[data-testid="detail-name"]')).toContainText('Updated Name');
    });

    test('should handle optimistic locking conflict', async ({ page, context }) => {
      const part = getDraftPart();

      // Open part in two tabs
      const page1 = page;
      const page2 = await context.newPage();

      await page1.goto('/products/plm-test/parts-list');
      await page2.goto('/products/plm-test/parts-list');

      // Select and edit in both tabs
      await page1.click(`text=${part.properties.part_number.value}`);
      await page2.click(`text=${part.properties.part_number.value}`);

      await page1.click('[data-testid="edit-button"]');
      await page2.click('[data-testid="edit-button"]');

      // Save in page1
      await page1.fill('[data-testid="field-name"]', 'Update from Page 1');
      await page1.click('[data-testid="save-button"]');
      await expect(page1.locator('[data-testid="entity-updated-toast"]')).toBeVisible();

      // Try to save in page2 (should conflict)
      await page2.fill('[data-testid="field-name"]', 'Update from Page 2');
      await page2.click('[data-testid="save-button"]');

      // Verify version conflict error
      await expect(page2.locator('[data-testid="version-conflict-error"]')).toBeVisible();

      await page2.close();
    });
  });

  test.describe('Delete', () => {
    test('should delete a draft part', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');

      // Select part
      await page.click(`text=${part.properties.part_number.value}`);

      // Click delete button
      await page.click('[data-testid="delete-button"]');

      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');

      // Verify deletion toast
      await expect(page.locator('[data-testid="entity-deleted-toast"]')).toBeVisible();

      // Verify part no longer visible
      await expect(page.locator(`text=${part.properties.part_number.value}`)).not.toBeVisible();
    });

    test('should not allow deletion of released parts', async ({ page }) => {
      const part = getReleasedPart();

      await page.goto('/products/plm-test/parts-list');

      // Select part
      await page.click(`text=${part.properties.part_number.value}`);

      // Delete button should be disabled or not present
      const deleteButton = page.locator('[data-testid="delete-button"]');
      await expect(deleteButton).toBeDisabled();
    });
  });
});
