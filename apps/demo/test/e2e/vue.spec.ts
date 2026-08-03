import { expect, test } from "playwright/test";
import axe from "axe-core";
import { MIDDLEWARE_ARROW } from "../../src/middleware-registry";

test("owns Vue menu navigation, typeahead, and item dismissal", async ({
  page,
}) => {
  await page.goto("/menu?framework=vue");
  const trigger = page.getByRole("button", { name: /Open navigator/ });
  await trigger.click();
  await trigger.press("ArrowDown");

  const first = page.getByRole("menuitem", { name: /North star/ });
  const signal = page.getByRole("menuitem", { name: /Signal log/ });
  await expect(first).toBeFocused();
  await first.press("s");
  await expect(signal).toBeFocused();
  await signal.click();
  await expect(page.getByRole("menu")).toBeHidden();
});

test("opens native nested menu popovers in place", async ({ page }) => {
  await page.goto("/nested-menu?framework=vue");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Floating UI Plus/,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open actions" }).click();
  const rootMenu = page.locator("#vue-actions-menu");
  await expect(rootMenu).toBeVisible();
  await expect(rootMenu).toHaveAttribute("popover", "manual");
  await expect(rootMenu).not.toHaveAttribute("data-fup-portal");

  await page
    .getByRole("menuitem", { name: /Move to project/ })
    .press("ArrowRight");
  const projectMenu = page.locator("#vue-project-menu");
  await expect(projectMenu).toBeVisible();
  await expect(projectMenu).toHaveAttribute("popover", "manual");
  await expect(projectMenu).not.toHaveAttribute("data-fup-portal");
  expect((await projectMenu.boundingBox())?.y).toBeGreaterThan(0);
  const projectTrigger = page.getByRole("menuitem", {
    name: /Move to project/,
  });
  const atlas = page.getByRole("menuitem", { name: /Atlas/ });
  await expect(atlas).toBeFocused();
  await atlas.press("Escape");
  await expect(projectMenu).toBeHidden();
  await expect(projectTrigger).toBeFocused();
  await projectTrigger.press("ArrowRight");
  await page.getByRole("menuitem", { name: /Field research/ }).click();
  await expect(rootMenu).toBeHidden();
});

