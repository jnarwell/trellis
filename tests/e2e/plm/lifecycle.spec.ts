/**
 * E2E Tests: Lifecycle Transitions
 *
 * Tests lifecycle state transitions: Draft → Review → Released
 */

import { test, expect } from '@playwright/test';
import { getDraftPart, getPartByState } from '../helpers/fixtures';

test.describe('Lifecycle Transitions', () => {
  test.describe('Draft State', () => {
    test('should show draft state indicator', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify state indicator
      await expect(page.locator('[data-testid="lifecycle-state"]')).toContainText('draft');
      await expect(page.locator('[data-testid="lifecycle-state"]')).toHaveAttribute(
        'data-state',
        'draft'
      );
    });

    test('should show available transitions for draft', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify submit action is available
      await expect(page.locator('[data-testid="action-submit"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-submit"]')).toBeEnabled();

      // Verify other actions are not available
      await expect(page.locator('[data-testid="action-approve"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="action-reject"]')).not.toBeVisible();
    });

    test('should allow editing in draft state', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Edit button should be enabled
      await expect(page.locator('[data-testid="edit-button"]')).toBeEnabled();
    });
  });

  test.describe('Submit Transition', () => {
    test('should transition from draft to in_review', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Click submit action
      await page.click('[data-testid="action-submit"]');

      // Confirm transition
      await page.click('[data-testid="confirm-transition"]');

      // Verify state changed
      await expect(page.locator('[data-testid="lifecycle-state"]')).toContainText('in_review');
    });

    test('should show confirmation dialog before transition', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Click submit action
      await page.click('[data-testid="action-submit"]');

      // Verify confirmation dialog
      await expect(page.locator('[data-testid="transition-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="transition-dialog"]')).toContainText(
        'Submit for Review'
      );
    });

    test('should allow canceling transition', async ({ page }) => {
      const part = getDraftPart();

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Click submit action
      await page.click('[data-testid="action-submit"]');

      // Cancel transition
      await page.click('[data-testid="cancel-transition"]');

      // Verify state unchanged
      await expect(page.locator('[data-testid="lifecycle-state"]')).toContainText('draft');
    });
  });

  test.describe('In Review State', () => {
    test('should show in_review state indicator', async ({ page }) => {
      const part = getPartByState('in_review');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify state indicator
      await expect(page.locator('[data-testid="lifecycle-state"]')).toContainText('in_review');
    });

    test('should show approve and reject actions', async ({ page }) => {
      const part = getPartByState('in_review');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify actions available
      await expect(page.locator('[data-testid="action-approve"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-reject"]')).toBeVisible();
    });

    test('should not allow editing in in_review state', async ({ page }) => {
      const part = getPartByState('in_review');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Edit button should be disabled
      await expect(page.locator('[data-testid="edit-button"]')).toBeDisabled();
    });
  });

  test.describe('Approve Transition', () => {
    test('should transition from in_review to released', async ({ page }) => {
      const part = getPartByState('in_review');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Click approve action
      await page.click('[data-testid="action-approve"]');
      await page.click('[data-testid="confirm-transition"]');

      // Verify state changed
      await expect(page.locator('[data-testid="lifecycle-state"]')).toContainText('released');
    });
  });

  test.describe('Reject Transition', () => {
    test('should transition from in_review back to draft', async ({ page }) => {
      const part = getPartByState('in_review');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Click reject action
      await page.click('[data-testid="action-reject"]');
      await page.click('[data-testid="confirm-transition"]');

      // Verify state changed
      await expect(page.locator('[data-testid="lifecycle-state"]')).toContainText('draft');
    });
  });

  test.describe('Released State', () => {
    test('should show released state indicator', async ({ page }) => {
      const part = getPartByState('released');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify state indicator
      await expect(page.locator('[data-testid="lifecycle-state"]')).toContainText('released');
    });

    test('should not allow editing in released state', async ({ page }) => {
      const part = getPartByState('released');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Edit button should be disabled
      await expect(page.locator('[data-testid="edit-button"]')).toBeDisabled();
    });

    test('should show obsolete action for released parts', async ({ page }) => {
      const part = getPartByState('released');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify obsolete action available
      await expect(page.locator('[data-testid="action-obsolete"]')).toBeVisible();
    });
  });

  test.describe('Obsolete State', () => {
    test('should show obsolete state indicator', async ({ page }) => {
      const part = getPartByState('obsolete');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Verify state indicator
      await expect(page.locator('[data-testid="lifecycle-state"]')).toContainText('obsolete');
    });

    test('should show no actions for obsolete parts', async ({ page }) => {
      const part = getPartByState('obsolete');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // No transition actions should be visible
      await expect(page.locator('[data-testid="action-submit"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="action-approve"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="action-obsolete"]')).not.toBeVisible();
    });
  });

  test.describe('Lifecycle History', () => {
    test('should show lifecycle history', async ({ page }) => {
      const part = getPartByState('released');
      if (!part) {
        test.skip();
        return;
      }

      await page.goto('/products/plm-test/parts-list');
      await page.click(`text=${part.properties.part_number.value}`);

      // Open history panel
      await page.click('[data-testid="show-lifecycle-history"]');

      // Verify history is displayed
      await expect(page.locator('[data-testid="lifecycle-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="lifecycle-history-entry"]')).toHaveCount(
        part.version
      );
    });
  });
});
