/**
 * E2E Tests: BOM Hierarchy
 *
 * Tests Bill of Materials hierarchy: Assembly → children → tree rendering
 */

import { test, expect } from '@playwright/test';
import { loadAssembliesFixture, loadPartsFixture } from '../helpers/fixtures';

test.describe('BOM Hierarchy', () => {
  test.describe('Tree View', () => {
    test('should display assembly tree', async ({ page }) => {
      const assemblies = loadAssembliesFixture();

      await page.goto('/products/plm-test/assemblies');

      // Verify tree view is displayed
      await expect(page.locator('[data-testid="assembly-tree"]')).toBeVisible();

      // Verify assemblies are shown in tree
      for (const assembly of assemblies) {
        await expect(page.locator(`text=${assembly.properties.name.value}`)).toBeVisible();
      }
    });

    test('should expand assembly to show children', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const parts = loadPartsFixture();
      const assembly = assemblies[0];

      await page.goto('/products/plm-test/assemblies');

      // Click expand icon on assembly
      await page.click(`[data-testid="tree-expand-${assembly.id}"]`);

      // Verify child parts are shown
      for (const childId of assembly.relationships.children) {
        const childPart = parts.find((p) => p.id === childId);
        if (childPart) {
          await expect(page.locator(`text=${childPart.properties.name.value}`)).toBeVisible();
        }
      }
    });

    test('should collapse expanded assembly', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const parts = loadPartsFixture();
      const assembly = assemblies[0];
      const firstChildId = assembly.relationships.children[0];
      const firstChild = parts.find((p) => p.id === firstChildId);

      await page.goto('/products/plm-test/assemblies');

      // Expand
      await page.click(`[data-testid="tree-expand-${assembly.id}"]`);
      await expect(page.locator(`text=${firstChild!.properties.name.value}`)).toBeVisible();

      // Collapse
      await page.click(`[data-testid="tree-collapse-${assembly.id}"]`);

      // Children should be hidden
      await expect(page.locator(`text=${firstChild!.properties.name.value}`)).not.toBeVisible();
    });

    test('should show part count badge on assembly', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const assembly = assemblies[0];
      const expectedCount = assembly.relationships.children.length;

      await page.goto('/products/plm-test/assemblies');

      // Verify part count badge
      await expect(page.locator(`[data-testid="part-count-${assembly.id}"]`)).toContainText(
        String(expectedCount)
      );
    });
  });

  test.describe('BOM Table', () => {
    test('should display BOM table when assembly is selected', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const assembly = assemblies[0];

      await page.goto('/products/plm-test/assemblies');

      // Select assembly in tree
      await page.click(`[data-testid="tree-node-${assembly.id}"]`);

      // Verify BOM table is populated
      await expect(page.locator('[data-testid="bom-table"]')).toBeVisible();

      // Verify child parts appear in table
      const parts = loadPartsFixture();
      for (const childId of assembly.relationships.children) {
        const childPart = parts.find((p) => p.id === childId);
        if (childPart) {
          await expect(
            page.locator(`[data-testid="bom-table"] >> text=${childPart.properties.part_number.value}`)
          ).toBeVisible();
        }
      }
    });

    test('should show total cost computed from children', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const parts = loadPartsFixture();
      const assembly = assemblies[0];

      // Calculate expected total cost
      let expectedTotal = 0;
      for (const childId of assembly.relationships.children) {
        const childPart = parts.find((p) => p.id === childId);
        if (childPart) {
          const unitCost = childPart.properties.unit_cost?.value ?? 0;
          const quantity = childPart.properties.quantity?.value ?? 1;
          expectedTotal += unitCost * quantity;
        }
      }

      await page.goto('/products/plm-test/assemblies');

      // Select assembly
      await page.click(`[data-testid="tree-node-${assembly.id}"]`);

      // Verify total cost is displayed
      await expect(page.locator('[data-testid="assembly-total-cost"]')).toContainText(
        expectedTotal.toFixed(2)
      );
    });

    test('should update when child is added', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const assembly = assemblies[0];

      await page.goto('/products/plm-test/assemblies');

      // Select assembly
      await page.click(`[data-testid="tree-node-${assembly.id}"]`);

      // Get initial count
      const initialCount = await page.locator('[data-testid="bom-table"] tbody tr').count();

      // Add a part to the assembly
      await page.click('[data-testid="add-part-to-assembly"]');

      // Select a part from picker
      await page.click('[data-testid="part-picker-item"]:first-child');
      await page.click('[data-testid="confirm-add-part"]');

      // Verify count increased
      await expect(page.locator('[data-testid="bom-table"] tbody tr')).toHaveCount(initialCount + 1);
    });

    test('should update when child is removed', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const assembly = assemblies[0];

      await page.goto('/products/plm-test/assemblies');

      // Select assembly
      await page.click(`[data-testid="tree-node-${assembly.id}"]`);

      // Get initial count
      const initialCount = await page.locator('[data-testid="bom-table"] tbody tr').count();

      // Remove first part
      await page.click('[data-testid="bom-table"] tbody tr:first-child [data-testid="remove-part"]');
      await page.click('[data-testid="confirm-remove"]');

      // Verify count decreased
      await expect(page.locator('[data-testid="bom-table"] tbody tr')).toHaveCount(initialCount - 1);
    });
  });

  test.describe('Computed Aggregates', () => {
    test('should show part_count computed property', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const assembly = assemblies[0];
      const expectedCount = assembly.relationships.children.length;

      await page.goto('/products/plm-test/assemblies');
      await page.click(`[data-testid="tree-node-${assembly.id}"]`);

      // Verify part_count in detail view
      await expect(page.locator('[data-testid="detail-part_count"]')).toContainText(
        String(expectedCount)
      );
    });

    test('should update aggregates when children change', async ({ page }) => {
      const assemblies = loadAssembliesFixture();
      const assembly = assemblies[0];

      await page.goto('/products/plm-test/assemblies');
      await page.click(`[data-testid="tree-node-${assembly.id}"]`);

      // Get initial total cost
      const initialTotalText = await page.locator('[data-testid="assembly-total-cost"]').textContent();
      const initialTotal = parseFloat(initialTotalText?.replace(/[^0-9.]/g, '') ?? '0');

      // Add a new part with known cost
      await page.click('[data-testid="add-part-to-assembly"]');
      // Select part with $45 unit cost (Housing Main from fixtures)
      await page.click('[data-testid="part-picker-item"]:has-text("HS-004567")');
      await page.click('[data-testid="confirm-add-part"]');

      // Wait for recomputation
      await page.waitForTimeout(500);

      // Verify total increased by part's extended_cost
      const newTotalText = await page.locator('[data-testid="assembly-total-cost"]').textContent();
      const newTotal = parseFloat(newTotalText?.replace(/[^0-9.]/g, '') ?? '0');

      expect(newTotal).toBeGreaterThan(initialTotal);
    });
  });
});
