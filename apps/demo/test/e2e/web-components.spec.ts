import { expect, test } from "playwright/test";
import axe from "axe-core";
import { MIDDLEWARE_ARROW } from "../../src/middleware-registry";

test("loads the Tailwind v4 design tokens without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/tooltip");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Floating UI Plus/,
    }),
  ).toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBe(0);
});

test("registers floating elements before the example module runs", async ({
  page,
}) => {
  await page.goto("/popover");

  const moduleSources = await page
    .locator('script[type="module"][src]')
    .evaluateAll((scripts) =>
      scripts.map((script) => (script as HTMLScriptElement).src),
    );
  const registrationIndex = moduleSources.findIndex((source) =>
    source.includes("DemoLayout.astro_astro_type_script_index_0"),
  );
  const exampleIndex = moduleSources.findIndex((source) =>
    source.includes("PopoverExample.astro_astro_type_script_index_0"),
  );

  expect(registrationIndex).toBe(0);
  expect(exampleIndex).toBeGreaterThan(registrationIndex);
  expect(
    await page.evaluate(() => Boolean(customElements.get("floating-root"))),
  ).toBe(true);
});

test("keeps native popover template content inert across refresh until it opens", async ({
  page,
}) => {
  await page.goto("/popover");
  await page.reload();
  await expect(page.locator('#popover-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );

  const demo = page.locator('.framework-panel--web-components');
  const trigger = demo.getByRole("button", { name: /Open coordinates/ });
  const panel = demo.locator(".popover-panel");
  await expect(panel).toHaveCount(0);

  await trigger.click();
  await expect(panel).toBeVisible();
  const placement = await panel.getAttribute("data-placement");
  expect(placement).toMatch(/^(top|bottom)(?:-(?:start|end))?$/);
  expect(
    await panel.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        startY: style.getPropertyValue("--surface-motion-start-y").trim(),
        origin: style.getPropertyValue("--surface-motion-origin").trim(),
        easing: style.getPropertyValue("--surface-motion-easing").trim(),
      };
    }),
  ).toEqual(
    placement?.startsWith("top")
      ? {
          startY: ".25rem",
          origin: "50% 100%",
          easing: "cubic-bezier(.23, 1, .32, 1)",
        }
      : {
          startY: "-.25rem",
          origin: "50% 0%",
          easing: "cubic-bezier(.23, 1, .32, 1)",
        },
  );
  expect(
    await panel.evaluate(
      (element) =>
        element.matches(":popover-open") &&
        element.parentElement?.localName === "floating-root",
    ),
  ).toBe(true);
  await expect(panel).toHaveCSS("transition-property", /display/);
  await expect(panel).toHaveCSS("transition-property", /overlay/);
  // WebKit can close a native Popover without dispatching transitionrun when
  // discrete top-layer transitions are unavailable. The contract is that the
  // template remains mounted while open and closes cleanly in either path.
  await panel.locator("[data-fup-close]").click();
  await expect(panel).toHaveCount(0);

  await trigger.click();
  await expect(panel).toBeVisible();
});

test("only native dialog surfaces use the direct floating slot", async ({
  page,
}) => {
  await page.goto("/modal");

  const directSurfaces = await page
    .locator('floating-root > [slot="floating"]')
    .evaluateAll((elements) => elements.map((element) => element.localName));
  expect(directSurfaces).toEqual(["dialog", "dialog"]);
});

