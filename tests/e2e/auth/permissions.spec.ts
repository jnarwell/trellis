/**
 * E2E Tests: Permissions
 *
 * Tests permission enforcement: Viewer can't delete, Admin can
 */

import { test, expect } from '@playwright/test';
import { getAdminUser, getViewerUser, getDraftPart, getReleasedPart } from '../helpers/fixtures';

test.describe('Permissions', () => {
  test.describe('Viewer Role', () => {
    test.beforeEach(async ({ page }) => {
      // Login as viewer
      const viewer = getViewerUser();
      await page.goto('/login');
      await page.fill('[data-testid="email"]', viewer.email);
      await page.fill('[data-testid="password"]', viewer.id); // Test mode: ID as password
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/products/**');
    });

    test('should be able to view parts', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');

      // Verify table is visible
      await expect(page.locator('[data-testid="parts-table"]')).toBeVisible();

      // Verify can select and view details
      const part = getDraftPart();
      await page.click(`text=${part.properties.part_number.value}`);
      await expect(page.locator('[data-testid="detail-part_number"]')).toContainText(
        part.properties.part_number.value
      );
    });

    test('should not see create button', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');

      // Create button should not be visible
      await expect(page.locator('[data-testid="create-entity-button"]')).not.toBeVisible();
    });

    test('should not see edit button', async ({ page }) => {
      const part = getDraftPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Edit button should not be visible
      await expect(page.locator('[data-testid="edit-button"]')).not.toBeVisible();
    });

    test('should not see delete button', async ({ page }) => {
      const part = getDraftPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Delete button should not be visible
      await expect(page.locator('[data-testid="delete-button"]')).not.toBeVisible();
    });

    test('should not see lifecycle transition actions', async ({ page }) => {
      const part = getDraftPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Lifecycle actions should not be visible
      await expect(page.locator('[data-testid="action-submit"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="action-approve"]')).not.toBeVisible();
    });
  });

  test.describe('Engineer Role', () => {
    test.beforeEach(async ({ page }) => {
      // Login as engineer
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'engineer@test.trellis.dev');
      await page.fill('[data-testid="password"]', 'test-user-engineer');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/products/**');
    });

    test('should be able to create parts', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');

      // Create button should be visible and clickable
      await expect(page.locator('[data-testid="create-entity-button"]')).toBeVisible();
      await page.click('[data-testid="create-entity-button"]');
      await expect(page.locator('[data-testid="create-form"]')).toBeVisible();
    });

    test('should be able to edit parts', async ({ page }) => {
      const part = getDraftPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Edit button should be visible and clickable
      await expect(page.locator('[data-testid="edit-button"]')).toBeVisible();
      await page.click('[data-testid="edit-button"]');
      await expect(page.locator('[data-testid="edit-form"]')).toBeVisible();
    });

    test('should be able to submit for review', async ({ page }) => {
      const part = getDraftPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Submit action should be visible
      await expect(page.locator('[data-testid="action-submit"]')).toBeVisible();
    });

    test('should not be able to approve parts', async ({ page }) => {
      // Navigate to a part in_review
      await page.goto('/products/plm-test/parts-list');
      await page.click('[data-testid="filter-toggle"]');
      await page.selectOption('[data-testid="filter-state"]', 'in_review');
      await page.click('[data-testid="apply-filter"]');

      // Select first in_review part
      const firstRow = page.locator('[data-testid="parts-table"] tbody tr').first();
      await firstRow.click();

      // Approve action should not be visible
      await expect(page.locator('[data-testid="action-approve"]')).not.toBeVisible();
    });

    test('should not be able to delete parts', async ({ page }) => {
      const part = getDraftPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Delete button should not be visible for engineer
      await expect(page.locator('[data-testid="delete-button"]')).not.toBeVisible();
    });
  });

  test.describe('Admin Role', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      const admin = getAdminUser();
      await page.goto('/login');
      await page.fill('[data-testid="email"]', admin.email);
      await page.fill('[data-testid="password"]', admin.id);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/products/**');
    });

    test('should be able to create parts', async ({ page }) => {
      await page.goto('/products/plm-test/parts-list');
      await expect(page.locator('[data-testid="create-entity-button"]')).toBeVisible();
    });

    test('should be able to edit parts', async ({ page }) => {
      const part = getDraftPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);
      await expect(page.locator('[data-testid="edit-button"]')).toBeVisible();
    });

    test('should be able to delete draft parts', async ({ page }) => {
      const part = getDraftPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Delete button should be visible
      await expect(page.locator('[data-testid="delete-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-button"]')).toBeEnabled();
    });

    test('should be able to approve parts', async ({ page }) => {
      // Navigate to a part in_review
      await page.goto('/products/plm-test/parts-list');
      await page.click('[data-testid="filter-toggle"]');
      await page.selectOption('[data-testid="filter-state"]', 'in_review');
      await page.click('[data-testid="apply-filter"]');

      // Select first in_review part
      const firstRow = page.locator('[data-testid="parts-table"] tbody tr').first();
      await firstRow.click();

      // Approve action should be visible
      await expect(page.locator('[data-testid="action-approve"]')).toBeVisible();
    });

    test('should be able to obsolete released parts', async ({ page }) => {
      const part = getReleasedPart();
      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Obsolete action should be visible
      await expect(page.locator('[data-testid="action-obsolete"]')).toBeVisible();
    });
  });

  test.describe('Tenant Isolation', () => {
    test('should not see parts from other tenants', async ({ page }) => {
      // Login as user from other tenant
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'other@other.trellis.dev');
      await page.fill('[data-testid="password"]', 'test-user-other-tenant');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/products/**');

      // Navigate to parts list
      await page.goto('/products/plm-test/parts-list');

      // Should see empty state or only their tenant's data
      // Test tenant has parts, other tenant does not
      await expect(page.locator('[data-testid="parts-table-empty"]')).toBeVisible();
    });

    test('should not access entities by direct URL from other tenant', async ({ page }) => {
      // Login as user from other tenant
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'other@other.trellis.dev');
      await page.fill('[data-testid="password"]', 'test-user-other-tenant');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/products/**');

      // Try to access a part from test-tenant by direct URL
      const part = getDraftPart();
      await page.goto(`/products/plm-test/entities/${part.id}`);

      // Should see 404 or access denied
      await expect(page.locator('[data-testid="not-found"]')).toBeVisible();
    });
  });

  test.describe('Permission Error Handling', () => {
    test('should show permission denied error', async ({ page }) => {
      // Login as viewer
      const viewer = getViewerUser();
      await page.goto('/login');
      await page.fill('[data-testid="email"]', viewer.email);
      await page.fill('[data-testid="password"]', viewer.id);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/products/**');

      // Try to access admin-only page directly
      await page.goto('/products/plm-test/settings');

      // Should see permission denied
      await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible();
    });

    test('should log permission denied in debug context', async ({ page }) => {
      // Enable debug logging
      await page.evaluate(() => {
        // @ts-ignore
        window.__DEBUG_MODE__ = 'verbose';
      });

      // Login as viewer
      const viewer = getViewerUser();
      await page.goto('/login');
      await page.fill('[data-testid="email"]', viewer.email);
      await page.fill('[data-testid="password"]', viewer.id);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/products/**');

      // Capture console messages
      const consoleMessages: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });

      // Try to access admin-only page
      await page.goto('/products/plm-test/settings');
      await page.waitForTimeout(500);

      // Verify debug context was logged
      const hasPermissionError = consoleMessages.some((msg) =>
        msg.includes('PERMISSION_DENIED') || msg.includes('permission_error')
      );
      expect(hasPermissionError).toBe(true);
    });
  });
});
