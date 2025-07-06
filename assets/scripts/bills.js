// Import bill data and constants
import {
  bills,
  SUPPORT,
  OPPOSE,
  SUPPORT_AMENDED,
  OPPOSE_AMENDED
} from "/assets/data/bills.js";

// Sort bills by newest date
bills.sort((a, b) => b.date - a.date);

// Count unique states for impact display
const uniqueStates = new Set(bills.map(b => b.state));
const uniqueStatesCount = uniqueStates.size;

// Detect homepage
const currentPath = window.location.pathname;
const isHomepage = currentPath === "/" || currentPath === "/index.html";

// Pagination setup
const ITEMS_PER_PAGE = 8;
let currentPage = 1;
let filteredBills = [...bills];

// Cache for loaded PDF texts
const pdfTextCache = {};

// Format date as "Month Year"
function formatMonthYearUTC(date) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Load PDF text content using pdf.js (returns Promise<string>)
async function getPdfText(url) {
  if (pdfTextCache[url]) return pdfTextCache[url];
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + " ";
    }
    pdfTextCache[url] = fullText;
    return fullText;
  } catch (e) {
    console.warn(`Failed to load PDF ${url}`, e);
    return "";
  }
}

// Render bills on the page
function renderBillsPage(page) {
  const container = document.getElementById("billContainer");
  const resultsCount = document.getElementById("resultsCount");
  if (!container) return;

  container.innerHTML = "";

  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const billsToShow = filteredBills.slice(start, end);

  if (resultsCount) {
    resultsCount.textContent = filteredBills.length === 0
      ? ""
      : `${filteredBills.length} result${filteredBills.length !== 1 ? "s" : ""} found`;
  }

  if (billsToShow.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center">
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
                <span>
                  <img height="18" src="/assets/images/states/${bill.state}.svg" alt="${bill.state} flag"> 
                  ${bill.state} ${bill.name}
                </span>
              </h5>
              ${bill.position}
              <p class="card-text">${bill.description}</p>
              <p class="text-muted small">${formattedDate}</p>
              <a href="/assets/proposals/${bill.state}/${bill.name}.pdf" 
                 class="btn btn-outline-dark btn-sm" target="_blank" rel="noopener">
                <i class="bi bi-file-pdf"></i> Download Proposal
              </a>
            </div>
          </div>
        </div>`;
    });
  }

  // Update impact counters
  const proposalsElement = document.getElementById("proposals");
  if (proposalsElement) proposalsElement.textContent = bills.length;

  const statesElement = document.getElementById("statesTargeted");
  if (statesElement) statesElement.textContent = uniqueStatesCount;

  renderPagination();
}

// Pagination with ellipsis if >10 pages
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
    <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">&laquo;</a></li>`;

  if (totalPages <= 10) {
    for (let i = 1; i <= totalPages; i++) {
      html += pageLink(i);
    }
  } else {
    html += pageLink(1);

    if (currentPage > 4) {
      html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    }

    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    for (let i = start; i <= end; i++) {
      html += pageLink(i);
    }

    if (currentPage < totalPages - 3) {
      html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    }

    html += pageLink(totalPages);
  }

  html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
    <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">&raquo;</a></li>`;

  html += `</ul></nav>`;

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

  function pageLink(pageNum) {
    return `<li class="page-item ${pageNum === currentPage ? "active" : ""}">
      <a class="page-link" href="#" data-page="${pageNum}">${pageNum}</a></li>`;
  }
}

// Filter & search state
let currentFilter = "All";
let currentSearch = "";

// Async filtering with PDF text searching, ignoring bill's state in PDF text
async function applyFilters() {
  const searchLower = currentSearch.toLowerCase();

  // Map for positions
  const matchMap = {
    "Support": SUPPORT,
    "Support If Amended": SUPPORT_AMENDED,
    "Oppose": OPPOSE,
    "Oppose Unless Amended": OPPOSE_AMENDED
  };

  // If empty search, filter just by position
  if (!searchLower) {
    filteredBills = bills.filter(bill => {
      if (currentFilter === "All") return true;
      return bill.position === matchMap[currentFilter];
    });
    currentPage = 1;
    renderBillsPage(currentPage);
    return;
  }

  // Bills that match text fields directly
  const directMatches = bills.filter(bill => {
    return (
      bill.name.toLowerCase().includes(searchLower) ||
      bill.description.toLowerCase().includes(searchLower) ||
      bill.state.toLowerCase().includes(searchLower)
    );
  });

  // Bills that don't match text fields — need PDF search
  const pdfSearchBills = bills.filter(bill => {
    return !(
      bill.name.toLowerCase().includes(searchLower) ||
      bill.description.toLowerCase().includes(searchLower) ||
      bill.state.toLowerCase().includes(searchLower)
    );
  });

  // Filter direct matches by position
  let filteredDirect = directMatches.filter(bill => {
    if (currentFilter === "All") return true;
    return bill.position === matchMap[currentFilter];
  });

  // Now asynchronously check PDFs for pdfSearchBills
  const filteredPdf = [];
  for (const bill of pdfSearchBills) {
    if (currentFilter !== "All" && bill.position !== matchMap[currentFilter]) continue;

    const pdfUrl = `/assets/proposals/${bill.state}/${bill.name}.pdf`;
    const pdfText = await getPdfText(pdfUrl);

    // Remove bill's state name before searching in PDF text
    const pdfTextWithoutState = pdfText.replace(new RegExp(`\\b${bill.state}\\b`, "gi"), "");

    if (pdfTextWithoutState.toLowerCase().includes(searchLower)) {
      filteredPdf.push(bill);
    }
  }

  filteredBills = [...filteredDirect, ...filteredPdf];
  currentPage = 1;
  renderBillsPage(currentPage);
}

// Filter buttons event setup
const filterButtons = document.querySelectorAll(".filter-btn");
filterButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter || "All";
    await applyFilters();
  });
});

// Search input event setup
const searchInput = document.getElementById("billSearch");
if (searchInput) {
  searchInput.addEventListener("input", async e => {
    currentSearch = e.target.value.trim();
    await applyFilters();
  });

  // Auto-focus and type into search on any key press outside inputs
  window.addEventListener("keydown", (e) => {
    const active = document.activeElement;
    if (
      active.tagName !== "INPUT" &&
      active.tagName !== "TEXTAREA" &&
      !active.isContentEditable
    ) {
      searchInput.focus();

      if (e.key.length === 1) {
        const start = searchInput.selectionStart || 0;
        const end = searchInput.selectionEnd || 0;
        const val = searchInput.value;
        searchInput.value = val.slice(0, start) + e.key + val.slice(end);
        searchInput.selectionStart = searchInput.selectionEnd = start + 1;

        searchInput.dispatchEvent(new Event("input"));
      }

      e.preventDefault();
    }
  });
}

// Handle ?search= URL param
const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get("search");
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
