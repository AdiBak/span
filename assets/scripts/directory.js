import { members } from "/assets/data/directory.js";

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

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("directoryContainer");
  if (!container) return;

  // Create Search Input
  const searchContainer = document.createElement("div");
  searchContainer.className = "d-flex flex-column flex-md-row gap-3 mb-3 align-items-center";
  container.appendChild(searchContainer);

  const filterInput = document.createElement("input");
  filterInput.type = "search";
  filterInput.placeholder = "Search members...";
  filterInput.className = "form-control";
  filterInput.style.maxWidth = "400px";
  searchContainer.appendChild(filterInput);

  // Create responsive table wrapper and table
  const responsiveWrapper = document.createElement("div");
  responsiveWrapper.className = "table-responsive";
  container.appendChild(responsiveWrapper);

  const table = document.createElement("table");
  table.className = "table table-striped table-hover align-middle";
  table.style.minWidth = "600px";
  responsiveWrapper.appendChild(table);

  // Pagination container
  const paginationContainer = document.createElement("div");
  paginationContainer.id = "paginationContainer";
  paginationContainer.className = "mt-3 d-flex justify-content-center";
  container.appendChild(paginationContainer);

  const headers = ["Name", "School", "Location", "Email", "Role"];
  const keys = ["name", "school", "location", "email", "role"];

  // Table Head
  const thead = document.createElement("thead");
  thead.className = "bg-primary text-white";
  table.appendChild(thead);

  const trHead = document.createElement("tr");
  thead.appendChild(trHead);

  let currentSortKey = "name";
  let sortAsc = true;
  let currentPage = 1;
  let filterText = "";

  // Format members data with profile images
  const membersData = members.map(m => ({
    name: `${m.firstName} ${m.lastName}`,
    school: m.school || "",
    location: m.city && m.state ? `${m.city}, ${m.state}` : (m.location || ""),
    city: m.city || "",
    state: m.state || "",
    email: m.email || "",
    role: m.position || "",
    image: m.image || "default.png" // Default image if none provided
  }));

  // Build table headers with sort buttons
  headers.forEach((headerText, i) => {
    const th = document.createElement("th");
    th.style.userSelect = "none";
    th.style.whiteSpace = "nowrap";
    th.style.verticalAlign = "middle";
    th.style.padding = "0.5rem 0.75rem";

    const headerContainer = document.createElement("div");
    headerContainer.className = "d-flex flex-column";

    const sortContainer = document.createElement("div");
    sortContainer.style.display = "flex";
    sortContainer.style.alignItems = "center";
    sortContainer.style.justifyContent = "space-between";
    sortContainer.style.gap = "0.5rem";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = headerText;
    labelSpan.style.flexGrow = "1";
    labelSpan.style.overflow = "hidden";
    labelSpan.style.textOverflow = "ellipsis";
    labelSpan.style.whiteSpace = "nowrap";
    sortContainer.appendChild(labelSpan);

    if (keys[i] !== "email") { // Don't add sort for email column
      const sortButtons = document.createElement("div");
      sortButtons.className = "d-flex flex-column";
      sortButtons.style.gap = "0.1rem";

      const sortAscBtn = document.createElement("button");
      sortAscBtn.className = "btn btn-sm p-0";
      sortAscBtn.style.color = "white";
      sortAscBtn.style.opacity = "0.7";
      sortAscBtn.innerHTML = `<i class="bi bi-caret-up-fill" style="font-size:0.7rem;"></i>`;
      sortAscBtn.title = `Sort ${headerText} A-Z`;
      sortAscBtn.setAttribute("aria-label", `Sort ${headerText} A-Z`);
      sortAscBtn.addEventListener("click", () => {
        currentSortKey = keys[i];
        sortAsc = true;
        currentPage = 1;
        updateSortIndicators();
        renderTableBody();
        renderPagination();
      });

      const sortDescBtn = document.createElement("button");
      sortDescBtn.className = "btn btn-sm p-0";
      sortDescBtn.style.color = "white";
      sortDescBtn.style.opacity = "0.7";
      sortDescBtn.innerHTML = `<i class="bi bi-caret-down-fill" style="font-size:0.7rem;"></i>`;
      sortDescBtn.title = `Sort ${headerText} Z-A`;
      sortDescBtn.setAttribute("aria-label", `Sort ${headerText} Z-A`);
      sortDescBtn.addEventListener("click", () => {
        currentSortKey = keys[i];
        sortAsc = false;
        currentPage = 1;
        updateSortIndicators();
        renderTableBody();
        renderPagination();
      });

      sortButtons.appendChild(sortAscBtn);
      sortButtons.appendChild(sortDescBtn);
      sortContainer.appendChild(sortButtons);
    }

    headerContainer.appendChild(sortContainer);
    th.appendChild(headerContainer);
    trHead.appendChild(th);
  });

  // Table Body
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  function updateSortIndicators() {
    const ths = thead.querySelectorAll("th");
    ths.forEach((th, i) => {
      if (keys[i] === "email") return;
      
      const sortButtons = th.querySelector("div.d-flex.flex-column");
      if (!sortButtons) return;
      
      const [ascBtn, descBtn] = sortButtons.querySelectorAll("button");
      
      // Reset all buttons
      ascBtn.style.opacity = "0.7";
      descBtn.style.opacity = "0.7";
      
      if (keys[i] === currentSortKey) {
        if (sortAsc) {
          ascBtn.style.opacity = "1";
          ascBtn.style.transform = "scale(1.2)";
        } else {
          descBtn.style.opacity = "1";
          descBtn.style.transform = "scale(1.2)";
        }
      }
    });
  }

  function getFilteredSortedData() {
    const filtered = membersData.filter(member =>
      ["name", "school", "location", "role"].some(key =>
        member[key].toLowerCase().includes(filterText)
      )
    );

    filtered.sort((a, b) => {
      const valA = (a[currentSortKey] || "").toLowerCase();
      const valB = (b[currentSortKey] || "").toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  function renderTableBody() {
    tbody.innerHTML = "";

    const filteredData = getFilteredSortedData();

    if (filteredData.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = headers.length;
      td.className = "text-center text-muted py-4";
      td.textContent = "No results found. Try a different search term.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredData.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    pageItems.forEach(member => {
      const tr = document.createElement("tr");

      // Name cell with profile image
      const tdName = document.createElement("td");
      tdName.style.minWidth = "120px";
      tdName.style.maxWidth = "180px";
      
      const nameContainer = document.createElement("div");
      nameContainer.style.display = "flex";
      nameContainer.style.alignItems = "center";
      nameContainer.style.gap = "8px";
      
      const profileImg = document.createElement("img");
      profileImg.src = `/assets/images/team/${member.image}`;
      profileImg.alt = `${member.name}'s profile picture`;
      profileImg.style.width = "32px";
      profileImg.style.height = "32px";
      profileImg.style.borderRadius = "50%";
      profileImg.style.objectFit = "cover";
      profileImg.style.border = "1px solid #ddd";
      
      const nameSpan = document.createElement("span");
      nameSpan.textContent = member.name;
      nameSpan.style.overflow = "hidden";
      nameSpan.style.textOverflow = "ellipsis";
      nameSpan.style.whiteSpace = "nowrap";
      
      nameContainer.appendChild(profileImg);
      nameContainer.appendChild(nameSpan);
      tdName.appendChild(nameContainer);
      tr.appendChild(tdName);

      const tdSchool = document.createElement("td");
      tdSchool.textContent = member.school;
      tdSchool.style.maxWidth = "150px";
      tdSchool.style.overflow = "hidden";
      tdSchool.style.textOverflow = "ellipsis";
      tdSchool.style.whiteSpace = "nowrap";
      tr.appendChild(tdSchool);

      const tdLocation = document.createElement("td");
      tdLocation.style.maxWidth = "140px";
      tdLocation.style.overflow = "hidden";
      tdLocation.style.textOverflow = "ellipsis";
      tdLocation.style.whiteSpace = "nowrap";

      const abbr = member.state.toUpperCase();
      const fullStateName = stateAbbrToFullName[abbr] || null;
      const flagSrc = fullStateName
        ? `/assets/images/states/${fullStateName}.svg`
        : "/assets/images/states/placeholder.svg";

      const img = document.createElement("img");
      img.src = flagSrc;
      img.alt = `${abbr} flag`;
      img.style.height = "18px";
      img.style.width = "auto";
      img.style.verticalAlign = "middle";
      img.style.marginRight = "6px";

      tdLocation.appendChild(img);
      tdLocation.appendChild(document.createTextNode(member.location));
      tr.appendChild(tdLocation);

      const tdEmail = document.createElement("td");
      tdEmail.style.minWidth = "50px";
      const aEmail = document.createElement("a");
      aEmail.href = `mailto:${member.email}`;
      aEmail.className = "btn btn-sm btn-outline-dark";
      aEmail.setAttribute("aria-label", `Email ${member.name}`);
      aEmail.innerHTML = `<i class="bi bi-envelope"></i> Email`;
      tdEmail.appendChild(aEmail);
      tr.appendChild(tdEmail);

      const tdRole = document.createElement("td");
      tdRole.textContent = member.role;
      tdRole.style.maxWidth = "120px";
      tdRole.style.overflow = "hidden";
      tdRole.style.textOverflow = "ellipsis";
      tdRole.style.whiteSpace = "nowrap";
      tr.appendChild(tdRole);

      tbody.appendChild(tr);
    });
  }

  function renderPagination() {
    const filteredData = getFilteredSortedData();
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    let html = `<nav aria-label="Member directory pagination"><ul class="pagination pagination-sm justify-content-center">`;

    html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <button class="page-link" data-page="${currentPage - 1}" aria-label="Previous">
        <i class="bi bi-chevron-left"></i>
      </button></li>`;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        html += pageLink(i);
      }
    } else {
      html += pageLink(1);

      if (currentPage > 3) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        html += pageLink(i);
      }

      if (currentPage < totalPages - 2) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }

      html += pageLink(totalPages);
    }

    html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <button class="page-link" data-page="${currentPage + 1}" aria-label="Next">
        <i class="bi bi-chevron-right"></i>
      </button></li>`;

    html += `</ul></nav>`;

    paginationContainer.innerHTML = html;

    paginationContainer.querySelectorAll("button.page-link").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetPage = Number(btn.getAttribute("data-page"));
        if (targetPage >= 1 && targetPage <= totalPages) {
          currentPage = targetPage;
          renderTableBody();
          renderPagination();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });

    function pageLink(pageNum) {
      return `<li class="page-item ${pageNum === currentPage ? "active" : ""}">
        <button class="page-link" data-page="${pageNum}">${pageNum}</button></li>`;
    }
  }

  // Search input listener
  filterInput.addEventListener("input", e => {
    filterText = e.target.value.trim().toLowerCase();
    currentPage = 1;
    renderTableBody();
    renderPagination();
  });

  // Auto-focus and auto-type on any key press outside inputs/textareas/contenteditable
  window.addEventListener("keydown", e => {
    const active = document.activeElement;
    if (
      active.tagName !== "INPUT" &&
      active.tagName !== "TEXTAREA" &&
      !active.isContentEditable
    ) {
      filterInput.focus();

      if (e.key.length === 1) {
        const start = filterInput.selectionStart || 0;
        const end = filterInput.selectionEnd || 0;
        const val = filterInput.value;
        filterInput.value = val.slice(0, start) + e.key + val.slice(end);
        filterInput.selectionStart = filterInput.selectionEnd = start + 1;

        filterInput.dispatchEvent(new Event("input"));
      }

      e.preventDefault();
    }
  });

  const ITEMS_PER_PAGE = 10;

  // Initial render
  updateSortIndicators();
  renderTableBody();
  renderPagination();
});