
document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const state = {
    dark: false,
    notifications: [],
    search: "",
    period: "month",
    activePage: "overview"
  };

  const notify = (message, type = "info") => {
    let toast = $(".toast") || $(".notification");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("show");

    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  };

  const closeMenu = () => {
    const nav = $(".nav-links");
    const toggle = $(".menu-toggle");

    nav?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
  };

  const menuToggle = $(".menu-toggle");

  menuToggle?.addEventListener("click", () => {
    const nav = $(".nav-links");
    if (!nav) return;

    const isOpen = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  $$(".nav-links a").forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");

      closeMenu();

      if (href?.startsWith("#")) {
        const target = $(href);
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", href);
        }
      }
    });
  });

  document.addEventListener("click", event => {
    const nav = $(".nav-links");
    if (
      nav?.classList.contains("open") &&
      !nav.contains(event.target) &&
      !menuToggle?.contains(event.target)
    ) {
      closeMenu();
    }
  });

  const sections = $$("main section[id], section[id]");
  const navLinks = $$(".nav-links a[href^='#']");

  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        navLinks.forEach(link => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("active", active);

          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-25% 0px -65% 0px" });

    sections.forEach(section => observer.observe(section));
  }

  const sidebarLinks = $$(".sidebar-nav a, .sidebar-link");
  const dashboardPanels = $$("[data-dashboard-page]");
  const pageTitle = $("[data-dashboard-title]");

  const showDashboardPage = (page, clickedLink) => {
    state.activePage = page;

    sidebarLinks.forEach(link => {
      const linkPage = link.dataset.page ||
        link.getAttribute("href")?.replace(/^#/, "");

      const active = linkPage === page;
      link.classList.toggle("active", active);

      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    dashboardPanels.forEach(panel => {
      panel.hidden = panel.dataset.dashboardPage !== page;
    });

    if (pageTitle && clickedLink) {
      pageTitle.textContent =
        clickedLink.dataset.title ||
        clickedLink.textContent.trim();
    }

    const matchingPanel = $(`[data-dashboard-page="${page}"]`);

    if (matchingPanel) {
      matchingPanel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }

    document.dispatchEvent(new CustomEvent("dashboard:pagechange", {
      detail: { page }
    }));
  };

  sidebarLinks.forEach(link => {
    link.addEventListener("click", event => {
      const page = link.dataset.page ||
        link.getAttribute("href")?.replace(/^#/, "");

      if (!page) return;

      const matchingPanel = $(`[data-dashboard-page="${page}"]`);

      if (matchingPanel) {
        event.preventDefault();
        showDashboardPage(page, link);
      } else if (link.getAttribute("href")?.startsWith("#")) {
        const target = $(link.getAttribute("href"));

        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  const themeToggle = $("[data-theme-toggle]") ||
    $("#themeToggle") ||
    $(".theme-toggle");

  const applyTheme = dark => {
    state.dark = dark;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.body.classList.toggle("dark-theme", dark);
    document.body.classList.toggle("light-theme", !dark);

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(dark));
      themeToggle.setAttribute(
        "aria-label",
        dark ? "Switch to light theme" : "Switch to dark theme"
      );

      const label = $("[data-theme-label]", themeToggle);
      if (label) label.textContent = dark ? "Light mode" : "Dark mode";
    }

    $$("[data-theme-icon]").forEach(icon => {
      icon.textContent = dark ? "☀" : "☾";
    });
  };

  themeToggle?.addEventListener("click", () => {
    applyTheme(!state.dark);
  });

  const notificationButton = $("[data-notifications]") ||
    $("#notificationBtn") ||
    $(".notification-btn");

  const notificationPanel = $("[data-notification-panel]");

  notificationButton?.addEventListener("click", () => {
    if (notificationPanel) {
      const open = !notificationPanel.hidden;
      notificationPanel.hidden = open;
      notificationButton.setAttribute("aria-expanded", String(!open));
    } else {
      notify("You're all caught up!");
    }
  });

  $$("[data-notification-close]").forEach(button => {
    button.addEventListener("click", () => {
      if (notificationPanel) notificationPanel.hidden = true;
    });
  });

  const updateBadge = () => {
    const badge = $("[data-notification-count]") ||
      $(".notification-count");

    if (badge) {
      badge.textContent = String(state.notifications.length);
      badge.hidden = state.notifications.length === 0;
    }
  };

  const addNotification = message => {
    state.notifications.unshift({
      id: Date.now(),
      message,
      time: new Date()
    });

    const list = $("[data-notification-list]");

    if (list) {
      const item = document.createElement("div");
      item.className = "activity-item notification-item";
      item.textContent = message;
      list.prepend(item);
    }

    updateBadge();
    notify(message);
  };

  $$("[data-dismiss-notification]").forEach(button => {
    button.addEventListener("click", () => {
      const item = button.closest(".notification-item, .activity-item");
      item?.remove();
      notify("Notification dismissed.");
    });
  });

  const periodButtons = $$("[data-period]");
  const chartBars = $$(".analytics-chart .bar, .chart-bars span");
  const chartLabels = $$(".chart-labels span");
  const chartTitle = $("[data-chart-title]");

  const chartData = {
    week: {
      title: "Weekly performance",
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [38, 62, 47, 78, 56, 88, 70]
    },
    month: {
      title: "Monthly performance",
      labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
      values: [48, 70, 54, 86, 64, 92, 76]
    },
    year: {
      title: "Yearly performance",
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      values: [32, 50, 45, 72, 61, 88, 95]
    }
  };

  const updateChart = period => {
    const data = chartData[period];
    if (!data) return;

    state.period = period;

    periodButtons.forEach(button => {
      const active = button.dataset.period === period;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (chartTitle) chartTitle.textContent = data.title;

    chartBars.forEach((bar, index) => {
      const value = data.values[index % data.values.length];

      if (bar.classList.contains("bar")) {
        bar.style.setProperty("--height", `${value}%`);
      } else {
        bar.style.height = `${value}%`;
      }

      bar.title = `${value}%`;
    });

    chartLabels.forEach((label, index) => {
      label.textContent = data.labels[index % data.labels.length];
    });
  };

  periodButtons.forEach(button => {
    button.addEventListener("click", () => {
      updateChart(button.dataset.period);
    });
  });

  const searchInputs = $$("[data-search], #dashboardSearch, .dashboard-search");
  const searchableRows = $$("[data-searchable], tbody tr");

  const filterSearch = query => {
    state.search = query.trim().toLowerCase();

    searchableRows.forEach(row => {
      const matches = row.textContent.toLowerCase().includes(state.search);
      row.hidden = !matches;
    });

    const resultCount = $("[data-search-results]");
    if (resultCount) {
      const visible = searchableRows.filter(row => !row.hidden).length;
      resultCount.textContent = `${visible} result${visible === 1 ? "" : "s"}`;
    }
  };

  searchInputs.forEach(input => {
    input.addEventListener("input", () => filterSearch(input.value));
  });

  const filterSelects = $$("[data-filter]");

  filterSelects.forEach(select => {
    select.addEventListener("change", () => {
      const filterName = select.dataset.filter;
      const filterValue = select.value.toLowerCase();

      $$(`[data-filter-group="${filterName}"]`).forEach(item => {
        const itemValue = (
          item.dataset.filterValue ||
          item.textContent
        ).toLowerCase();

        item.hidden = filterValue !== "all" &&
          !itemValue.includes(filterValue);
      });
    });
  });

  const exportButton = $("[data-export]") ||
    $("#exportBtn");

  exportButton?.addEventListener("click", () => {
    const table = $("table[data-export-table]") || $("table");

    if (!table) {
      notify("No table data is available to export.");
      return;
    }

    const csv = $$("tr", table).map(row =>
      $$("th, td", row).map(cell =>
        `"${cell.innerText.replace(/"/g, '""').trim()}"`
      ).join(",")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "nexora-dashboard-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("CSV export downloaded.");
  });

  $$("details.faq-item").forEach(item => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;

      $$("details.faq-item").forEach(other => {
        if (other !== item) other.open = false;
      });
    });
  });

  $$("[data-faq-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const answer = button.nextElementSibling;
      if (!answer) return;

      const opening = answer.hidden;
      answer.hidden = !opening;
      button.setAttribute("aria-expanded", String(opening));
    });
  });

  $$("[data-modal-open]").forEach(button => {
    button.addEventListener("click", () => {
      const modal = $(`#${button.dataset.modalOpen}`);

      if (!modal) {
        notify(button.dataset.message || "Demo action selected.");
        return;
      }

      if (typeof modal.showModal === "function") {
        modal.showModal();
      } else {
        modal.hidden = false;
        modal.classList.add("open");
      }
    });
  });

  $$("[data-modal-close]").forEach(button => {
    button.addEventListener("click", () => {
      const modal = button.closest("dialog, [data-modal]");

      if (modal?.tagName === "DIALOG") {
        modal.close();
      } else if (modal) {
        modal.hidden = true;
        modal.classList.remove("open");
      }
    });
  });

  $$("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  $$("[data-plan]").forEach(button => {
    button.addEventListener("click", () => {
      const plan = button.dataset.plan;
      const planInput = $('input[name="plan"]');

      if (planInput) planInput.value = plan;

      const planSelect = $('select[name="plan"]');
      if (planSelect) planSelect.value = plan;

      const target = $("[data-plan-form]") || $("#contact");

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        notify(`${plan} plan selected. Complete the form to continue.`);
      } else {
        notify(`${plan} plan selected for the demo.`);
      }
    });
  });

  $$("form[data-demo-form]").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const formData = new FormData(form);
      const values = Object.fromEntries(formData.entries());

      document.dispatchEvent(new CustomEvent("demo:formsubmit", {
        detail: values
      }));

      notify("Demo form submitted successfully.");
      form.reset();
    });
  });

  $$("[data-demo-action]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.demoAction;

      if (action === "refresh") {
        updateChart(state.period);
        notify("Dashboard refreshed with demo data.");
      } else if (action === "new-report") {
        notify("Report creation is ready for backend integration.");
      } else if (action === "invite") {
        const email = prompt("Enter the email address to invite:");

        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          addNotification(`Invitation prepared for ${email}.`);
        } else if (email) {
          notify("Enter a valid email address.", "error");
        }
      } else {
        notify(button.dataset.message || "Demo action completed.");
      }
    });
  });

  $$("[data-copy]").forEach(button => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy;

      try {
        await navigator.clipboard.writeText(value);
        notify("Copied to clipboard.");
      } catch {
        notify("Clipboard access is unavailable in this browser.");
      }
    });
  });

  $$("[data-counter]").forEach(counter => {
    const target = Number(counter.dataset.counter);
    if (!Number.isFinite(target)) return;

    const format = new Intl.NumberFormat();
    counter.textContent = "0";

    const animate = () => {
      const duration = 1000;
      const start = performance.now();

      const step = now => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        counter.textContent = format.format(
          Math.round(target * eased)
        );

        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          animate();
          observer.disconnect();
        }
      });

      observer.observe(counter);
    } else {
      animate();
    }
  });

  const currentYear = $("[data-current-year]");
  if (currentYear) currentYear.textContent = new Date().getFullYear();

  updateChart("month");
  updateBadge();

  document.dispatchEvent(new CustomEvent("nexora:ready"));

  document.getElementById("get-strt-btn").addEventListener("click", () => {
    alert("Sorry Backend is required to contact...")
  });
});


