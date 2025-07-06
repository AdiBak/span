// Import bill data and constants
import {
   bills,
   SUPPORT,
   OPPOSE,
   SUPPORT_AMENDED,
   OPPOSE_AMENDED
} from "/assets/data/bills.js";

// Sort bills newest to oldest by date
bills.sort((a, b) => b.date - a.date);

// Detect if on homepage
const currentPath = window.location.pathname;
const isHomepage = currentPath === "/" || currentPath === "/index.html";

// Pagination constants
const ITEMS_PER_PAGE = 8;
let currentPage = 1;
let filteredBills = [...bills];

// Format date as "Month YYYY"
function formatMonthYearUTC(date) {
   const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
   ];
   return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Render bills for the current page
function renderBillsPage(page) {
   const container = document.getElementById("billContainer");
   if (!container) return;

   container.innerHTML = "";

   const start = (page - 1) * ITEMS_PER_PAGE;
   const end = start + ITEMS_PER_PAGE;
   const billsToShow = filteredBills.slice(start, end);

   if (billsToShow.length === 0) {
      container.innerHTML = `
      <div class="col-12 text-center">
        <p class="text-muted mt-5 fs-5">No results found. Try a different filter or search term.</p>
      </div>
    `;
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
        </div>
      `;
      });
   }

   // Update total proposals count
   const proposalsElement = document.getElementById("proposals");
   if (proposalsElement) proposalsElement.textContent = bills.length;

   renderPagination();
}

// Render pagination controls
function renderPagination() {
   const container = document.getElementById("paginationContainer");
   if (!container) return;

   const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
   if (totalPages <= 1) {
      container.innerHTML = "";
      return;
   }

   let html = `
    <nav aria-label="Page navigation">
      <ul class="pagination justify-content-center">
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
          <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">«</a>
        </li>
  `;

   for (let i = 1; i <= totalPages; i++) {
      html += `
      <li class="page-item ${i === currentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
   }

   html += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
          <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">»</a>
        </li>
      </ul>
    </nav>
  `;

   container.innerHTML = html;

   // Add click handlers for pagination links
   container.querySelectorAll("a.page-link").forEach(link => {
      link.addEventListener("click", e => {
         e.preventDefault();
         const targetPage = Number(link.getAttribute("data-page"));
         if (targetPage >= 1 && targetPage <= totalPages) {
            currentPage = targetPage;
            renderBillsPage(currentPage);
            window.scrollTo({
               top: 0,
               behavior: "smooth"
            });
         }
      });
   });
}

// Filter and search state
let currentFilter = "All";
let currentSearch = "";

// Apply filter and search criteria
function applyFilters() {
   filteredBills = bills.filter(bill => {
      // Check search match
      const searchLower = currentSearch.toLowerCase();
      const matchesSearch =
         bill.name.toLowerCase().includes(searchLower) ||
         bill.description.toLowerCase().includes(searchLower) ||
         bill.state.toLowerCase().includes(searchLower);

      // Filter by position if not "All"
      if (currentFilter === "All") {
         return matchesSearch;
      }

      let positionMatch = false;
      switch (currentFilter) {
         case "Support":
            positionMatch = bill.position === SUPPORT;
            break;
         case "Support If Amended":
            positionMatch = bill.position === SUPPORT_AMENDED;
            break;
         case "Oppose":
            positionMatch = bill.position === OPPOSE;
            break;
         case "Oppose Unless Amended":
            positionMatch = bill.position === OPPOSE_AMENDED;
            break;
      }

      return matchesSearch && positionMatch;
   });

   currentPage = 1;
   renderBillsPage(currentPage);
}

// Setup filter buttons
document.querySelectorAll(".filter-btn").forEach(btn => {
   btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Use data-filter attribute for easier matching
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

// Initial rendering
if (isHomepage) {
   filteredBills = bills.slice(0, 4);
   renderBillsPage(1);
} else {
   applyFilters();
}