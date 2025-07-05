// Import bill data
import {
   bills,
   SUPPORT,
   OPPOSE,
   SUPPORT_AMENDED,
   OPPOSE_AMENDED
} from "/assets/data/bills.js";

// Sort newest to oldest
bills.sort((a, b) => b.date - a.date);

// Detect current page
const currentPath = window.location.pathname;
const isHomepage = currentPath === "/" || currentPath === "/index.html";

// Render bills helper
function renderBills(billArray) {
   const container = document.getElementById("billContainer");
   if (!container) return;

   container.innerHTML = "";

   if (billArray.length === 0) {
      container.innerHTML = `
      <div class="col-12 text-center">
        <p class="text-muted mt-5 fs-5">No results found. Try a different filter or search term.</p>
      </div>
    `;
   } else {
      billArray.forEach(bill => {
         const month = bill.date.toLocaleString('default', {
            month: 'long'
         });
         const year = bill.date.getFullYear();
         container.innerHTML += `
        <div class="col-md-3">
          <div class="card impact-card h-100 shadow-sm">
            <div class="card-body">
              <h5 class="card-title">${bill.name}</h5>
              ${bill.position}
              <p class="card-text">${bill.description}</p>
              <p class="text-muted small">${month} ${year}</p>
              <a href="/assets/proposals/${bill.proposal}" class="btn btn-outline-dark btn-sm" target="_blank">
                <i class="bi bi-file-pdf"></i> Download Proposal
              </a>
            </div>
          </div>
        </div>
      `;
      });
   }

   const counter = document.getElementById("proposals");
   if (counter) counter.textContent = billArray.length;
}

if (isHomepage) {
   // Homepage: just show 4 newest
   renderBills(bills.slice(0, 4));
} else {
   // Bills page: filtering + search
   let currentFilter = "All";
   let currentSearch = "";

   function applyFilters() {
      let filtered = bills;

      if (currentFilter !== "All") {
         // Filter by exact badge HTML match
         let filterBadge = null;
         switch (currentFilter) {
            case "Support":
               filterBadge = SUPPORT;
               break;
            case "Support If Amended":
               filterBadge = SUPPORT_AMENDED;
               break;
            case "Oppose":
               filterBadge = OPPOSE;
               break;
            case "Oppose Unless Amended":
               filterBadge = OPPOSE_AMENDED;
               break;
         }
         if (filterBadge) {
            filtered = filtered.filter(bill => bill.position === filterBadge);
         }
      }

      if (currentSearch.trim() !== "") {
         const searchLower = currentSearch.toLowerCase();
         filtered = filtered.filter(bill =>
            bill.name.toLowerCase().includes(searchLower) ||
            bill.description.toLowerCase().includes(searchLower)
         );
      }

      renderBills(filtered);
   }

   // Filter button listeners
   document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
         document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
         btn.classList.add("active");

         switch (btn.id) {
            case "filter-all":
               currentFilter = "All";
               break;
            case "filter-support":
               currentFilter = "Support";
               break;
            case "filter-support-amended":
               currentFilter = "Support If Amended";
               break;
            case "filter-oppose":
               currentFilter = "Oppose";
               break;
            case "filter-oppose-amended":
               currentFilter = "Oppose Unless Amended";
               break;
         }

         applyFilters();
      });
   });

   // Search input listener
   const searchInput = document.getElementById("billSearch");
   if (searchInput) {
      searchInput.addEventListener("input", e => {
         currentSearch = e.target.value;
         applyFilters();
      });
   }

   // Initial render
   applyFilters();
}