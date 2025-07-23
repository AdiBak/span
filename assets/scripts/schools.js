import { schools } from "/assets/data/schools.js";

function handleSchoolClick(schoolName) {
  if (window.location.pathname.includes("directory.html")) {
    const event = new CustomEvent("schoolSearch", {
      detail: { school: schoolName },
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(event);
  } else {
    window.location.href = `/directory.html?search=${encodeURIComponent(schoolName)}`;
  }
}

function renderSchoolCarousel() {
  const carousel = document.getElementById("schoolCarousel");
  if (!carousel) return;

  const sortedSchools = [...schools].sort((a, b) =>
    a.school.localeCompare(b.school)
  );

  const repeatCount = 4;
  let html = "";

  for (let i = 0; i < repeatCount; i++) {
    for (const school of sortedSchools) {
      html += `
        <div class="school-logo-item">
          <img src="/assets/images/schools/${school.image}"
               alt="${school.school}"
               class="school-logo"
               title="View ${school.school} members"
               loading="lazy"
               data-school="${school.school}"
               tabindex="0">
        </div>
      `;
    }
  }

  carousel.innerHTML = `<div class="school-carousel-track">${html}</div>`;

  document.querySelectorAll(".school-logo").forEach((logo) => {
    const schoolName = logo.getAttribute("data-school");

    logo.addEventListener("click", () => handleSchoolClick(schoolName));
    logo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSchoolClick(schoolName);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderSchoolCarousel();

  const track = document.querySelector(".school-carousel-track");
  if (track) {
    track.addEventListener("mouseenter", () => {
      track.style.animationPlayState = "paused";
    });
    track.addEventListener("mouseleave", () => {
      track.style.animationPlayState = "running";
    });
  }
});
