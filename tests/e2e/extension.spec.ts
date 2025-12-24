import { BrowserContext, chromium, expect, Page, test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Font Checker Extension', () => {
  let context: BrowserContext;
  let page: Page;
  const pathToExtension = path.join(__dirname, '../../dist');

  test.beforeEach(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should detect font and highlight selection', async () => {
    // Use file:// protocol to load local fixture
    await page.goto(`file://${path.join(__dirname, '../fixtures/index.html')}`);

    // Select text "bold text"
    const target = page.locator('#target-1');
    const box = await target.boundingBox();
    if (box) {
        await page.mouse.move(box.x, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width, box.y + box.height / 2);
        await page.mouse.up();
    } else {
        await target.selectText();
    }

    // Tooltip should appear
    const tooltip = page.locator('.font-checker-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 5000 });

    // Click tooltip to open overlay
    await tooltip.click();

    // Overlay root container check
    const overlayContainer = page.locator('#font-checker-overlay-root');
    await expect(overlayContainer).toBeAttached();

    // The overlay content is in Shadow DOM. Playwright can locate this easily.
    // We want to control the slider.
    const sizeInput = page.locator('input[type="range"]').first();
    await expect(sizeInput).toBeVisible();
    
    // Change size to 32px
    await sizeInput.fill('32');
    
    // Check if style applied to target using the dataset attribute
    // Note: The logic wraps the selection in a span, or uses the parent if exact match.
    // In our fixture, #target-1 is a span, so it might reuse it or wrap it.
    // The safest check is looking for the data attribute on #target-1 OR a child.
    const styledElement = page.locator('[data-font-checker-styled="true"]');
    await expect(styledElement).toBeVisible();
    await expect(styledElement).toHaveCSS('font-size', '32px');
    
    // CRITICAL TEST: Selection Desync Fix Verification
    // Select "italic text" (#target-2) WHILE overlay is still open.
    const target2 = page.locator('#target-2');
    const box2 = await target2.boundingBox();
    if (box2) {
        await page.mouse.move(box2.x, box2.y + box2.height / 2);
        await page.mouse.down();
        await page.mouse.move(box2.x + box2.width, box2.y + box2.height / 2);
        await page.mouse.up();
    }

    // Wait for the mouseup handler (using requestAnimationFrame) to fire
    await page.waitForTimeout(500);

    // Apply a new style changes (e.g. font size 40px)
    // If the fix works, this should apply to target2, NOT target1.
    await sizeInput.fill('40');

    // Verify target-2 has 40px
    // Since target-2 is a span "italic text", it should be styled.
    // We expect there to be TWO styled elements now? Or one if we select new text?
    // Actually, usually selecting new text creates a NEW target context.
    // BUT we must verify that the extension switched its internal "targetElement" to #target-2.
    // So "styledElement" locator might return multiple.
    
    const styledElements = page.locator('[data-font-checker-styled="true"]');
    // We expect at least checking target-2 text or parent.
    const target2Styled = page.locator('#target-2[data-font-checker-styled="true"], #target-2 [data-font-checker-styled="true"], [data-font-checker-styled="true"] >> text=italic text');
    
    await expect(target2Styled).toBeVisible();
    await expect(target2Styled).toHaveCSS('font-size', '40px');

    // Verify target-1 is NOT 40px (it should remain 32px)
    // Note: target-1 might simply be the *first* styled element found if we use generic locator.
    // Let's be specific.
    const target1 = page.locator('#target-1[data-font-checker-styled="true"], #target-1 [data-font-checker-styled="true"], [data-font-checker-styled="true"] >> text=bold text');
    await expect(target1).toHaveCSS('font-size', '32px');
  });
});
