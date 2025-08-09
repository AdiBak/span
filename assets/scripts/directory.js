import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qujzohvrbfsouakzocps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const stateAbbrToFullName = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia"
};

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("directoryContainer");
  if (!container) return;

  // Loading state
  container.innerHTML = `
    <div class="text-center my-5 py-5">
      <div class="spinner-border text-secondary" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading directory...</p>
    </div>
  `;

  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let filterText = "";
  let currentSortKey = "name";
  let sortAsc = true;
  let membersData = [];

  try {
    const { data, error } = await supabase.from("members").select("*").eq("active", true);
    if (error) throw error;

    membersData = data.map(m => {
      const firstName = (m.first_name || "").trim();
      const lastName = (m.last_name || "").trim();
      return {
        firstName,
        lastName,
        name: (firstName || lastName) ? `${firstName} ${lastName}`.trim() : m.email || "",
        school: m.school_name || "",
        city: m.city || "",
        state: m.state || "",
        location: (m.city && m.state) ? `${m.city}, ${m.state}` : (m.city || m.state || ""),
        email: m.email || "",
        role: m.role || "",
        image: m.image || "default.jpg"
      };
    }).sort(sortByName);

    renderUI();
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle-fill"></i> Failed to load member data. Please try again later.
      </div>
    `;
    console.error("Directory load error:", error);
  }

  function sortByName(a, b) {
    const lastA = (a.lastName || a.name.split(" ").slice(-1)[0] || "").toLowerCase();
    const lastB = (b.lastName || b.name.split(" ").slice(-1)[0] || "").toLowerCase();
    if (lastA === lastB) {
      const firstA = (a.firstName || a.name.split(" ").slice(0, -1).join(" ") || "").toLowerCase();
      const firstB = (b.firstName || b.name.split(" ").slice(0, -1).join(" ") || "").toLowerCase();
      return firstA.localeCompare(firstB);
    }
    return lastA.localeCompare(lastB);
  }

  function renderUI() {
    container.innerHTML = `
      <div class="mb-4 d-flex justify-content-end">
        <input type="search" id="directorySearch" class="form-control" placeholder="Search by name, school, or location..." style="max-width: 400px;">
      </div>
      <div class="table-responsive">
        <table class="animate__animated animate__fadeIn table table-striped table-hover align-middle" style="min-width: 600px">
          <thead class="bg-white text-dark">
            <tr>
              <th><span>Name</span> <button data-key="name" class="btn btn-sm p-0 ms-2 sort-btn"><i class="bi bi-arrow-down-up"></i></button></th>
              <th><span>Location</span> <button data-key="location" class="btn btn-sm p-0 ms-2 sort-btn"><i class="bi bi-arrow-down-up"></i></button></th>
              <th>Email</th>
              <th><span>Role</span> <button data-key="role" class="btn btn-sm p-0 ms-2 sort-btn"><i class="bi bi-arrow-down-up"></i></button></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div id="paginationContainer" class="mt-3 d-flex justify-content-center"></div>
    `;

    const searchInput = container.querySelector("#directorySearch");
    const tbody = container.querySelector("tbody");
    const paginationContainer = container.querySelector("#paginationContainer");
    const sortButtons = container.querySelectorAll(".sort-btn");
    const sortableKeys = ["name", "location", "role"];

    sortButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        if (key && sortableKeys.includes(key)) {
          if (currentSortKey === key) {
            sortAsc = !sortAsc;
          } else {
            currentSortKey = key;
            sortAsc = true;
          }
          currentPage = 1;
          updateSortIndicators();
          renderTable();
        }
      });
    });

    // Debounce function to limit render calls during typing
    function debounce(fn, delay = 300) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    }

    searchInput.addEventListener("input", debounce(e => {
      filterText = e.target.value.trim().toLowerCase();
      currentPage = 1;
      updateURL();
      renderTable();
    }));

    updateSortIndicators();
    initSearchFromURL();
    renderTable();

    function updateSortIndicators() {
      sortButtons.forEach(btn => {
        const key = btn.dataset.key;
        if (key === currentSortKey) {
          btn.innerHTML = sortAsc ? `<i class="bi bi-arrow-up"></i>` : `<i class="bi bi-arrow-down"></i>`;
          btn.style.color = "#0d6efd";
        } else {
          btn.innerHTML = `<i class="bi bi-arrow-down-up"></i>`;
          btn.style.color = "#777";
        }
      });
    }

    function getFilteredData() {
      if (!filterText) return [...membersData]; // shallow copy to avoid side effects

      return membersData.filter(member =>
        ["name", "school", "location", "email", "role"].some(field =>
          (member[field] || "").toLowerCase().includes(filterText)
        )
      );
    }

    function renderTable() {
      const data = getFilteredData();

      data.sort((a, b) => {
        if (currentSortKey === "name") {
          return sortAsc ? sortByName(a, b) : sortByName(b, a);
        }
        const valA = (a[currentSortKey] || "").toLowerCase();
        const valB = (b[currentSortKey] || "").toLowerCase();
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });

      tbody.innerHTML = "";

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center text-muted py-4">
              ${filterText ? `No results found for "${filterText}"` : "No members available."}
            </td>
          </tr>
        `;
        paginationContainer.innerHTML = "";
        return;
      }

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const pageItems = data.slice(start, start + ITEMS_PER_PAGE);

      // Use DocumentFragment to minimize reflows
      const fragment = document.createDocumentFragment();

      for (const member of pageItems) {
        const fullState = stateAbbrToFullName[(member.state || "").toUpperCase()] || "";
        const stateFlagSrc = fullState
          ? `/assets/images/states/${fullState}.svg`
          : `/assets/images/states/placeholder.svg`;
        const stateFlagAlt = fullState ? `${fullState} flag` : "Location";

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${member.image}" 
                   alt="${member.name}" width="32" height="32" class="rounded-circle object-fit-cover">
              ${member.name}
            </div>
          </td>
          <td>
            <img src="${stateFlagSrc}" height="18" style="margin-right:6px" alt="${stateFlagAlt}">
            ${member.location}
          </td>
          <td>
            ${member.email ? `<a href="mailto:${member.email}" class="btn btn-sm btn-outline-dark"><i class="bi bi-envelope"></i> Email</a>` : ""}
          </td>
          <td>${member.role}</td>
        `;

        fragment.appendChild(tr);
      }
      tbody.appendChild(fragment);

      renderPagination(data.length);
    }

    function renderPagination(totalItems) {
      const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
      if (totalPages <= 1) {
        paginationContainer.innerHTML = "";
        return;
      }

      let html = `
        <nav>
          <ul class="pagination pagination-sm justify-content-center">
            <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
              <button class="page-link" aria-label="Previous" ${currentPage === 1 ? "disabled" : ""}>
                <i class="bi bi-chevron-left"></i>
              </button>
            </li>
      `;

      for (let i = 1; i <= totalPages; i++) {
        html += `
          <li class="page-item ${i === currentPage ? "active" : ""}">
            <button class="page-link" aria-current="${i === currentPage ? "page" : ""}">${i}</button>
          </li>
        `;
      }

      html += `
            <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
              <button class="page-link" aria-label="Next" ${currentPage === totalPages ? "disabled" : ""}>
                <i class="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      `;

      paginationContainer.innerHTML = html;

      // Event delegation for pagination buttons
      paginationContainer.querySelector("ul").onclick = (e) => {
        const btn = e.target.closest("button");
        if (!btn || btn.disabled) return;

        if (btn.parentElement.classList.contains("disabled") || btn.parentElement.classList.contains("active")) return;

        if (btn.getAttribute("aria-label") === "Previous" && currentPage > 1) {
          currentPage--;
          renderTable();
        } else if (btn.getAttribute("aria-label") === "Next" && currentPage < totalPages) {
          currentPage++;
          renderTable();
        } else {
          const pageNum = Number(btn.textContent);
          if (!isNaN(pageNum) && pageNum !== currentPage) {
            currentPage = pageNum;
            renderTable();
          }
        }
      };
    }

    function updateURL() {
      const url = new URL(window.location);
      if (filterText) url.searchParams.set("search", filterText);
      else url.searchParams.delete("search");
      window.history.pushState({}, "", url);
    }

    function initSearchFromURL() {
      const params = new URLSearchParams(window.location.search);
      const search = params.get("search");
      if (search) {
        filterText = search.toLowerCase();
        searchInput.value = search;
        currentPage = 1;
      }
    }

    window.addEventListener("popstate", () => {
      initSearchFromURL();
      renderTable();
    });
  }
});
