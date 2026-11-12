import { beforeEach, vi } from "vitest";

class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** jsdom has no IntersectionObserver or ResizeObserver and no layout; components that watch size or scroll render with these stubs, and Playwright tests cover what they report. */
export function installInertObservers() {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", InertObserver);
    vi.stubGlobal("ResizeObserver", InertObserver);
  });
}
