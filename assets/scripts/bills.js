// Import bill data
import {
  bills,
  SUPPORT,
  OPPOSE,
  SUPPORT_AMENDED,
  OPPOSE_AMENDED
} from "/assets/data/bills.js";

// Sort bills by newest
bills.sort((a, b) => b.date - a.date);

// Count unique states for impact section
const uniqueStates = new Set(bills.map(b => b.state));
const uniqueStatesCount = uniqueStates.size;

// Page detection
const currentPath = window.location.pathname;
const isHomepage = currentPath === "/" || currentPath === "/index.html";

// Pagination constants
const ITEMS_PER_PAGE = 8;
let currentPage = 1;
let filteredBills = [...bills];

// Format dates
function formatMonthYearUTC(date) {
  const months = ["January", "February", "March", "April", "May", "June", 
                  "July", "August", "September", "October", "November", "December"];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Render bills on page
function renderBillsPage(page) {
  const container = document.getElementById("billContainer");
  const resultsCount = document.getElementById("resultsCount");
  if (!container) return;

  container.innerHTML = "";

  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const billsToShow = filteredBills.slice(start, end);

  if (resultsCount) {
    if (filteredBills.length === 0) {
      resultsCount.textContent = "";
    } else {
      resultsCount.textContent = `${filteredBills.length} result${filteredBills.length !== 1 ? 's' : ''} found`;
    }
  }

  if (billsToShow.length === 0) {
    container.innerHTML = `<div class="col-12 text-center">
      <p class="text-muted mt-5 fs-5">No results found. Try a different filter or search term.</p>
    </div>`;
  } else {
    billsToShow.forEach(bill => {
      const formattedDate = formatMonthYearUTC(bill.date);
      container.innerHTML += `
        <div class="col-md-3">
          <div class="card impact-card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">
                <span><img height="18" src="/assets/images/states/${bill.state}.svg"> ${bill.state} ${bill.name}</span>
              </h5>
              ${bill.position}
              <p class="card-text">${bill.description}</p>
              <p class="text-muted small">${formattedDate}</p>
              <a href="/assets/proposals/${bill.state}/${bill.name}.pdf" class="btn btn-outline-dark btn-sm" target="_blank">
                <i class="bi bi-file-pdf"></i> Download Proposal
              </a>
            </div>
          </div>
        </div>`;
    });
  }

  // Update impact section counts
  const proposalsElement = document.getElementById("proposals");
  if (proposalsElement) proposalsElement.textContent = bills.length;

  const statesElement = document.getElementById("statesTargeted");
  if (statesElement) statesElement.textContent = uniqueStatesCount;

  renderPagination();
}

// Pagination UI
function renderPagination() {
  const container = document.getElementById("paginationContainer");
  if (!container) return;

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `<nav><ul class="pagination justify-content-center">`;

  html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
    <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a></li>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item ${i === currentPage ? "active" : ""}">
      <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
  }

  html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
    <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a></li></ul></nav>`;

  container.innerHTML = html;

  container.querySelectorAll("a.page-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const targetPage = Number(link.getAttribute("data-page"));
      if (targetPage >= 1 && targetPage <= totalPages) {
        currentPage = targetPage;
        renderBillsPage(currentPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

// Filter/search state
let currentFilter = "All";
let currentSearch = "";

// Apply filters
function applyFilters() {
  filteredBills = bills.filter(bill => {
    const matchesSearch =
      bill.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
      bill.description.toLowerCase().includes(currentSearch.toLowerCase()) ||
      bill.state.toLowerCase().includes(currentSearch.toLowerCase());

    if (currentFilter === "All") return matchesSearch;

    const matchMap = {
      "Support": SUPPORT,
      "Support If Amended": SUPPORT_AMENDED,
      "Oppose": OPPOSE,
      "Oppose Unless Amended": OPPOSE_AMENDED
    };

    return matchesSearch && bill.position === matchMap[currentFilter];
  });

  currentPage = 1;
  renderBillsPage(currentPage);
}

// Setup filter buttons
const filterButtons = document.querySelectorAll(".filter-btn");
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter || "All";
    applyFilters();
  });
});

// Setup search input
const searchInput = document.getElementById("billSearch");
if (searchInput) {
  searchInput.addEventListener("input", e => {
    currentSearch = e.target.value.trim();
    applyFilters();
  });
}

// Prefill from URL ?search= param if available
const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get('search');
if (query && searchInput) {
  searchInput.value = query;
  currentSearch = query;
}

// Initial load
if (isHomepage) {
  filteredBills = bills.slice(0, 4);
  renderBillsPage(1);
} else {
  applyFilters();
}
