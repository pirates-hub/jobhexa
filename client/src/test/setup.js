import '@testing-library/jest-dom';

// jsdom (the test DOM) does not implement matchMedia — Home and other pages
// read pointer/motion preferences from it. Minimal faithful stub.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom also lacks the observer APIs used by scroll-reveal animations.
// A stub that immediately reports "visible" keeps component effects running.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    constructor(callback) { this.callback = callback; }
    observe(target) {
      this.callback([{ isIntersecting: true, target, intersectionRatio: 1 }], this);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
