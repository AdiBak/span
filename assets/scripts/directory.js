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

  const searchContainer = document.createElement("div");
  searchContainer.className = "d-flex justify-content-end mb-3";
  container.appendChild(searchContainer);

  const filterInput = document.createElement("input");
  filterInput.type = "search";
  filterInput.placeholder = "Search members...";
  filterInput.className = "form-control";
  filterInput.style.maxWidth = "400px";
  searchContainer.appendChild(filterInput);

  const responsiveWrapper = document.createElement("div");
  responsiveWrapper.className = "table-responsive";
  container.appendChild(responsiveWrapper);

  const table = document.createElement("table");
  table.className = "table table-striped table-hover align-middle";
  table.style.minWidth = "600px";
  responsiveWrapper.appendChild(table);

  const paginationContainer = document.createElement("div");
  paginationContainer.id = "paginationContainer";
  paginationContainer.className = "mt-3 d-flex justify-content-center";
  container.appendChild(paginationContainer);

  const headers = ["Name", "Location", "Email", "Role"];
  const keys = ["name", "school", "location", "email", "role"];

  const thead = document.createElement("thead");
  thead.className = "bg-white text-dark";
  table.appendChild(thead);

  const trHead = document.createElement("tr");
  thead.appendChild(trHead);

  let currentSortKey = "name";
  let sortAsc = true;
  let currentPage = 1;
  let filterText = "";

  const membersData = members.map(m => ({
    name: `${m.firstName} ${m.lastName}`,
    school: m.school || "",
    location: m.city && m.state ? `${m.city}, ${m.state}` : (m.location || ""),
    city: m.city || "",
    state: m.state || "",
    email: m.email || "",
    role: m.position || "",
    image: m.image || "default.png"
  }));

  headers.forEach((headerText, i) => {
    const th = document.createElement("th");
    th.style.userSelect = "none";
    th.style.whiteSpace = "nowrap";
    th.style.verticalAlign = "middle";
    th.style.padding = "0.5rem 0.75rem";

    const headerContainer = document.createElement("div");
    headerContainer.className = "d-flex align-items-center justify-content-between";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = headerText;
    labelSpan.style.overflow = "hidden";
    labelSpan.style.textOverflow = "ellipsis";
    labelSpan.style.whiteSpace = "nowrap";
    headerContainer.appendChild(labelSpan);

    if (keys[i] !== "email") {
      const sortBtn = document.createElement("button");
      sortBtn.className = "btn btn-sm p-0 ms-2";
      sortBtn.style.color = "#6c757d"; // Default muted gray-blue
      sortBtn.style.background = "transparent";
      sortBtn.style.border = "none";
      sortBtn.innerHTML = `<i class="bi bi-arrow-down-up"></i>`;
      sortBtn.title = `Sort ${headerText}`;
      sortBtn.setAttribute("aria-label", `Sort ${headerText}`);
      sortBtn.addEventListener("click", () => {
        if (currentSortKey === keys[i]) {
          sortAsc = !sortAsc;
        } else {
          currentSortKey = keys[i];
          sortAsc = true;
        }
        currentPage = 1;
        updateSortIndicators();
        renderTableBody();
        renderPagination();
      });
      headerContainer.appendChild(sortBtn);
    }

    th.appendChild(headerContainer);
    trHead.appendChild(th);
  });

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  function updateSortIndicators() {
    const ths = thead.querySelectorAll("th");
    ths.forEach((th, i) => {
      if (keys[i] === "email") return;

      const sortBtn = th.querySelector("button");
      if (!sortBtn) return;

      sortBtn.style.color = "#777";
      sortBtn.innerHTML = `<i class="bi bi-arrow-down-up"></i>`;

      if (keys[i] === currentSortKey) {
        sortBtn.style.color = "#0d6efd"; // Bootstrap primary blue
        sortBtn.innerHTML = sortAsc
          ? `<i class="bi bi-arrow-up"></i>`
          : `<i class="bi bi-arrow-down"></i>`;
      }
    });
  }

  function getFilteredSortedData() {
    const filtered = membersData.filter(member =>
      ["name", "school", "email", "location", "role"].some(key =>
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

      const tdName = document.createElement("td");
      const nameContainer = document.createElement("div");
      nameContainer.className = "d-flex align-items-center gap-2";

      const profileImg = document.createElement("img");
      profileImg.src = `/assets/images/team/${member.image}`;
      profileImg.alt = `${member.name}'s profile`;
      profileImg.style.width = "32px";
      profileImg.style.height = "32px";
      profileImg.style.borderRadius = "50%";
      profileImg.style.objectFit = "cover";
      profileImg.style.border = "1px solid #ddd";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = member.name;

      nameContainer.appendChild(profileImg);
      nameContainer.appendChild(nameSpan);
      tdName.appendChild(nameContainer);
      tr.appendChild(tdName);

      const tdLocation = document.createElement("td");
      const abbr = member.state.toUpperCase();
      const fullStateName = stateAbbrToFullName[abbr] || "";
      const flagSrc = fullStateName
        ? `/assets/images/states/${fullStateName}.svg`
        : "/assets/images/states/placeholder.svg";

      const flagImg = document.createElement("img");
      flagImg.src = flagSrc;
      flagImg.alt = `${abbr} flag`;
      flagImg.style.height = "18px";
      flagImg.style.marginRight = "6px";

      tdLocation.appendChild(flagImg);
      tdLocation.appendChild(document.createTextNode(member.location));
      tr.appendChild(tdLocation);

      const tdEmail = document.createElement("td");
      const emailBtn = document.createElement("a");
      emailBtn.href = `mailto:${member.email}`;
      emailBtn.className = "btn btn-sm btn-outline-dark";
      emailBtn.innerHTML = `<i class="bi bi-envelope"></i> Email`;
      tdEmail.appendChild(emailBtn);
      tr.appendChild(tdEmail);

      const tdRole = document.createElement("td");
      tdRole.textContent = member.role;
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

    let html = `<nav><ul class="pagination pagination-sm justify-content-center">`;

    html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <button class="page-link" data-page="${currentPage - 1}"><i class="bi bi-chevron-left"></i></button></li>`;

    for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item ${i === currentPage ? "active" : ""}">
        <button class="page-link" data-page="${i}">${i}</button></li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <button class="page-link" data-page="${currentPage + 1}"><i class="bi bi-chevron-right"></i></button></li>`;

    html += `</ul></nav>`;
    paginationContainer.innerHTML = html;

    paginationContainer.querySelectorAll("button.page-link").forEach(btn => {
      const page = Number(btn.getAttribute("data-page"));
      btn.addEventListener("click", () => {
        currentPage = page;
        renderTableBody();
        renderPagination();
      });
    });
  }

  filterInput.addEventListener("input", e => {
    filterText = e.target.value.trim().toLowerCase();
    currentPage = 1;
    renderTableBody();
    renderPagination();
  });

  const ITEMS_PER_PAGE = 10;

  updateSortIndicators();
  renderTableBody();
  renderPagination();
    // Autofocus and auto-type into search bar on any key press outside input
  window.addEventListener("keydown", e => {
    const active = document.activeElement;
    if (
      active.tagName !== "INPUT" &&
      active.tagName !== "TEXTAREA" &&
      !active.isContentEditable
    ) {
      filterInput.focus();

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
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

});
