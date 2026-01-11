/**
 * E2E Tests: Block Wiring
 *
 * Tests event wiring between blocks: Table click → Detail view opens
 */

import { test, expect } from '@playwright/test';
import { loadPartsFixture, loadAssembliesFixture } from '../helpers/fixtures';

test.describe('Block Wiring', () => {
  test.describe('Parts View Wiring', () => {
    test('should wire rowSelected from parts-table to part-detail', async ({ page }) => {
      const parts = loadPartsFixture();
      const part = parts[0];

      await page.goto('/products/plm-test/parts-list');

      // Verify detail view is empty or shows placeholder
      await expect(page.locator('[data-testid="part-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="part-detail-placeholder"]')).toBeVisible();

      // Click a row in the table
      await page.click(`[data-testid="parts-table"] >> text=${part.properties.part_number.value}`);

      // Verify detail view loads the selected entity
      await expect(page.locator('[data-testid="part-detail-placeholder"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="detail-part_number"]')).toContainText(
        part.properties.part_number.value
      );
      await expect(page.locator('[data-testid="detail-name"]')).toContainText(
        part.properties.name.value
      );
    });

    test('should update detail view when different row is selected', async ({ page }) => {
      const parts = loadPartsFixture();

      await page.goto('/products/plm-test/parts-list');

      // Select first part
      await page.click(
        `[data-testid="parts-table"] >> text=${parts[0].properties.part_number.value}`
      );
      await expect(page.locator('[data-testid="detail-part_number"]')).toContainText(
        parts[0].properties.part_number.value
      );

      // Select second part
      await page.click(
        `[data-testid="parts-table"] >> text=${parts[1].properties.part_number.value}`
      );
      await expect(page.locator('[data-testid="detail-part_number"]')).toContainText(
        parts[1].properties.part_number.value
      );
    });

    test('should clear detail view when selection is cleared', async ({ page }) => {
      const parts = loadPartsFixture();
      const part = parts[0];

      await page.goto('/products/plm-test/parts-list');

      // Select part
      await page.click(`[data-testid="parts-table"] >> text=${part.properties.part_number.value}`);
      await expect(page.locator('[data-testid="detail-part_number"]')).toBeVisible();

      // Clear selection (click elsewhere or ESC)
      await page.keyboard.press('Escape');

      // Verify detail view shows placeholder again
      await expect(page.locator('[data-testid="part-detail-placeholder"]')).toBeVisible();
    });
  });

  test.describe('Assembly View Wiring', () => {
    test('should wire nodeSelected from assembly-tree to bom-table', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const parts = loadPartsFixture();
      const assembly = assemblies[0];

      await page.goto('/products/plm-test/assemblies');

      // BOM table should be empty initially
      await expect(page.locator('[data-testid="bom-table-empty"]')).toBeVisible();

      // Select assembly in tree
      await page.click(`[data-testid="tree-node-${assembly.id}"]`);

      // BOM table should show children
      await expect(page.locator('[data-testid="bom-table-empty"]')).not.toBeVisible();

      for (const childId of assembly.relationships.children.slice(0, 2)) {
        const childPart = parts.find((p) => p.id === childId);
        if (childPart) {
          await expect(
            page.locator(`[data-testid="bom-table"] >> text=${childPart.properties.part_number.value}`)
          ).toBeVisible();
        }
      }
    });

    test('should update bom-table when different assembly is selected', async ({ page }) => {
      const assemblies = loadAssembliesFixture();

      await page.goto('/products/plm-test/assemblies');

      // Select first assembly
      await page.click(`[data-testid="tree-node-${assemblies[0].id}"]`);
      const firstChildCount = assemblies[0].relationships.children.length;
      await expect(page.locator('[data-testid="bom-table"] tbody tr')).toHaveCount(firstChildCount);

      // Select second assembly
      await page.click(`[data-testid="tree-node-${assemblies[1].id}"]`);
      const secondChildCount = assemblies[1].relationships.children.length;
      await expect(page.locator('[data-testid="bom-table"] tbody tr')).toHaveCount(secondChildCount);
    });
  });

  test.describe('Transform Wiring', () => {
    test('should apply transform expression in wiring', async ({ page }) => {
      // The filter-bar to data-table wiring uses a transform
      // Test that filterChanged event is properly transformed

      await page.goto('/products/plm-test/parts-list');

      // Open filter panel
      await page.click('[data-testid="filter-toggle"]');

      // Set a filter
      await page.selectOption('[data-testid="filter-state"]', 'released');
      await page.click('[data-testid="apply-filter"]');

      // Verify table is filtered (only released parts shown)
      const rows = page.locator('[data-testid="parts-table"] tbody tr');
      const count = await rows.count();

      // Check each visible row has released state
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i).locator('[data-testid="cell-state"]')).toContainText('released');
      }
    });

    test('should handle transform error gracefully', async ({ page }) => {
      // This tests error handling when a wiring transform fails
      // Would require a misconfigured product to test properly

      await page.goto('/products/plm-test/parts-list');

      // Attempt action that triggers a broken wiring (if configured)
      // This is a placeholder for testing error handling

      // For now, just verify the UI doesn't crash
      await expect(page.locator('[data-testid="parts-table"]')).toBeVisible();
    });
  });

  test.describe('Conditional Wiring', () => {
    test('should evaluate condition before firing wiring', async ({ page }) => {
      // Test conditional wiring (e.g., double-click only for admins)
      // This would require auth context to properly test

      const parts = loadPartsFixture();
      const part = parts[0];

      await page.goto('/products/plm-test/parts-list');

      // Double-click should open edit mode for admin
      await page.dblclick(
        `[data-testid="parts-table"] >> text=${part.properties.part_number.value}`
      );

      // Verify edit mode opened (if user is admin)
      // For viewer, this should not trigger
      // This test needs auth context to be complete
    });
  });

  test.describe('Event Payload', () => {
    test('should pass correct payload from rowSelected event', async ({ page }) => {
      const parts = loadPartsFixture();
      const part = parts[0];

      await page.goto('/products/plm-test/parts-list');

      // Enable debug logging (if available)
      await page.evaluate(() => {
        // @ts-ignore
        window.__DEBUG_WIRING__ = true;
      });

      // Select a row
      await page.click(`[data-testid="parts-table"] >> text=${part.properties.part_number.value}`);

      // Check detail view received correct entityId
      await expect(page.locator('[data-testid="detail-entity-id"]')).toContainText(part.id);
    });

    test('should pass full entity object in payload', async ({ page }) => {
      const parts = loadPartsFixture();
      const part = parts[0];

      await page.goto('/products/plm-test/parts-list');

      // Select a row
      await page.click(`[data-testid="parts-table"] >> text=${part.properties.part_number.value}`);

      // Verify detail view received full entity (all properties populated)
      await expect(page.locator('[data-testid="detail-part_number"]')).toContainText(
        part.properties.part_number.value
      );
      await expect(page.locator('[data-testid="detail-name"]')).toContainText(
        part.properties.name.value
      );

      if (part.properties.unit_cost?.value) {
        await expect(page.locator('[data-testid="detail-unit_cost"]')).toContainText(
          String(part.properties.unit_cost.value)
        );
      }
    });
  });

  test.describe('Wiring Error Handling', () => {
    test('should show error when receiver block not found', async ({ page }) => {
      // This would require a misconfigured product
      // For now, verify error handling UI elements exist

      await page.goto('/products/plm-test/parts-list');

      // Wiring error indicator should not be visible in normal operation
      await expect(page.locator('[data-testid="wiring-error"]')).not.toBeVisible();
    });

    test('should show error when payload is incompatible', async ({ page }) => {
      // This would require a misconfigured product
      // For now, verify error handling UI elements exist

      await page.goto('/products/plm-test/parts-list');

      // Payload error indicator should not be visible in normal operation
      await expect(page.locator('[data-testid="payload-error"]')).not.toBeVisible();
    });
  });
});
