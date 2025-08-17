import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qujzohvrbfsouakzocps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ITEMS_PER_PAGE = 8;

let bills = [];
let filteredBills = [];
let currentPage = 1;
let currentFilter = "All";
let currentSearch = "";

let members = []; // cache all members from supabase

// Cache DOM elements once
const container = document.getElementById("billContainer");
const resultsCount = document.getElementById("resultsCount");
const paginationContainer = document.getElementById("paginationContainer");
const proposalsElem = document.getElementById("proposals");
const statesElem = document.getElementById("statesTargeted");
const spinner = document.getElementById("loadingSpinner");
const searchInput = document.getElementById("billSearch");

// Modal elements for collaborators
const collaboratorModal = document.getElementById("collaboratorModal");
const collaboratorModalBody = document.getElementById("collaboratorModalBody");
const collaboratorModalLabel = document.getElementById("collaboratorModalLabel");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatMonthYearUTC(date) {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function getPositionBadge(position) {
  const badgeClasses = {
    "Support": "bg-success",
    "Oppose": "bg-danger",
    "Support If Amended": "bg-warning text-dark",
    "Oppose Unless Amended": "bg-warning text-dark",
  };
  const cls = badgeClasses[position] || "bg-secondary";
  return `<span class="badge ${cls} mb-2">${position}</span>`;
}

const pdfExistenceCache = new Map();
async function pdfExists(url) {
  if (pdfExistenceCache.has(url)) return pdfExistenceCache.get(url);
  try {
    const res = await fetch(url, { method: "HEAD" });
    pdfExistenceCache.set(url, res.ok);
    return res.ok;
  } catch {
    pdfExistenceCache.set(url, false);
    return false;
  }
}

// Fetch all members from supabase once
async function fetchMembers() {
  const { data, error } = await supabase.from("members").select("*");
  if (error) {
    console.error("Failed to load members:", error);
    members = [];
  } else {
    members = data || [];
  }
}

// Helper to find member by full name (case-insensitive)
function findMemberByName(fullName) {
  const lowerName = fullName.trim().toLowerCase();
  return members.find(m => {
    const memberFullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return memberFullName === lowerName;
  });
}

// Create HTML for collaborator avatars, with overlap and +X if needed
function createCollaboratorAvatars(collaboratorNames, billIndex) {
  if (!Array.isArray(collaboratorNames) || collaboratorNames.length === 0) return "";

  const maxToShow = 3;
  // Sort collaboratorNames by last name, then pick top maxToShow
  const sortedNames = [...collaboratorNames].sort((a, b) => {
    const aLast = a.trim().split(" ").slice(-1)[0].toLowerCase();
    const bLast = b.trim().split(" ").slice(-1)[0].toLowerCase();
    return aLast.localeCompare(bLast);
  });

  const toShowNames = sortedNames.slice(0, maxToShow);
  const collaborators = toShowNames.map(name => findMemberByName(name)).filter(Boolean);

  const extraCount = collaboratorNames.length - maxToShow;

  const avatarsHtml = collaborators.map((collab, i) => {
    return `<img
      src="https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${collab.image}"
      alt="${collab.first_name} ${collab.last_name}"
      title="${collab.first_name} ${collab.last_name}"
      class="collaborator-avatar"
      style="z-index:${100 - i}"
      data-bill-index="${billIndex}"
      data-collaborator-name="${collab.first_name} ${collab.last_name}"
    />`;
  }).join("");

  const extraHtml = extraCount > 0 ? `
    <div
      class="collaborator-avatar collaborator-extra"
      style="z-index:95; display:flex; justify-content:center; align-items:center; background:#6c757d; color:white; font-size:0.75rem; font-weight:bold; border-radius:50%; cursor:pointer; margin-left:-10px;"
      data-bill-index="${billIndex}"
    >
      +${extraCount}
    </div>` : "";

  return `<div class="collaborator-group" data-bill-index="${billIndex}" style="display:flex; align-items:center; cursor:pointer;">
    ${avatarsHtml}
    ${extraHtml}
  </div>`;
}

// Show modal with full collaborator info for bill
function setupCollaboratorClickListeners() {
  const groups = container.querySelectorAll(".collaborator-group");
  groups.forEach(group => {
    group.onclick = e => {
      e.preventDefault();
      const billIndex = Number(group.dataset.billIndex);
      if (isNaN(billIndex)) return;

      // Calculate actual bill index in filteredBills array
      const globalBillIndex = (currentPage - 1) * ITEMS_PER_PAGE + billIndex;
      const bill = filteredBills[globalBillIndex];
      if (!bill || !Array.isArray(bill.bill_collaborators)) return;

      // Map collaborator names to member objects (filtering out missing)
      let fullCollaborators = bill.bill_collaborators
        .map(name => findMemberByName(name))
        .filter(Boolean);

      // *** Sort fullCollaborators alphabetically by last name ***
      fullCollaborators.sort((a, b) => a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase()));

      collaboratorModalLabel.innerHTML = `<img class="state-image" src="/assets/images/states/${bill.state}.svg"
               alt="${bill.state} flag" style="width:20px; height:auto;" /> ${bill.state} ${bill.name} Collaborators`;
      collaboratorModalBody.innerHTML = fullCollaborators.map(collab => `
        <div class="d-flex align-items-center px-3 mb-2">
          <a href="/directory.html?search=${collab.first_name}+${collab.last_name}"><img src="https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${collab.image}" alt="${collab.first_name} ${collab.last_name}" class="collaborator-avatar me-2" style="width:40px; height:40px; border:2px solid #ddd;"></a>
          <span>${collab.first_name} ${collab.last_name}</span>
        </div>
      `).join("") || "<p>No collaborators info found.</p>";

      const modal = new bootstrap.Modal(collaboratorModal);
      modal.show();
    };
  });
}

