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

  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let filterText = "";
  let currentSortKey = "name";
  let sortAsc = true;

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

  const searchContainer = document.createElement("div");
  searchContainer.className = "d-flex justify-content-end mb-3";
  container.appendChild(searchContainer);

  const filterInput = document.createElement("input");
  filterInput.id = "directorySearch";
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
  const keys = ["name", "location", "email", "role"];

  const thead = document.createElement("thead");
  thead.className = "bg-white text-dark";
  const trHead = document.createElement("tr");
  thead.appendChild(trHead);
  table.appendChild(thead);

  keys.forEach((key, i) => {
    const th = document.createElement("th");
    const container = document.createElement("div");
    container.className = "d-flex align-items-center justify-content-between";
    const label = document.createElement("span");
    label.textContent = headers[i];
    container.appendChild(label);
    if (key !== "email") {
      const btn = document.createElement("button");
      btn.className = "btn btn-sm p-0 ms-2";
      btn.style.background = "transparent";
      btn.style.border = "none";
      btn.innerHTML = `<i class="bi bi-arrow-down-up"></i>`;
      btn.addEventListener("click", () => {
        currentSortKey = key;
        sortAsc = !sortAsc;
        currentPage = 1;
        updateSortIndicators();
        render();
      });
      container.appendChild(btn);
    }
    th.appendChild(container);
    trHead.appendChild(th);
  });

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  function updateSortIndicators() {
    thead.querySelectorAll("th").forEach((th, i) => {
      const key = keys[i];
      const btn = th.querySelector("button");
      if (!btn) return;
      if (key === currentSortKey) {
        btn.innerHTML = sortAsc
          ? `<i class="bi bi-arrow-up"></i>`
          : `<i class="bi bi-arrow-down"></i>`;
        btn.style.color = "#0d6efd";
      } else {
        btn.innerHTML = `<i class="bi bi-arrow-down-up"></i>`;
        btn.style.color = "#777";
      }
    });
  }

  function getFilteredData() {
    const search = filterText.toLowerCase();
    return membersData.filter(member =>
      ["name", "school", "location", "email", "role"].some(field =>
        member[field].toLowerCase().includes(search)
      )
    ).sort((a, b) => {
      const valA = (a[currentSortKey] || "").toLowerCase();
      const valB = (b[currentSortKey] || "").toLowerCase();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  function render() {
    const data = getFilteredData();
    tbody.innerHTML = "";

    if (!data.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "text-center text-muted py-4";
      cell.textContent = filterText
        ? `No results found for "${filterInput.value}"`
        : "No members available.";
      row.appendChild(cell);
      tbody.appendChild(row);
      paginationContainer.innerHTML = "";
      return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = data.slice(start, start + ITEMS_PER_PAGE);

    pageItems.forEach(member => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      const nameWrap = document.createElement("div");
      nameWrap.className = "d-flex align-items-center gap-2";
      const img = document.createElement("img");
      img.src = `/assets/images/team/${member.image}`;
      img.style.width = img.style.height = "32px";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";
      nameWrap.appendChild(img);
      nameWrap.appendChild(document.createTextNode(member.name));
      tdName.appendChild(nameWrap);
      tr.appendChild(tdName);

      const tdLoc = document.createElement("td");
      const fullState = stateAbbrToFullName[member.state.toUpperCase()] || "";
      const flag = document.createElement("img");
      flag.src = fullState
        ? `/assets/images/states/${fullState}.svg`
        : "/assets/images/states/placeholder.svg";
      flag.style.height = "18px";
      flag.style.marginRight = "6px";
      tdLoc.appendChild(flag);
      tdLoc.appendChild(document.createTextNode(member.location));
      tr.appendChild(tdLoc);

      const tdEmail = document.createElement("td");
      if (member.email) {
        const emailLink = document.createElement("a");
        emailLink.href = `mailto:${member.email}`;
        emailLink.className = "btn btn-sm btn-outline-dark";
        emailLink.innerHTML = `<i class="bi bi-envelope"></i> Email`;
        tdEmail.appendChild(emailLink);
      }
      tr.appendChild(tdEmail);

      const tdRole = document.createElement("td");
      tdRole.textContent = member.role;
      tr.appendChild(tdRole);

      tbody.appendChild(tr);
    });

    renderPagination(data.length);
  }

  function renderPagination(totalItems) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    const nav = document.createElement("nav");
    const ul = document.createElement("ul");
    ul.className = "pagination pagination-sm";

    const addBtn = (label, disabled, page) => {
      const li = document.createElement("li");
      li.className = `page-item ${disabled ? "disabled" : ""}`;
      const btn = document.createElement("button");
      btn.className = "page-link";
      btn.innerHTML = label;
      if (!disabled) {
        btn.addEventListener("click", () => {
          currentPage = page;
          render();
        });
      }
      li.appendChild(btn);
      ul.appendChild(li);
    };

    addBtn(`<i class="bi bi-chevron-left"></i>`, currentPage === 1, currentPage - 1);
    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement("li");
      li.className = `page-item ${i === currentPage ? "active" : ""}`;
      const btn = document.createElement("button");
      btn.className = "page-link";
      btn.textContent = i;
      btn.addEventListener("click", () => {
        currentPage = i;
        render();
      });
      li.appendChild(btn);
      ul.appendChild(li);
    }
    addBtn(`<i class="bi bi-chevron-right"></i>`, currentPage === totalPages, currentPage + 1);

    nav.appendChild(ul);
    paginationContainer.appendChild(nav);
  }

  function handleSchoolSearch(schoolName) {
    filterInput.value = schoolName;
    filterText = schoolName.toLowerCase();
    currentPage = 1;
    updateURL(schoolName);
    render();
    container.scrollIntoView({ behavior: 'smooth' });
  }

  function updateURL(text) {
    const url = new URL(window.location);
    if (text) url.searchParams.set("search", text);
    else url.searchParams.delete("search");
    window.history.pushState({}, "", url);
  }

  document.addEventListener("schoolSearch", (e) => {
    handleSchoolSearch(e.detail.school);
  });

  filterInput.addEventListener("input", (e) => {
    filterText = e.target.value.trim().toLowerCase();
    currentPage = 1;
    updateURL(filterText);
    render();
  });

  function initSearchFromURL() {
    const params = new URLSearchParams(window.location.search);
    const search = params.get("search");
    if (search) {
      filterInput.value = search;
      filterText = search.toLowerCase();
      currentPage = 1;
    }
  }

  window.addEventListener("popstate", () => {
    initSearchFromURL();
    render();
  });

  initSearchFromURL();
  updateSortIndicators();
  render();
});
