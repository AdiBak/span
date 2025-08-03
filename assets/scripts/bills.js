import {
  bills,
  SUPPORT,
  OPPOSE,
  SUPPORT_AMENDED,
  OPPOSE_AMENDED
} from "/assets/data/bills.js";

bills.sort((a, b) => b.date - a.date);

const uniqueStates = new Set(bills.map(b => b.state));
const uniqueStatesCount = uniqueStates.size;

const currentPath = window.location.pathname;
const isHomepage = currentPath === "/" || currentPath === "/index.html";

const ITEMS_PER_PAGE = 8;
let currentPage = 1;
let filteredBills = [...bills];

const pdfTextCache = {};

function formatMonthYearUTC(date) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export const stateCodeMap = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
  "Wisconsin": "WI", "Wyoming": "WY"
};

function cleanBillNameForUrl(billName) {
  return billName.replace(/[.\s]/g, '').toUpperCase();
}

function getLegiScanLink(state, billName) {
  const code = stateCodeMap[state];
  const billId = cleanBillNameForUrl(billName);
  return code ? `https://legiscan.com/${code}/bill/${billId}` : "#";
}

async function getPdfText(url) {
  if (pdfTextCache[url]) return pdfTextCache[url];
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(" ") + " ";
    }
    pdfTextCache[url] = fullText;
    return fullText;
  } catch (e) {
    console.warn(`Failed to load PDF ${url}`, e);
    return "";
  }
}

async function pdfExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function renderBillsPage(page) {
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
    renderPagination();  // Important: clear pagination if no results
    return;
  }

  const cardsHtmlArray = await Promise.all(billsToShow.map(async bill => {
    const formattedDate = formatMonthYearUTC(bill.date);
    const legiscanLink = getLegiScanLink(bill.state, bill.name);
    const pdfPath = `/assets/proposals/${bill.state}/${bill.name}.pdf`;
    const hasPdf = await pdfExists(pdfPath);

    return `
      <div class="col-md-3">
        <div class="animate__animated animate__fadeIn card impact-card h-100 shadow-sm position-relative overflow-hidden">
          <div class="card-body position-relative">
            <h5 class="card-title">
              <span>${bill.state} ${bill.name}</span>
            </h5>
            ${bill.position}
            <p class="card-text">${bill.description}</p>
            <p class="text-muted small">${formattedDate}</p>
            ${hasPdf ? `<a href="${pdfPath}" class="btn btn-outline-dark btn-sm" target="_blank" rel="noopener">
              <i class="bi bi-file-pdf"></i> Download Proposal
            </a>` : ""}
            <a href="${legiscanLink}" target="_blank" rel="noopener" aria-label="View full bill on LegiScan" 
               style="position: absolute; top: 12px; right: 12px;">
              <img class="state-image" src="/assets/images/states/${bill.state}.svg" alt="${bill.state} flag" style="width:40px; height:auto;" />
            </a>
          </div>
        </div>
      </div>
    `;
  }));

  container.innerHTML = cardsHtmlArray.join("");

  const proposalsElement = document.getElementById("proposals");
  if (proposalsElement) proposalsElement.textContent = bills.length;

  const statesElement = document.getElementById("statesTargeted");
  if (statesElement) statesElement.textContent = uniqueStatesCount;

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById("paginationContainer");
  if (!container) return;

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);

  // FIX: Clear pagination if no results or only one page
  if (filteredBills.length === 0 || totalPages <= 1) {
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
    link.addEventListener("click", async e => {
      e.preventDefault();
      const targetPage = Number(link.getAttribute("data-page"));
      if (targetPage >= 1 && targetPage <= totalPages) {
        currentPage = targetPage;
        await renderBillsPage(currentPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  function pageLink(pageNum) {
    return `<li class="page-item ${pageNum === currentPage ? "active" : ""}">
      <a class="page-link" href="#" data-page="${pageNum}">${pageNum}</a></li>`;
  }
}

let currentFilter = "All";
let currentSearch = "";

async function applyFilters() {
  const spinner = document.getElementById("loadingSpinner");
  const container = document.getElementById("billContainer");

  // Show spinner, hide bills
  if (spinner) spinner.style.display = "block";
  if (container) container.style.display = "none";

  const searchLower = currentSearch.toLowerCase();
  const matchMap = {
    "Support": SUPPORT,
    "Support If Amended": SUPPORT_AMENDED,
    "Oppose": OPPOSE,
    "Oppose Unless Amended": OPPOSE_AMENDED
  };

  if (!searchLower) {
    filteredBills = bills.filter(bill => {
      if (currentFilter === "All") return true;
      return bill.position === matchMap[currentFilter];
    });
    currentPage = 1;
    await renderBillsPage(currentPage);
  } else {
    const directMatches = bills.filter(bill => {
      return (
        bill.name.toLowerCase().includes(searchLower) ||
        bill.description.toLowerCase().includes(searchLower) ||
        bill.state.toLowerCase().includes(searchLower)
      );
    });

    const pdfSearchBills = bills.filter(bill => {
      return !(
        bill.name.toLowerCase().includes(searchLower) ||
        bill.description.toLowerCase().includes(searchLower) ||
        bill.state.toLowerCase().includes(searchLower)
      );
    });

    let filteredDirect = directMatches.filter(bill => {
      if (currentFilter === "All") return true;
      return bill.position === matchMap[currentFilter];
    });

    const filteredPdf = [];
    for (const bill of pdfSearchBills) {
      if (currentFilter !== "All" && bill.position !== matchMap[currentFilter]) continue;
      const pdfUrl = `/assets/proposals/${bill.state}/${bill.name}.pdf`;
      const pdfText = await getPdfText(pdfUrl);
      const pdfTextClean = pdfText
        .replace(new RegExp(`\\b${bill.state}\\b`, "gi"), "")
        .replace(new RegExp(`\\b${bill.name}\\b`, "gi"), "");

      if (pdfTextClean.toLowerCase().includes(searchLower)) {
        filteredPdf.push(bill);
      }
    }

    filteredBills = [...filteredDirect, ...filteredPdf];
    currentPage = 1;
    await renderBillsPage(currentPage);
  }

  // Hide spinner, show bills
  if (spinner) spinner.style.display = "none";
  if (container) container.style.display = "flex"; // assuming it's a Bootstrap row
}


const filterButtons = document.querySelectorAll(".filter-btn");
filterButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter || "All";
    await applyFilters();
  });
});

const searchInput = document.getElementById("billSearch");
if (searchInput) {
  searchInput.addEventListener("input", async e => {
    currentSearch = e.target.value.trim();
    await applyFilters();
  });

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

const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get("search");
if (query && searchInput) {
  searchInput.value = query;
  currentSearch = query;
}

if (isHomepage) {
  filteredBills = bills.slice(0, 4);
  renderBillsPage(1);
} else {
  applyFilters();
}
