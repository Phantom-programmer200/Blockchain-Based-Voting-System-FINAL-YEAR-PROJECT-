document.addEventListener("DOMContentLoaded", function () {
  // Mobile Navigation Toggle
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");

  function toggleNav() {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  }

  hamburger.addEventListener("click", toggleNav);

  // Close mobile menu when clicking a link
  const navItems = document.querySelectorAll(".nav-links a");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (navLinks.classList.contains("active")) {
        toggleNav();
      }
    });
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href");
      if (targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: "smooth",
        });
      }
    });
  });

  // FAQ Accordion
  const accordionBtns = document.querySelectorAll(".accordion-btn");

  accordionBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");
      const content = this.nextElementSibling;

      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  // Demo Button Interaction
  const demoBtn = document.getElementById("demo-btn");
  if (demoBtn) {
    demoBtn.addEventListener("click", function (e) {
      e.preventDefault();
      alert(
        "Demo functionality would launch an interactive voting simulation here."
      );
      // In a real implementation, this would open a modal or new page with the demo
    });
  }

  // Video Placeholder Interaction
  const videoPlaceholder = document.querySelector(".video-placeholder");
  if (videoPlaceholder) {
    videoPlaceholder.addEventListener("click", function () {
      alert("This would play an explainer video about the voting process.");
      // In a real implementation, this would launch a video player
    });
  }

  // Language Selector
  const languageSelector = document.getElementById("language");
  if (languageSelector) {
    languageSelector.addEventListener("change", function () {
      alert("Language changed to: " + this.value);
      // In a real implementation, this would trigger translation
    });
  }

  // Sticky Navbar on Scroll
  window.addEventListener("scroll", function () {
    const navbar = document.querySelector(".navbar");
    if (window.scrollY > 50) {
      navbar.style.boxShadow = "0 2px 15px rgba(0, 0, 0, 0.1)";
    } else {
      navbar.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
    }
  });

  // Animation on Scroll
  function animateOnScroll() {
    const elements = document.querySelectorAll(
      ".feature-card, .step, .accordion-item"
    );

    elements.forEach((element) => {
      const elementPosition = element.getBoundingClientRect().top;
      const screenPosition = window.innerHeight / 1.2;

      if (elementPosition < screenPosition) {
        element.style.opacity = "1";
        element.style.transform = "translateY(0)";
      }
    });
  }

  // Set initial state for animated elements
  document
    .querySelectorAll(".feature-card, .step, .accordion-item")
    .forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    });

  window.addEventListener("scroll", animateOnScroll);
  window.addEventListener("load", animateOnScroll);
});