test("opens the edge sheet as a modal and restores focus on Escape", async ({
  page,
}) => {
  await page.goto("/sheet");
  const demo = page.locator('.framework-panel--web-components');
  const trigger = demo.getByRole("button", { name: /Open activity sheet/ });
  const sheet = demo.getByRole("dialog", { name: "Activity digest" });

  await trigger.click();
  await expect(sheet).toBeVisible();
  expect(await sheet.evaluate((element) => element.matches(":modal"))).toBe(
    true,
  );
  const box = await sheet.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  await expect.poll(async () => {
    const current = await sheet.boundingBox();
    if (!current) return Number.POSITIVE_INFINITY;
    return Math.abs(viewport!.width - current.x - current.width);
  }).toBeLessThanOrEqual(1);
  const settledBox = await sheet.boundingBox();
  expect(settledBox).not.toBeNull();
  expect(settledBox!.x + settledBox!.width).toBeCloseTo(viewport!.width, 0);
  expect(settledBox!.height).toBeCloseTo(viewport!.height, 0);

  await expect(sheet).toHaveCSS("transition-property", /display/);
  await expect(sheet).toHaveCSS("transition-property", /overlay/);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("places every Web Component sheet side on the viewport edge after reopening", async ({
  page,
}) => {
  await page.goto("/sheet");
  const demo = page.locator('.framework-panel--web-components');
  const trigger = demo.getByRole("button", { name: /Open activity sheet/ });
  const sheet = demo.getByRole("dialog", { name: "Activity digest" });
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  for (const side of ["top", "right", "bottom", "left"] as const) {
    await demo
      .getByRole("button", { name: new RegExp(`^${side}$`, "i") })
      .click();
    for (let opening = 0; opening < 2; opening++) {
      await trigger.click();
      await expect(sheet).toBeVisible();
      await expect(sheet).toHaveAttribute("data-side", side);
      await expect
        .poll(async () => {
          const current = await sheet.boundingBox();
          if (!current) return Number.POSITIVE_INFINITY;
          if (side === "top") return Math.abs(current.y);
          if (side === "right") {
            return Math.abs(viewport!.width - current.x - current.width);
          }
          if (side === "bottom") {
            return Math.abs(viewport!.height - current.y - current.height);
          }
          return Math.abs(current.x);
        })
        .toBeLessThanOrEqual(1);
      const box = await sheet.boundingBox();
      expect(box).not.toBeNull();
      if (side === "top") {
        expect(box!.width).toBeCloseTo(viewport!.width, 0);
      } else if (side === "right") {
        expect(box!.height).toBeCloseTo(viewport!.height, 0);
      } else if (side === "bottom") {
        expect(box!.width).toBeCloseTo(viewport!.width, 0);
      } else {
        expect(box!.height).toBeCloseTo(viewport!.height, 0);
      }
      await sheet.getByRole("button", { name: "Close sheet" }).click();
      await expect(sheet).toBeHidden();
    }
  }
});

test("stacks, pauses, focuses, and dismisses Web Component toasts", async ({
  page,
}) => {
  await page.goto("/toast");
  const create = page.getByRole("button", { name: /Create notification/ });
  const viewport = page.getByRole("region", { name: "Notifications" });

  await create.click();
  await create.click();
  const first = viewport.locator('[data-presence-id="1"]');
  await expect(first).toHaveAttribute("data-status", "open");
  await expect(first).toHaveAttribute("popover", "manual");
  await expect(first).toHaveJSProperty("popover", "manual");
  expect(
    await first.evaluate((element) => element.matches(":popover-open")),
  ).toBe(true);
  await expect(viewport.locator(".toast-item")).toHaveCount(2);
  expect(
    await first.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        inBottomRight:
          rect.right >= innerWidth - 48 && rect.bottom >= innerHeight - 48,
        popoverOpen: element.matches(":popover-open"),
      };
    }),
  ).toEqual({inBottomRight: true, popoverOpen: true});

  await viewport.locator('[data-presence-id="2"]').hover();
  await expect(viewport).toHaveAttribute("data-presence-paused", "");
  await page.keyboard.press("F6");
  await expect(
    viewport.locator('[data-presence-id="2"] [data-presence-close]'),
  ).toBeFocused();

  await first.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(first).toHaveAttribute("data-status", "close");
  await expect(first).toHaveCount(0);

  await create.click();
  const recreated = viewport.locator('[data-presence-id="3"]');
  await expect(recreated).toHaveAttribute("data-status", "open");
  await expect(recreated).toHaveCount(1);
  expect(
    await recreated.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        inBottomRight:
          rect.right >= innerWidth - 48 && rect.bottom >= innerHeight - 48,
        popoverOpen: element.matches(":popover-open"),
      };
    }),
  ).toEqual({inBottomRight: true, popoverOpen: true});
});