async function fetchBills() {
  const { data, error } = await supabase.from("bills").select("*");
  if (error) {
    console.error("Failed to load bills:", error);
    return;
  }
  bills = data.map(b => ({ ...b, bill_date: new Date(b.bill_date) }));
  bills.sort((a, b) => b.bill_date - a.bill_date);
  filteredBills = [...bills];
}

async function renderBillsPage(page) {
  if (!container) return;
  container.innerHTML = "";

  const start = (page - 1) * ITEMS_PER_PAGE;
  const billsToShow = filteredBills.slice(start, start + ITEMS_PER_PAGE);

  if (resultsCount) {
    resultsCount.textContent = filteredBills.length
      ? `${filteredBills.length} result${filteredBills.length !== 1 ? "s" : ""} found`
      : "";
  }

  if (!billsToShow.length) {
    container.innerHTML = `
      <div class="col-12 text-center">
        <p class="text-muted mt-5 fs-5">No results found. Try a different filter or search term.</p>
      </div>`;
    renderPagination();
    return;
  }

  // Fetch all PDF checks concurrently but cached
  const pdfChecks = await Promise.all(billsToShow.map(bill => {
    const pdfPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${bill.state}/${bill.name}.pdf`;
    return pdfExists(pdfPath).then(exists => ({ bill, pdfPath, exists }));
  }));

  container.innerHTML = pdfChecks.map(({ bill, pdfPath, exists }, idx) => {
    const formattedDate = formatMonthYearUTC(bill.bill_date);

    // collaborators is an array of collaborator names in the bill, e.g., ["Ben Kurian", "Aayush Pande"]
    const collaboratorsHtml = createCollaboratorAvatars(bill.bill_collaborators, idx);

    return `
      <div class="col-md-3">
        <div class="animate__animated animate__fadeIn card impact-card h-100 shadow-sm position-relative overflow-hidden">
          <div class="card-body position-relative">
            <h5 class="card-title"><span>${bill.state} ${bill.name}</span></h5>
            ${getPositionBadge(bill.position)}
            <p class="card-text">${bill.description}</p>

            <p class="text-muted small mb-2">${formattedDate}</p>
            ${exists ? `
              <div class="d-flex justify-content-between align-items-center mb-2 collaborators-download-row">
                <a href="${pdfPath}" class="btn btn-outline-dark btn-sm" target="_blank" rel="noopener" style="white-space: nowrap;">
                  <i class="bi bi-file-pdf"></i> Proposal PDF
                </a>
                ${collaboratorsHtml ? `<div class="collaborators-inline">${collaboratorsHtml}</div>` : ""}
              </div>
            ` : (collaboratorsHtml ? `<div class="mb-2 collaborators-inline">${collaboratorsHtml}</div>` : "")}

            <a href="${bill.legiscan_link}" target="_blank" rel="noopener" aria-label="View full bill on LegiScan"
               style="position: absolute; top: 12px; right: 12px;">
              <img class="state-image" src="/assets/images/states/${bill.state}.svg"
                   alt="${bill.state} flag" style="width:40px; height:auto;" />
            </a>
          </div>
        </div>
      </div>`;
  }).join("");

  if (proposalsElem) proposalsElem.textContent = bills.length;
  if (statesElem) statesElem.textContent = new Set(bills.map(b => b.state)).size;

  renderPagination();

  setupCollaboratorClickListeners();
}

function renderPagination() {
  if (!paginationContainer) return;

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  if (filteredBills.length === 0 || totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  const pageLink = i => `
    <li class="page-item ${i === currentPage ? "active" : ""}">
      <a class="page-link" href="#" data-page="${i}">${i}</a>
    </li>`;

  let html = `<nav><ul class="pagination justify-content-center">`;

  html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
    <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous"><i class="bi bi-chevron-left"></i></a></li>`;

  const maxDisplay = 10;
  if (totalPages <= maxDisplay) {
    for (let i = 1; i <= totalPages; i++) html += pageLink(i);
  } else {
    html += pageLink(1);
    if (currentPage > 4) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;

    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);

    for (let i = start; i <= end; i++) html += pageLink(i);

    if (currentPage < totalPages - 3) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    html += pageLink(totalPages);
  }

  html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
    <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next"><i class="bi bi-chevron-right"></i></a></li>`;

  html += `</ul></nav>`;
  paginationContainer.innerHTML = html;

  paginationContainer.querySelectorAll("a.page-link").forEach(link => {
    link.addEventListener("click", async e => {
      e.preventDefault();
      const p = Number(link.dataset.page);
      if (p >= 1 && p <= totalPages && p !== currentPage) {
        currentPage = p;
        await renderBillsPage(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

async function applyFilters() {
  if (spinner) spinner.style.display = "block";
  if (container) container.style.display = "none";

  const searchLower = currentSearch.toLowerCase();

  filteredBills = bills.filter(b => {
    const matchesSearch = 
      b.name.toLowerCase().includes(searchLower) ||
      b.description.toLowerCase().includes(searchLower) ||
      b.state.toLowerCase().includes(searchLower);

    const matchesFilter = currentFilter === "All" || b.position === currentFilter;

    return matchesSearch && matchesFilter;
  });

  currentPage = 1;
  await renderBillsPage(1);

  if (spinner) spinner.style.display = "none";
  if (container) container.style.display = "flex";
}

// Debounce helper for search input to reduce rapid calls
function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter || "All";
      await applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", debounce(async e => {
      currentSearch = e.target.value.trim();
      await applyFilters();
    }, 250));
  }

  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get("search");
  if (q && searchInput) {
    searchInput.value = q;
    currentSearch = q;
  }

  // Fetch members first, then bills
  await fetchMembers();
  await fetchBills();

  if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
    filteredBills = bills.slice(0, 4);
    await renderBillsPage(1);
  } else {
    await applyFilters();
  }
});
