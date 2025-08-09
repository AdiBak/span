import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qujzohvrbfsouakzocps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function renderSchoolCarousel() {
  const carousel = document.getElementById("schoolCarousel");
  if (!carousel) return;

  // Fetch school data from Supabase
  const { data: schools, error } = await supabase
    .from("schools")
    .select("school_name, school_image");

  if (error) {
    console.error("Failed to fetch schools from Supabase:", error);
    return;
  }

  const sortedSchools = [...schools].sort((a, b) => a.display_order - b.display_order);


  const repeatCount = 4;
  let html = "";

  for (let i = 0; i < repeatCount; i++) {
    for (const school of sortedSchools) {
      html += `
        <div class="school-logo-item">
          <img src="https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/schools-images/${school.school_image}"
               alt="${school.school_name}"
               class="school-logo"
               title="View ${school.school_name} members"
               loading="lazy"
               data-school="${school.school_name}"
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