test("filters and executes the Web Component command palette with the keyboard", async (
  {page},
  testInfo,
) => {
  await page.goto("/command");
  const trigger = page.getByRole("button", { name: /Open command palette/ });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  const input = dialog.getByRole("textbox", { name: "Search commands" });
  await expect(dialog).toBeVisible();
  await expect(input).toBeFocused();
  await expect(dialog.locator('.command-item')).toHaveCount(9);
  expect(
    await dialog
      .locator('.command-list')
      .evaluate((element) => element.scrollHeight >= element.clientHeight),
  ).toBe(true);
  await input.fill("not-a-command");
  await expect(dialog.locator('.command-empty')).toBeVisible();
  await input.fill("project");
  const project = dialog.locator('.command-item').filter({hasText: "Open project"});
  await expect(project).toBeVisible();
  await expect(dialog.locator('.command-item')).toHaveCount(1);
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator('.framework-panel--web-components .command-result')).toHaveText(
    "Open project selected.",
  );
  await expect(trigger).toBeFocused();
  await page.keyboard.press(
    testInfo.project.name === "desktop-webkit" ? "Meta+k" : "Control+k",
  );
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("menu starts roving focus at the first item after opening with a pointer", async ({
  page,
}) => {
  await page.goto("/menu");

  const trigger = page.getByRole("button", { name: "Open navigator" });
  const firstItem = page.getByRole("menuitem", { name: /North star/ });
  const secondItem = page.getByRole("menuitem", { name: /Orbit map/ });
  const signalItem = page.getByRole("menuitem", { name: /Signal log/ });

  await trigger.click();
  await page.keyboard.press("ArrowDown");

  await expect(firstItem).toBeFocused();
  expect(
    await firstItem.evaluate((element) =>
      Boolean(element.closest("floating-portal-target")),
    ),
  ).toBe(false);
  await expect(secondItem).not.toBeFocused();
  await firstItem.press("s");
  await expect(signalItem).toBeFocused();

  await signalItem.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();

  await trigger.click();
  await page.keyboard.press("ArrowDown");
  await expect(firstItem).toBeFocused();
});

test("nested menu preserves the complete keyboard path", async ({ page }) => {
  await page.goto("/nested-menu");
  await expect(page.locator('#nested-menu-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );

  const trigger = page.getByRole("button", { name: "Open actions" });
  await trigger.click();
  await trigger.press("ArrowDown");

  const newNote = page.getByRole("menuitem", { name: /New note/ });
  const moveToProject = page.getByRole("menuitem", {
    name: /Move to project/,
  });
  const archive = page.getByRole("menuitem", { name: /Archive/ });

  await expect(newNote).toBeFocused();
  await newNote.press("ArrowDown");
  await expect(moveToProject).toBeFocused();

  await moveToProject.press("ArrowDown");
  await expect(archive).toBeFocused();

  await archive.press("ArrowUp");
  await expect(moveToProject).toBeFocused();

  const scrollBeforeSubmenu = await page.evaluate(() => window.scrollY);
  await moveToProject.press("ArrowRight");

  const projectMenu = page.getByRole("menu", { name: "Move to project" });
  const atlas = projectMenu.getByRole("menuitem", { name: /Atlas/ });
  const fieldResearch = projectMenu.getByRole("menuitem", {
    name: /Field research/,
  });
  await expect(projectMenu).toBeVisible();
  await expect(atlas).toBeFocused();

  const openingGeometry = await projectMenu.evaluate((menu) => {
    const animation = menu
      .getAnimations()
      .find(
        (candidate) =>
          candidate instanceof CSSAnimation &&
          candidate.animationName === "surface-in",
      );
    if (animation) {
      animation.pause();
      animation.currentTime = 80;
    }
    const menuRect = menu.getBoundingClientRect();
    const parentRect = document
      .querySelector<HTMLElement>('.nested-menu-root [aria-haspopup="menu"]')
      ?.getBoundingClientRect();
    return {
      hasSurfaceAnimation: Boolean(animation),
      menuTop: menuRect.top,
      parentTop: parentRect?.top ?? Number.NaN,
    };
  });
  expect(openingGeometry.hasSurfaceAnimation).toBe(true);
  expect(
    Math.abs(openingGeometry.menuTop - openingGeometry.parentTop),
  ).toBeLessThan(180);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeSubmenu);

  await atlas.press("ArrowDown");
  await expect(fieldResearch).toBeFocused();
  await fieldResearch.press("Escape");

  await expect(projectMenu).toBeHidden();
  await expect(page.getByRole("menu", { name: "Open actions" })).toBeVisible();
  await expect(moveToProject).toBeFocused();
  await moveToProject.press("ArrowDown");
  await expect(archive).toBeFocused();

  await archive.press("Escape");
  await expect(page.getByRole("menu", { name: "Open actions" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("nested dialog surfaces dismiss only the topmost layer", async ({
  page,
}) => {
  await page.goto("/modal");
  await expect(page.locator('#modal-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );
  const demo = page.locator('.framework-panel--web-components');
  const trigger = demo.getByRole("button", { name: /Enter focus room/ });
  await trigger.click();

  const dialog = demo
    .locator(".modal-panel")
    .filter({ hasText: "Nested surfaces keep their own dismissal step." });
  const hintTrigger = demo.getByRole("button", { name: "Show placement hint" });
  const popoverTrigger = demo.getByRole("button", {
    name: "Open room details",
  });
  const nestedDialogTrigger = demo.getByRole("button", {
    name: "Open nested dialog",
  });

  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(
    true,
  );
  await expect(hintTrigger).toBeFocused();

  await hintTrigger.hover();
  const tooltip = demo.locator(".tooltip").filter({
    hasText: "This tooltip stays inside the dialog.",
  });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS("z-index", "30");
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(dialog).toBeVisible();

  await popoverTrigger.click();
  const popover = demo.locator(".popover-panel").filter({
    hasText: "Details stay above the dialog.",
  });
  await expect(popover).toBeVisible();
  expect(
    await popover.evaluate((element) => element.parentElement?.localName),
  ).toBe("floating-root");
  await demo.getByRole("button", { name: "Close details" }).click();
  await expect(popover).toBeHidden();
  await expect(dialog).toBeVisible();

  await popoverTrigger.click();
  await expect(popover).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(popover).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();

  await nestedDialogTrigger.click();
  const nestedDialog = demo.locator(".nested-modal-panel");
  await expect(nestedDialog).toBeVisible();
  expect(
    await nestedDialog.evaluate(
      (element) =>
        element.matches(":modal") &&
        element.parentElement?.localName === "floating-root",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Return to focus room" }).click();
  await expect(nestedDialog).toBeHidden();
  await expect(dialog).toBeVisible();

  await demo.getByRole("button", { name: "Leave room" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("tooltip component opens from hover or keyboard focus and dismisses cleanly", async ({
  page,
}) => {
  await page.goto("/tooltip");
  const trigger = page.getByRole("button", { name: /Inspect signal/ });
  const tooltip = page.getByRole("tooltip");

  await trigger.focus();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveAttribute("data-placement", /^top/);
  expect(
    await tooltip.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        startY: style.getPropertyValue("--surface-motion-start-y").trim(),
        origin: style.getPropertyValue("--surface-motion-origin").trim(),
      };
    }),
  ).toEqual({ startY: ".25rem", origin: "50% 100%" });
  await expect
    .poll(() =>
      tooltip.evaluate((element) => getComputedStyle(element).overflow),
    )
    .toBe("visible");
  await trigger.press("Escape");
  await expect(tooltip).toBeHidden();

  await trigger.hover();
  await expect(tooltip).toBeVisible();

  await page.mouse.move(2, 2);
  await expect(tooltip).toBeHidden();
});

test("cursor signal follows the pointer virtual reference", async ({
  page,
}) => {
  await page.goto("/client-point");
  await expect(page.locator('#client-point-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );

  const field = page.locator(".cursor-field");
  await field.scrollIntoViewIfNeeded();
  const fieldBox = await field.boundingBox();
  expect(fieldBox).not.toBeNull();
  const pointer = {
    x: fieldBox!.x + Math.min(120, fieldBox!.width / 2),
    y: fieldBox!.y + Math.min(40, fieldBox!.height / 2),
  };

  await page.mouse.move(pointer.x, pointer.y);
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  expect(
    await tooltip.evaluate((element) =>
      Boolean(element.closest("floating-portal-target")),
    ),
  ).toBe(false);
  const label = (await field.textContent())!.match(/(\d+) × (\d+)/);
  expect(label).not.toBeNull();
  expect(
    Math.abs(Number(label![1]) - (pointer.x - fieldBox!.x)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(Number(label![2]) - (pointer.y - fieldBox!.y)),
  ).toBeLessThanOrEqual(1);

  const tooltipBox = await tooltip.boundingBox();
  expect(tooltipBox).not.toBeNull();
  expect(
    Math.abs(tooltipBox!.x + tooltipBox!.width / 2 - pointer.x),
  ).toBeLessThanOrEqual(2);
  expect(
    pointer.y - (tooltipBox!.y + tooltipBox!.height),
  ).toBeGreaterThanOrEqual(14);
});

test("all middleware fixtures expose their observable behavior", async ({
  page,
}) => {
  await page.goto("/middleware");
  await expect(page.locator('#middleware-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );
  await expect(
    page
      .locator(".route-copy")
      .getByRole("heading", { level: 2, name: "Middleware" }),
  ).toBeVisible();
  await expect(page.locator(".middleware-title a")).toHaveCount(8);
  await expect(
    page.getByRole("link", {
      name: "Auto placement middleware official documentation",
    }),
  ).toHaveAttribute("href", "https://floating-ui.com/docs/autoplacement");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBe(0);

  const offsetStages = page.locator(
    '#middleware-offset .mw-static-stage',
  );
  const zeroReference = await offsetStages
    .nth(0)
    .locator("button")
    .boundingBox();
  const zeroFloating = await offsetStages
    .nth(0)
    .locator(".mw-panel")
    .boundingBox();
  const tenReference = await offsetStages
    .nth(1)
    .locator("button")
    .boundingBox();
  const tenFloating = await offsetStages
    .nth(1)
    .locator(".mw-panel")
    .boundingBox();
  const zeroGap = zeroReference!.y - (zeroFloating!.y + zeroFloating!.height);
  const tenGap = tenReference!.y - (tenFloating!.y + tenFloating!.height);
  expect(tenGap - zeroGap).toBeCloseTo(10, 0);

  const shiftStage = page.locator(".mw-stage-shift");
  const shiftPanel = shiftStage.locator(".mw-panel");
  await expect
    .poll(async () => {
      const stage = await shiftStage.boundingBox();
      const panel = await shiftPanel.boundingBox();
      return {
        left: panel!.x - stage!.x,
        right: stage!.x + stage!.width - (panel!.x + panel!.width),
      };
    })
    .toMatchObject({ left: expect.any(Number), right: expect.any(Number) });
  const shiftBounds = await Promise.all([
    shiftStage.boundingBox(),
    shiftPanel.boundingBox(),
  ]);
  expect(shiftBounds[1]!.x).toBeGreaterThanOrEqual(shiftBounds[0]!.x + 7);
  expect(shiftBounds[1]!.x + shiftBounds[1]!.width).toBeLessThanOrEqual(
    shiftBounds[0]!.x + shiftBounds[0]!.width - 7,
  );

  const flipStage = page.locator(".mw-stage-flip");
  const flipPanel = flipStage.locator(".mw-panel");
  await flipStage.evaluate((element) => {
    element.scrollTop = 80;
  });
  await expect(flipPanel).toHaveAttribute("data-placement", /^top/);
  await flipStage.evaluate((element) => {
    element.scrollTop = 160;
  });
  await expect(flipPanel).toHaveAttribute("data-placement", /^bottom/);
  const [flipStageBox, flipPanelBox] = await Promise.all([
    flipStage.boundingBox(),
    flipPanel.boundingBox(),
  ]);
  expect(flipPanelBox!.x).toBeGreaterThanOrEqual(flipStageBox!.x + 7);
  expect(flipPanelBox!.x + flipPanelBox!.width).toBeLessThanOrEqual(
    flipStageBox!.x + flipStageBox!.width - 7,
  );

  const arrowStage = page.locator(".mw-stage-arrow");
  const arrow = arrowStage.locator(".mw-arrow");
  await expect(arrow).toHaveAttribute("style", /(?:left|top):/);
  await expect(arrowStage.locator(".mw-panel-arrow")).toHaveAttribute(
    "data-placement",
    /^top/,
  );
  await expect
    .poll(() =>
      arrow.evaluate((element) => ({
        top: (element as HTMLElement).style.top,
        bottom: (element as HTMLElement).style.bottom,
      })),
    )
    .toEqual({ top: "", bottom: "-7px" });
  const arrowRoot = arrowStage.locator("floating-root");
  await arrowRoot.evaluate(async (element) => {
    const root = element as HTMLElement & {
      placement: string;
      updateComplete: Promise<unknown>;
      updatePosition(): Promise<unknown>;
    };
    root.placement = "bottom";
    await root.updateComplete;
    await root.updatePosition();
  });
  await expect(arrowStage.locator(".mw-panel-arrow")).toHaveAttribute(
    "data-placement",
    /^bottom/,
  );
  await expect
    .poll(() =>
      arrow.evaluate((element) => ({
        top: (element as HTMLElement).style.top,
        bottom: (element as HTMLElement).style.bottom,
        transform: (element as HTMLElement).style.transform,
      })),
    )
    .toEqual({ top: "-7px", bottom: "", transform: "rotate(0deg)" });
  await arrowRoot.evaluate(async (element) => {
    const root = element as HTMLElement & {
      placement: string;
      updateComplete: Promise<unknown>;
      updatePosition(): Promise<unknown>;
    };
    root.placement = "top";
    await root.updateComplete;
    await root.updatePosition();
  });
  const [arrowPanelBox, arrowBox, arrowReferenceBox] = await Promise.all([
    arrowStage.locator(".mw-panel-arrow").boundingBox(),
    arrow.boundingBox(),
    arrowStage.locator("button").boundingBox(),
  ]);
  const panelToReferenceGap =
    arrowReferenceBox!.y - (arrowPanelBox!.y + arrowPanelBox!.height);
  const arrowTipToReferenceGap =
    arrowReferenceBox!.y - (arrowBox!.y + arrowBox!.height);
  expect(panelToReferenceGap).toBeCloseTo(
    MIDDLEWARE_ARROW.height + MIDDLEWARE_ARROW.gap,
    0,
  );
  expect(arrowTipToReferenceGap).toBeCloseTo(MIDDLEWARE_ARROW.gap, 0);
  expect(arrowBox!.x).toBeGreaterThanOrEqual(arrowPanelBox!.x - 3);
  expect(arrowBox!.x + arrowBox!.width).toBeLessThanOrEqual(
    arrowPanelBox!.x + arrowPanelBox!.width + 3,
  );
  expect(
    Math.abs(
      arrowReferenceBox!.x +
        arrowReferenceBox!.width / 2 -
        (arrowBox!.x + arrowBox!.width / 2),
    ),
    // The centered arrow can shift with the floating panel to remain inside its
    // constrained scroll stage; it must still stay visibly associated with its
    // reference rather than escaping the panel bounds checked above.
  ).toBeLessThanOrEqual(40);

  const sizeStage = page.locator(".mw-stage-size");
  const sizePanel = sizeStage.locator(".mw-panel-size");
  await expect(sizePanel).not.toHaveAttribute("popover");
  const maxHeight = await sizePanel.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).maxHeight),
  );
  expect(maxHeight).toBeGreaterThan(0);
  expect(maxHeight).toBeLessThan((await sizeStage.boundingBox())!.height);
  await expect(sizePanel).toHaveCSS("overflow", "hidden");
  const [sizeCardBox, sizePanelBox] = await Promise.all([
    page.locator("#middleware-size").boundingBox(),
    sizePanel.boundingBox(),
  ]);
  expect(sizeCardBox).not.toBeNull();
  expect(sizePanelBox).not.toBeNull();
  expect(sizePanelBox!.y).toBeGreaterThanOrEqual(sizeCardBox!.y);
  expect(sizePanelBox!.y + sizePanelBox!.height).toBeLessThanOrEqual(
    sizeCardBox!.y + sizeCardBox!.height,
  );

  const autoStage = page.locator(".mw-stage-auto-placement");
  const autoPanel = autoStage.locator(".mw-panel-auto");
  await autoStage.evaluate((element) => {
    element.scrollTop = 40;
  });
  await expect(autoPanel).toHaveAttribute("data-placement", /^top/);
  await autoStage.evaluate((element) => {
    element.scrollTop = 190;
  });
  await expect(autoPanel).toHaveAttribute("data-placement", /^bottom/);
  const [autoStageBox, autoPanelBox] = await Promise.all([
    autoStage.boundingBox(),
    autoPanel.boundingBox(),
  ]);
  expect(autoPanelBox!.x).toBeGreaterThanOrEqual(autoStageBox!.x + 7);
  expect(autoPanelBox!.x + autoPanelBox!.width).toBeLessThanOrEqual(
    autoStageBox!.x + autoStageBox!.width - 7,
  );

  const hideStage = page.locator(".mw-stage-hide");
  const hidePanel = hideStage.locator(".mw-panel-hide");
  await expect(hidePanel).not.toHaveAttribute("popover");
  await hideStage.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(hidePanel).toHaveAttribute("data-reference-hidden", "true");
  await expect(hidePanel).toBeHidden();
  await expect(
    page.locator('#hide .mw-state-readout'),
  ).toContainText("reference hidden");

  const inlineMetrics = await page
    .locator('#middleware-inline')
    .evaluate((example) => {
      const references = example.querySelectorAll(".mw-inline-reference");
      const panels = example.querySelectorAll(".mw-panel-inline");
      const withoutReference = references[0]!.getBoundingClientRect();
      const withReferenceRects = [...references[1]!.getClientRects()];
      const withoutPanel = panels[0]!.getBoundingClientRect();
      const withPanel = panels[1]!.getBoundingClientRect();
      const center = (rect: DOMRect) => rect.x + rect.width / 2;
      return {
        lines: withReferenceRects.length,
        withoutDistance: Math.abs(
          center(withoutPanel) - center(withoutReference),
        ),
        withDistance: Math.abs(
          center(withPanel) - center(withReferenceRects[0]!),
        ),
      };
    });
  expect(inlineMetrics.lines).toBeGreaterThan(1);
  expect(inlineMetrics.withoutDistance).toBeLessThanOrEqual(2);
  expect(inlineMetrics.withDistance).toBeLessThanOrEqual(2);
});

test("async Web Component server combobox renders, selects, and paginates", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/demo/destinations")) {
      requests.push(request.url());
    }
  });

  await page.goto("/combobox?framework=wc&source=server");
  const input = page.locator("#remote-destination-search");
  const popup = page.locator(".async-combobox-popup");

  await input.fill("japan");
  const firstResult = popup.getByRole("option", {name: /^Japan/});
  await expect(firstResult).toBeVisible();
  expect(
    requests.some(
      (url) => new URL(url).searchParams.get("q") === "japan",
    ),
  ).toBe(true);

  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(input).toHaveValue("Japan");
  await expect(popup).toBeHidden();

  await input.fill("");
  await expect(popup.getByRole("option")).toHaveCount(8);
  await expect(popup).toHaveCSS("max-height", "384px");
  await expect(popup.getByRole("button", {name: "Show next 8"})).toBeVisible();
  await popup.getByRole("button", {name: "Show next 8"}).click();
  await expect(popup.getByRole("option")).toHaveCount(16);
  await expect(popup.locator(".combobox-pagination-progress")).toHaveText(
    /16\s+of\s*240 loaded/,
  );
});

test("keeps middleware surfaces and arrows visible without popup scrollbars", async ({
  page,
}) => {
  await page.goto("/middleware");
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const metrics = await page.locator("#middleware-demo").evaluate((demo) => {
    const panels = [...demo.querySelectorAll<HTMLElement>(".mw-panel")];
    const arrow = demo.querySelector<HTMLElement>(".mw-arrow");
    const arrowPanel = demo.querySelector<HTMLElement>(".mw-panel-arrow");
    const rect = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return {x: box.x, y: box.y, right: box.right, bottom: box.bottom};
    };
    return {
      overflow: panels.map((panel) => ({
        className: panel.className,
        value: getComputedStyle(panel).overflow,
      })),
      sizeScroll: (() => {
        const panel = demo.querySelector<HTMLElement>(".mw-panel-size")!;
        return {
          width: panel.scrollWidth - panel.clientWidth,
          height: panel.scrollHeight - panel.clientHeight,
        };
      })(),
      arrow: arrow && arrowPanel ? {arrow: rect(arrow), panel: rect(arrowPanel)} : null,
      stages: [...demo.querySelectorAll<HTMLElement>(".mw-stage")].map((stage) => ({
        scrollbarGutter: getComputedStyle(stage).scrollbarGutter,
        x: getComputedStyle(stage).overflowX,
        y: getComputedStyle(stage).overflowY,
        scrollWidth: stage.scrollWidth,
        clientWidth: stage.clientWidth,
        scrollHeight: stage.scrollHeight,
        clientHeight: stage.clientHeight,
        scrollbar: {
          width: getComputedStyle(stage, "::-webkit-scrollbar").width,
          height: getComputedStyle(stage, "::-webkit-scrollbar").height,
        },
      })),
    };
  });

  expect(
    metrics.overflow
      .filter((panel) => !panel.className.includes("mw-panel-size"))
      .every((panel) => panel.value === "visible"),
  ).toBe(true);
  expect(
    metrics.overflow.find((panel) => panel.className.includes("mw-panel-size"))
      ?.value,
  ).toBe("hidden");
  expect(metrics.sizeScroll.width).toBe(0);
  expect(metrics.sizeScroll.height).toBeGreaterThanOrEqual(0);
  expect(metrics.arrow).not.toBeNull();
  expect(metrics.arrow!.arrow.x).toBeGreaterThanOrEqual(metrics.arrow!.panel.x - 1);
  expect(metrics.arrow!.arrow.right).toBeLessThanOrEqual(metrics.arrow!.panel.right + 1);
  expect(metrics.arrow!.arrow.bottom).toBeLessThanOrEqual(metrics.arrow!.panel.bottom + 8);
  expect(metrics.stages.some((stage) => stage.x === "auto" && stage.scrollWidth > stage.clientWidth)).toBe(true);
  expect(metrics.stages.some((stage) => stage.y === "auto" && stage.scrollHeight > stage.clientHeight)).toBe(true);
  expect(metrics.stages.every((stage) => stage.scrollbarGutter === "stable")).toBe(true);
  expect(metrics.stages.every((stage) => stage.scrollbar.width === "10px" && stage.scrollbar.height === "10px")).toBe(true);
  for (const panel of await page.locator(".mw-panel").all()) {
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  }
});

test("keeps WC size and hide contained after document scrolling", async ({
  page,
}) => {
  if (page.viewportSize()?.width !== 1280) test.skip();
  await page.setViewportSize({width: 1426, height: 1648});
  await page.goto("/middleware");
  await expect(page.locator('#middleware-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );

  const sizeCard = page.locator("#middleware-size");
  const sizePanel = page.locator(".mw-stage-size .mw-panel-size");
  await sizeCard.scrollIntoViewIfNeeded();
  await expect(sizePanel).toBeVisible();
  const [sizeCardBox, sizePanelBox] = await Promise.all([
    sizeCard.boundingBox(),
    sizePanel.boundingBox(),
  ]);
  expect(sizeCardBox).not.toBeNull();
  expect(sizePanelBox).not.toBeNull();
  expect(sizePanelBox!.x).toBeGreaterThanOrEqual(sizeCardBox!.x);
  expect(sizePanelBox!.y).toBeGreaterThanOrEqual(sizeCardBox!.y);
  expect(sizePanelBox!.x + sizePanelBox!.width).toBeLessThanOrEqual(
    sizeCardBox!.x + sizeCardBox!.width,
  );
  expect(sizePanelBox!.y + sizePanelBox!.height).toBeLessThanOrEqual(
    sizeCardBox!.y + sizeCardBox!.height,
  );

  const hideStage = page.locator(".mw-stage-hide");
  const hidePanel = page.locator(".mw-panel-hide");
  await hideStage.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(hidePanel).toHaveAttribute("data-reference-hidden", "true");
  await expect(hidePanel).toBeHidden();
  await expect(page.locator('#hide .mw-state-readout')).toHaveText(
    "State: reference hidden",
  );
});

test("placement controls drive all 12 component positions", async ({
  page,
}) => {
  await page.goto("/placement");
  await expect(page.locator('#placement-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );

  const webPanel = page.locator('.framework-panel--web-components');
  await expect(
    page
      .locator(".route-copy")
      .getByRole("heading", { level: 2, name: "Placement" }),
  ).toBeVisible();
  await expect(webPanel.locator(".placement-control")).toHaveCount(12);

  const floating = webPanel.locator(".placement-floating");
  const reference = webPanel.locator(".placement-reference");
  await expect(floating).toHaveAttribute("data-placement", "top");

  const bottomStart = webPanel.getByRole("button", {
    name: "Place floating element at bottom-start",
  });
  await bottomStart.click();
  await expect(bottomStart).toHaveAttribute("aria-pressed", "true");
  await expect(floating).toHaveAttribute("data-placement", "bottom-start");

  const [floatingBox, referenceBox] = await Promise.all([
    floating.boundingBox(),
    reference.boundingBox(),
  ]);
  expect(floatingBox).not.toBeNull();
  expect(referenceBox).not.toBeNull();
  expect(floatingBox!.y).toBeGreaterThan(
    referenceBox!.y + referenceBox!.height,
  );
  expect(Math.abs(floatingBox!.x - referenceBox!.x)).toBeLessThanOrEqual(2);
});

test("multilingual combobox keeps input focus and renders results", async ({
  page,
}) => {
  await page.goto("/combobox?framework=wc");
  await expect(page.locator('#combobox-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );
  const input = page.getByRole("combobox", {
    name: "Destination",
    exact: true,
  });
  const webPanel = page.locator('.framework-panel--web-components');

  await webPanel.getByRole("tab", { name: "Server search" }).click();
  await expect(page).toHaveURL(/\/combobox\?framework=wc&source=server$/);
  await expect(webPanel.locator('#async-combobox-demo')).toBeVisible();
  await webPanel.getByRole("tab", { name: "Fuzzy search" }).click();
  await expect(page).toHaveURL(/\/combobox\?framework=wc&source=fuzzy$/);

  await input.focus();
  await expect(page.getByRole("option")).toHaveCount(4);
  await webPanel.locator('.search-sample[value="bejing"]').click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("bejing");
  const firstResult = page.getByRole("option", { name: /^北京/ });
  await expect(firstResult).toBeVisible();
  await expect(firstResult).toHaveCSS("min-height", "58px");
  await expect(firstResult).toHaveCSS("padding", "9px 11px");
  await expect(firstResult).toHaveCSS("border-radius", "8px");

  for (const [query, expected] of [
    ["서을", "서울"],
    ["とうきょ", "東京"],
    ["bejing", "北京"],
    ["munchen", "München"],
    ["대한민국", "서울"],
    ["日本", "東京"],
    ["china", "北京"],
    ["deutschland", "München"],
  ] as const) {
    await input.fill(query);
    await expect(
      page.getByRole("option", { name: new RegExp(expected) }),
    ).toBeVisible();
  }

  await input.fill("");
  await expect(page.getByRole("option")).toHaveCount(4);

  await input.fill("bejing");
  const option = page.getByRole("option", { name: /北京/ });
  await expect(option).toBeVisible();
  const popup = page.locator(".combobox-popup:visible");
  await expect(popup).toHaveCSS("position", "absolute");
  expect(
    await popup.evaluate((element) =>
      Boolean(element.closest("floating-portal-target")),
    ),
  ).toBe(false);

  await input.press("ArrowDown");
  await expect(input).toBeFocused();
  await expect
    .poll(() => input.getAttribute("aria-activedescendant"))
    .toMatch(/-beijing$/);
  const activeOptionId = await input.getAttribute("aria-activedescendant");
  await expect(
    popup.locator(`[id="${activeOptionId}"] strong`),
  ).toHaveText("北京");
  await input.press("Enter");
  await expect(input).toHaveValue("北京");
  await expect(popup).toBeHidden();

  await input.fill("no-such-destination");
  await expect(page.getByText(/No destination found/)).toBeVisible();

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run({
      include: [[".combobox-card"], [".combobox-popup"]],
    });
    return result.violations.filter((violation: { impact: string | null }) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );
  });
  expect(violations).toEqual([]);
  await input.press("Escape");
  await expect(popup).toBeHidden();
});

test("async server combobox renders loading and ignores stale requests", async ({
  page,
}) => {
  await page.goto("/combobox?source=server");
  await expect(page.locator('#async-combobox-demo')).toHaveAttribute(
    "data-initialized",
    "true",
  );
  const input = page.getByRole("combobox", { name: "Remote destination" });
  const popup = page.locator(".async-combobox-popup");

  await input.focus();
  await input.fill("seo");
  await expect(popup.getByText("Querying remote endpoint…")).toBeVisible();
  await input.fill("bei");
  await expect(popup.getByRole("option", { name: /^China/ })).toBeVisible();
  expect(
    await popup.evaluate((element) =>
      Boolean(element.closest("floating-portal-target")),
    ),
  ).toBe(false);
  await expect(popup.getByRole("option", { name: /^서울/ })).toHaveCount(0);

  await input.fill("no-remote-match");
  await expect(popup.getByText(/server found no match/)).toBeVisible();
  await input.fill("");
  await expect(popup.getByRole("option")).toHaveCount(8);

  await input.fill("tokyo");
  await expect(popup.getByRole("option")).toHaveCount(1);
  const option = popup.getByRole("option", { name: /^Japan/ });
  await expect(option).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(input).toHaveValue("Japan");
  await expect(popup).toBeHidden();
});