test("traps modal focus and closes on Escape", async ({ page }) => {
  await page.goto("/modal?framework=vue");
  const demo = page.locator('.framework-panel--vue');
  const trigger = demo.getByRole("button", { name: /Enter focus room/ });
  await trigger.click();
  const dialog = demo.getByRole("dialog", {
    name: /You are inside the focus trap/,
  });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(
    true,
  );
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(
    Math.abs(dialogBox!.x + dialogBox!.width / 2 - viewport!.width / 2),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(dialogBox!.y + dialogBox!.height / 2 - viewport!.height / 2),
  ).toBeLessThanOrEqual(1);

  const hintTrigger = demo.getByRole("button", { name: "Show placement hint" });
  await hintTrigger.hover();
  const tooltip = demo.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS("z-index", "30");
  await expect(tooltip).toHaveCSS("background-color", "rgb(23, 58, 50)");
  await expect(tooltip).toHaveCSS("padding", "10px 13px");
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(dialog).toBeVisible();

  await demo.getByRole("button", { name: "Open room details" }).click();
  const popover = demo.getByRole("dialog", { name: "Room details" });
  await expect(popover).toBeVisible();
  expect(
    await popover.evaluate((element) => {
      return (
        element.matches(":popover-open") &&
        document.querySelector(".vue-modal-demo")?.contains(element)
      );
    }),
  ).toBe(true);
  await demo.getByRole("button", { name: "Close details" }).click();
  await expect(popover).toBeHidden();
  await demo.getByRole("button", { name: "Open room details" }).click();
  await expect(popover).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(dialog).toBeVisible();

  const nestedDialogTrigger = demo.getByRole("button", {
    name: "Open nested dialog",
  });
  await nestedDialogTrigger.click();
  const nestedDialog = demo.getByRole("dialog", { name: "Nested dialog" });
  await expect(nestedDialog).toBeVisible();
  expect(
    await nestedDialog.evaluate((element) => element.matches(":modal")),
  ).toBe(true);
  const nestedDialogBox = await nestedDialog.boundingBox();
  expect(nestedDialogBox).not.toBeNull();
  expect(
    Math.abs(
      nestedDialogBox!.x + nestedDialogBox!.width / 2 - viewport!.width / 2,
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      nestedDialogBox!.y + nestedDialogBox!.height / 2 - viewport!.height / 2,
    ),
  ).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Return to focus room" }).click();
  await expect(nestedDialog).toBeHidden();
  await expect(nestedDialogTrigger).toBeFocused();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await demo.getByRole("button", { name: "Leave room" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("opens the Vue edge sheet as a modal and restores focus on Escape", async ({
  page,
}) => {
  await page.goto("/sheet?framework=vue");
  const demo = page.locator('.framework-panel--vue');
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

test("places every Vue sheet side on the viewport edge after reopening", async ({
  page,
}) => {
  await page.goto("/sheet?framework=vue");
  const demo = page.locator('.framework-panel--vue');
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

test("stacks, pauses, focuses, and dismisses Vue toasts", async ({ page }) => {
  await page.goto("/toast?framework=vue");
  const create = page.getByRole("button", { name: /Create notification/ });
  const viewport = page.getByRole("region", { name: "Notifications" });

  await create.click();
  await create.click();
  const toasts = viewport.locator(".toast-item");
  await expect(toasts).toHaveCount(2);
  const firstToast = toasts.first();
  await expect(firstToast).toHaveAttribute("data-status", "open");
  expect(
    await firstToast.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        inBottomRight:
          rect.right >= innerWidth - 48 && rect.bottom >= innerHeight - 48,
        popoverOpen: element.matches(":popover-open"),
      };
    }),
  ).toEqual({inBottomRight: true, popoverOpen: true});

  await firstToast.hover();
  await expect(viewport).toHaveAttribute("data-presence-paused", "");
  await page.keyboard.press("F6");
  await expect(
    viewport.getByRole("button", {name: "Dismiss notification 2"}),
  ).toBeFocused();

  await viewport
    .getByRole("button", { name: "Dismiss notification 1" })
    .click();
  await expect(
    viewport.getByRole("button", { name: "Dismiss notification 1" }),
  ).toHaveCount(0);

  await create.click();
  const recreated = viewport.locator(".toast-item").filter({
    hasText: "Notification 3 created",
  });
  await expect(recreated).toHaveCount(1);
  await expect(recreated).toHaveAttribute("data-status", "open");
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

test("filters and executes the Vue command palette with the keyboard", async (
  {page},
  testInfo,
) => {
  await page.goto("/command?framework=vue");
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
  await input.fill("billing");
  const billing = dialog.locator('.command-item').filter({hasText: "Billing"});
  await expect(billing).toBeVisible();
  await expect(dialog.locator('.command-item')).toHaveCount(1);
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(
    page.locator('.framework-panel--vue .command-result'),
  ).toHaveText("Billing selected.");
  await expect(trigger).toBeFocused();
  await page.keyboard.press(
    testInfo.project.name === "desktop-webkit" ? "Meta+k" : "Control+k",
  );
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("routes to individual Vue examples and the middleware lab", async ({
  page,
}) => {
  const legacyResponse = await page.goto("/vue/examples/tooltip");
  expect(legacyResponse?.status()).toBe(404);

  await page.goto("/tooltip?framework=vue");
  await expect(
    page.getByRole("heading", { level: 2, name: "Tooltip" }),
  ).toBeVisible();
  const navigation = page.getByRole("navigation", {
    name: "All patterns",
  });
  await expect(navigation).toHaveCSS("position", "sticky");
  await navigation.locator(".pattern-picker-trigger").click();
  await navigation.getByRole("link", { name: "Popover" }).click();
  await expect(page).toHaveURL(/\/popover\?framework=vue$/);
  const currentNavigation = page.getByRole("navigation", {
    name: "All patterns",
  });
  await currentNavigation.locator(".pattern-picker-trigger").click();
  await expect(
    currentNavigation.locator('.pattern-picker-panel a[href*="/popover"]'),
  ).toHaveAttribute("aria-current", "page");

  await page.goto("/tooltip?framework=vue");
  await page.getByRole("button", { name: /Inspect signal/ }).hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS("position", "absolute");
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

  await page.goto("/middleware?framework=vue");
  await expect(
    page
      .locator(".route-copy")
      .getByRole("heading", { level: 2, name: "Middleware" }),
  ).toBeVisible();
  await expect(page.locator(".vue-middleware-card")).toHaveCount(8);
  await expect(page.locator(".vue-mw-panel")).toHaveCount(10);
  await expect(page.locator(".vue-middleware-title a")).toHaveCount(8);
  await expect(
    page.getByRole("link", {
      name: "Auto placement middleware official documentation",
    }),
  ).toHaveAttribute("href", "https://floating-ui.com/docs/autoplacement");

  const offsetPanels = page.locator('[data-kind="offset"] .vue-mw-panel');
  await expect(offsetPanels).toHaveCount(2);
  const zeroOffsetBox = await offsetPanels.nth(0).boundingBox();
  const tenOffsetBox = await offsetPanels.nth(1).boundingBox();
  const offsetDelta = Math.abs(
    (zeroOffsetBox?.y ?? 0) - (tenOffsetBox?.y ?? 0),
  );
  if ((page.viewportSize()?.width ?? 0) <= 520) {
    expect(offsetDelta).toBeGreaterThan(100);
  } else {
    expect(offsetDelta).toBeCloseTo(10, 0);
  }

  const flipStage = page.locator('[data-kind="flip"] .vue-mw-stage');
  await flipStage.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(
    page.locator('[data-kind="flip"] .vue-mw-panel'),
  ).toHaveAttribute("data-placement", "top");
  await flipStage.evaluate((element) => {
    element.scrollTop = 160;
    element.dispatchEvent(new Event("scroll"));
  });
  const flipPanel = page.locator('[data-kind="flip"] .vue-mw-panel');
  await expect(flipPanel).toHaveAttribute("data-placement", "bottom");
  const [flipStageBox, flipPanelBox] = await Promise.all([
    flipStage.boundingBox(),
    flipPanel.boundingBox(),
  ]);
  expect(flipPanelBox!.x).toBeGreaterThanOrEqual(flipStageBox!.x + 7);
  expect(flipPanelBox!.x + flipPanelBox!.width).toBeLessThanOrEqual(
    flipStageBox!.x + flipStageBox!.width - 7,
  );

  const autoStage = page.locator('[data-kind="auto"] .vue-mw-stage');
  const autoPanel = page.locator('[data-kind="auto"] .vue-mw-panel');
  await autoStage.evaluate((element) => {
    element.scrollTop = 40;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(autoPanel).toHaveAttribute("data-placement", "top");
  await autoStage.evaluate((element) => {
    element.scrollTop = 190;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(autoPanel).toHaveAttribute("data-placement", "bottom");
  const [autoStageBox, autoPanelBox] = await Promise.all([
    autoStage.boundingBox(),
    autoPanel.boundingBox(),
  ]);
  expect(autoPanelBox!.x).toBeGreaterThanOrEqual(autoStageBox!.x + 7);
  expect(autoPanelBox!.x + autoPanelBox!.width).toBeLessThanOrEqual(
    autoStageBox!.x + autoStageBox!.width - 7,
  );

  const hideStage = page.locator('[data-kind="hide"] .vue-mw-stage');
  await hideStage.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(
    page.locator('[data-kind="hide"] .vue-mw-panel'),
  ).toHaveAttribute("data-reference-hidden", "true");

  const arrowCard = page.locator('[data-kind="arrow"]');
  const arrowPanel = arrowCard.locator(".vue-mw-panel");
  const arrowElement = arrowCard.locator(".vue-mw-arrow");
  const arrowReference = arrowCard.locator(".vue-mw-reference");
  await expect(arrowElement).toBeVisible();
  await expect(arrowPanel).toHaveAttribute("data-placement", "top");
  const [arrowPanelBox, arrowBox, arrowReferenceBox] = await Promise.all([
    arrowPanel.boundingBox(),
    arrowElement.boundingBox(),
    arrowReference.boundingBox(),
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
  await expect(page.locator('[data-kind="inline"] .vue-mw-panel')).toHaveCount(
    2,
  );
});

test("keeps Vue middleware surfaces and arrows visible without popup scrollbars", async ({
  page,
}) => {
  await page.goto("/middleware?framework=vue");
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const metrics = await page.locator(".vue-middleware-grid").evaluate((demo) => {
    const panels = [...demo.querySelectorAll<HTMLElement>(".vue-mw-panel")];
    const arrow = demo.querySelector<HTMLElement>(".vue-mw-arrow");
    const arrowPanel = demo.querySelector<HTMLElement>(".vue-mw-panel-arrow");
    const box = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {x: rect.x, right: rect.right, bottom: rect.bottom};
    };
    return {
      overflow: panels.map((panel) => getComputedStyle(panel).overflow),
      sizeScroll: (() => {
        const panel = demo.querySelector<HTMLElement>(".vue-mw-panel-size")!;
        return {width: panel.scrollWidth - panel.clientWidth, height: panel.scrollHeight - panel.clientHeight};
      })(),
      arrow: arrow && arrowPanel ? {arrow: box(arrow), panel: box(arrowPanel)} : null,
      stages: [...demo.querySelectorAll<HTMLElement>(".vue-mw-stage")].map((stage) => ({
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
  expect(metrics.overflow.every((value) => value === "visible")).toBe(true);
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
  for (const panel of await page.locator(".vue-mw-panel").all()) {
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  }
});

test("placement constants drive all 12 Vue positions", async ({ page }) => {
  await page.goto("/placement?framework=vue");

  await expect(
    page
      .locator(".route-copy")
      .getByRole("heading", { level: 2, name: "Placement" }),
  ).toBeVisible();
  const vuePanel = page.locator('.framework-panel--vue');
  await expect(vuePanel.locator(".vue-placement-control")).toHaveCount(12);

  const floating = vuePanel.locator(".vue-placement-floating");
  const reference = vuePanel.locator(".vue-placement-reference");
  await expect(floating).toHaveAttribute("data-placement", "top");

  const bottomStart = vuePanel.getByRole("button", {
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

test("multilingual Vue combobox keeps input focus in a native popover", async ({
  page,
}) => {
  await page.goto("/combobox?framework=vue");
  const input = page.getByRole("combobox", {
    name: "Destination",
    exact: true,
  });
  const vuePanel = page.locator('.framework-panel--vue');

  await vuePanel.getByRole("tab", { name: "Server search" }).click();
  await expect(page).toHaveURL(/\/combobox\?framework=vue&source=server$/);
  await expect(
    vuePanel.getByRole("combobox", { name: "Remote destination" }),
  ).toBeVisible();
  await vuePanel.getByRole("tab", { name: "Fuzzy search" }).click();
  await expect(page).toHaveURL(/\/combobox\?framework=vue&source=fuzzy$/);
  await expect(input).toBeVisible();

  await input.focus();
  await expect(page.getByRole("option")).toHaveCount(4);
  await vuePanel.locator('#vue-query-sample-bejing').click();
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
  const popup = page.locator(".vue-combobox-popup:visible");
  await expect(popup).toHaveAttribute("popover", "manual");
  expect(
    await popup.evaluate((element) =>
      Boolean(element.closest("[data-fup-portal]")),
    ),
  ).toBe(false);

  await input.press("ArrowDown");
  await expect(input).toBeFocused();
  await expect
    .poll(() => input.getAttribute("aria-activedescendant"))
    .toBe(await option.getAttribute("id"));
  await input.press("Enter");
  await expect(input).toHaveValue("北京");
  await expect(popup).toBeHidden();

  await input.fill("no-such-destination");
  await expect(page.getByText(/No destination found/)).toBeVisible();

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run({
      include: [[".vue-combobox-card"], [".vue-combobox-popup"]],
    });
    return result.violations.filter((violation: { impact: string | null }) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    );
  });
  expect(violations).toEqual([]);
  await input.press("Escape");
  await expect(popup).toBeHidden();
});

test("async Vue server combobox renders loading and ignores stale requests", async ({
  page,
}) => {
  await page.goto("/combobox?framework=vue&source=server");
  const input = page.locator("#vue-remote-search");
  const popup = page.locator(".vue-async-combobox-popup");

  await input.focus();
  await input.fill("seo");
  await expect(popup.getByText("Querying remote endpoint…")).toBeVisible();
  await input.fill("bei");
  await expect(popup.getByRole("option", { name: /^China/ })).toBeVisible();
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

test("async Vue server combobox renders, selects, and paginates", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/demo/destinations")) {
      requests.push(request.url());
    }
  });

  await page.goto("/combobox?framework=vue&source=server");
  const input = page.locator("#vue-remote-search");
  const popup = page.locator(".vue-async-combobox-popup");

  await input.focus();
  await expect(input).toHaveCSS("box-sizing", "border-box");
  await expect(input).toHaveCSS("padding", "13px 42px 13px 14px");
  await expect(input).toHaveCSS("border-radius", "10px");
  await expect(input).toHaveCSS("border-top-width", "1px");

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
  await expect(popup.getByText("16 of 240 loaded")).toBeVisible();
});
