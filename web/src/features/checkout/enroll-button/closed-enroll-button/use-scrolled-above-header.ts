import { useEffect, useRef, useState, type RefObject } from "react";

// Marks the `<header>` in site-header.tsx.
const SITE_HEADER_SELECTOR = "[data-site-header]";

// Stretches the watched area far below the screen, so an element below the
// fold counts as inside it. A jump from below the fold to above the header then
// still crosses the area's edge and fires the observer.
const BELOW_SCREEN_MARGIN = "100000%";

function makeRootMargin(header: Element | null): string {
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
  return `-${headerBottom}px 0px ${BELOW_SCREEN_MARGIN} 0px`;
}

function isAboveRootTop(entry: IntersectionObserverEntry): boolean {
  return (
    !entry.isIntersecting &&
    entry.rootBounds !== null &&
    entry.boundingClientRect.bottom <= entry.rootBounds.top
  );
}

/**
 * Returns a ref for the element to watch and whether the visitor has scrolled
 * it fully above the header's bottom edge. An element below the screen is not
 * scrolled past. It starts false, so server and browser render the same HTML.
 */
export function useScrolledAboveHeader<Watched extends Element>(): [
  RefObject<Watched | null>,
  boolean,
] {
  const watchedRef = useRef<Watched>(null);
  const [isScrolledPast, setIsScrolledPast] = useState(false);

  useEffect(() => {
    const watched = watchedRef.current;
    if (!watched) return;
    const header = document.querySelector(SITE_HEADER_SELECTOR);
    let observer: IntersectionObserver;

    function watchBelowHeader() {
      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => setIsScrolledPast(isAboveRootTop(entry)),
        { rootMargin: makeRootMargin(header) },
      );
      observer.observe(watched!);
    }

    watchBelowHeader();
    const headerResizeObserver = new ResizeObserver(watchBelowHeader);
    if (header) headerResizeObserver.observe(header);
    return () => {
      headerResizeObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return [watchedRef, isScrolledPast];
}
