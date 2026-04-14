(function () {
  "use strict";

  function elMatches(el, selector) {
    if (!el || el.nodeType !== 1) {
      return false;
    }
    var m =
      el.matches || el.msMatchesSelector || el.webkitMatchesSelector;
    return m ? m.call(el, selector) : false;
  }

  function elClosest(el, selector) {
    if (!el) {
      return null;
    }
    if (el.closest) {
      return el.closest(selector);
    }
    while (el && el.nodeType === 1) {
      if (elMatches(el, selector)) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function eachNodeList(list, fn) {
    for (var i = 0; i < list.length; i++) {
      fn(list[i], i);
    }
  }

  function addClass(el, cls) {
    if (!el || !cls) {
      return;
    }
    if (el.classList) {
      el.classList.add(cls);
    } else if ((" " + el.className + " ").indexOf(" " + cls + " ") === -1) {
      el.className += " " + cls;
    }
  }

  function removeClass(el, cls) {
    if (!el || !cls) {
      return;
    }
    if (el.classList) {
      el.classList.remove(cls);
    } else {
      el.className = el.className
        .replace(new RegExp("\\b" + cls + "\\b", "g"), " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  function addScrollListener(target, handler) {
    if (!target || !target.addEventListener) {
      return;
    }
    try {
      target.addEventListener("scroll", handler, { passive: true });
    } catch (e) {
      target.addEventListener("scroll", handler, false);
    }
  }

  function scrollPageToTop(smooth) {
    if (!window.scrollTo) {
      return;
    }
    if (smooth) {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      } catch (e) {
        /* IE, старые WebKit */
      }
    }
    window.scrollTo(0, 0);
  }

  function scrollElementIntoViewSmooth(el) {
    if (!el) {
      return;
    }
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      el.scrollIntoView(true);
    }
  }

  function setHidden(el, hidden) {
    if (!el) {
      return;
    }
    if (hidden) {
      el.setAttribute("hidden", "hidden");
    } else {
      el.removeAttribute("hidden");
    }
  }

  var reducedMotion = (function () {
    if (!window.matchMedia) {
      return { matches: false };
    }
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch (e) {
      return { matches: false };
    }
  })();

  function motionOk() {
    return !reducedMotion.matches;
  }

  function currentPageFile() {
    var path = window.location.pathname || "";
    if (window.location.protocol === "file:") {
      path = path.replace(/\\/g, "/");
    }
    var raw = path.split("/");
    var parts = [];
    for (var i = 0; i < raw.length; i++) {
      if (raw[i]) {
        parts.push(raw[i]);
      }
    }
    var file = parts.length ? parts[parts.length - 1] : "index.html";
    if (!file || file.indexOf(".") === -1) {
      file = "index.html";
    }
    return file.toLowerCase();
  }

  function normalizeHref(href) {
    if (!href || href.charAt(0) === "#") {
      return null;
    }
    try {
      var a = document.createElement("a");
      a.href = href;
      var seg = (a.pathname || "").split("/").pop();
      return (seg || "index.html").toLowerCase();
    } catch (e) {
      return null;
    }
  }

  function initNavActive() {
    var current = currentPageFile();
    eachNodeList(document.querySelectorAll(".nav a[href]"), function (link) {
      var target = normalizeHref(link.getAttribute("href"));
      if (target && target === current) {
        addClass(link, "is-current");
        if (elClosest(link, ".primary-nav")) {
          link.setAttribute("aria-current", "page");
        }
      }
    });
  }

  function initHeaderScroll() {
    var header = document.querySelector(".primary-header");
    if (!header) {
      return;
    }
    var compact = false;
    var SCROLL_COMPACT = 48;
    var SCROLL_EXPAND = 10;

    function tick() {
      var y =
        window.scrollY ||
        window.pageYOffset ||
        (document.documentElement && document.documentElement.scrollTop) ||
        0;
      if (!compact && y > SCROLL_COMPACT) {
        compact = true;
        addClass(header, "is-scrolled");
      } else if (compact && y < SCROLL_EXPAND) {
        compact = false;
        removeClass(header, "is-scrolled");
      }
    }

    tick();
    addScrollListener(window, tick);
  }

  function markRevealElements() {
    var selectors = [
      ".hero",
      ".teaser",
      ".speaker-info",
      ".venue-theatre",
      ".venue-hotel",
      ".docs-article",
      ".row table",
    ];
    for (var s = 0; s < selectors.length; s++) {
      eachNodeList(document.querySelectorAll(selectors[s]), function (el) {
        if (el.hasAttribute("data-reveal")) {
          return;
        }
        var parentMarked = el.parentElement
          ? elClosest(el.parentElement, "[data-reveal]")
          : null;
        if (parentMarked) {
          return;
        }
        el.setAttribute("data-reveal", "");
      });
    }
  }

  function initReveal() {
    markRevealElements();
    var nodes = document.querySelectorAll("[data-reveal]");

    if (!motionOk()) {
      eachNodeList(nodes, function (el) {
        addClass(el, "is-visible");
      });
      return;
    }

    if (!nodes.length || !("IntersectionObserver" in window)) {
      eachNodeList(nodes, function (el) {
        addClass(el, "is-visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries, obs) {
        eachNodeList(entries, function (entry) {
          if (entry.isIntersecting) {
            addClass(entry.target, "is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0 }
    );

    eachNodeList(nodes, function (el) {
      io.observe(el);
    });
  }

  function initSmoothAnchors() {
    if (!motionOk()) {
      return;
    }
    document.addEventListener("click", function (e) {
      var t = e.target || e.srcElement;
      var a = elClosest(t, 'a[href^="#"]');
      if (!a) {
        return;
      }
      var hash = a.getAttribute("href");
      if (!hash || hash === "#") {
        return;
      }
      var id = hash.slice(1);
      var target = document.getElementById(id);
      if (!target) {
        return;
      }
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }
      scrollElementIntoViewSmooth(target);
    });
  }

  function initBackToTop() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "back-to-top";
    btn.setAttribute("aria-label", "Наверх");
    btn.appendChild(document.createTextNode("\u2191"));
    document.body.appendChild(btn);

    function sync() {
      var y =
        window.scrollY ||
        window.pageYOffset ||
        (document.documentElement && document.documentElement.scrollTop) ||
        0;
      var show = y > 400;
      if (show) {
        addClass(btn, "is-visible");
      } else {
        removeClass(btn, "is-visible");
      }
      setHidden(btn, !show);
    }

    sync();
    addScrollListener(window, sync);

    btn.addEventListener("click", function () {
      scrollPageToTop(motionOk());
    });
  }

  function bindTilt(card) {
    function applyTilt(clientX, clientY) {
      var r = card.getBoundingClientRect();
      var x = clientX - r.left;
      var y = clientY - r.top;
      var px = (x / r.width - 0.5) * 2;
      var py = (y / r.height - 0.5) * 2;
      if (card.style && card.style.setProperty) {
        card.style.setProperty(
          "--tilt-x",
          (-py * 4).toFixed(2) + "deg"
        );
        card.style.setProperty("--tilt-y", (px * 6).toFixed(2) + "deg");
      }
    }
    function leave() {
      if (card.style && card.style.setProperty) {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      }
    }
    if (window.PointerEvent) {
      card.addEventListener("pointermove", function (e) {
        applyTilt(e.clientX, e.clientY);
      });
      card.addEventListener("pointerleave", leave);
    } else {
      card.addEventListener("mousemove", function (e) {
        applyTilt(e.clientX, e.clientY);
      });
      card.addEventListener("mouseleave", leave);
    }
  }

  function initTeaserLift() {
    if (!motionOk()) {
      return;
    }
    eachNodeList(document.querySelectorAll(".teaser"), function (card) {
      bindTilt(card);
    });
  }

  function run() {
    initNavActive();
    initHeaderScroll();
    initReveal();
    initSmoothAnchors();
    initBackToTop();
    initTeaserLift();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
