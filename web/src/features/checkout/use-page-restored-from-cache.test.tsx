import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePageRestoredFromCache } from "./use-page-restored-from-cache";

function showPage(isPersisted: boolean) {
  window.dispatchEvent(
    new PageTransitionEvent("pageshow", { persisted: isPersisted }),
  );
}

describe("usePageRestoredFromCache", () => {
  it("calls back when the browser restores the page from its cache", () => {
    const onRestore = vi.fn();
    renderHook(() => usePageRestoredFromCache(onRestore));

    showPage(true);

    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it("stays silent for a normal page load", () => {
    const onRestore = vi.fn();
    renderHook(() => usePageRestoredFromCache(onRestore));

    showPage(false);

    expect(onRestore).not.toHaveBeenCalled();
  });

  it("calls the newest callback after a re-render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ onRestore }) => usePageRestoredFromCache(onRestore),
      { initialProps: { onRestore: first } },
    );
    rerender({ onRestore: second });

    showPage(true);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops listening after unmount", () => {
    const onRestore = vi.fn();
    const { unmount } = renderHook(() => usePageRestoredFromCache(onRestore));
    unmount();

    showPage(true);

    expect(onRestore).not.toHaveBeenCalled();
  });
});
