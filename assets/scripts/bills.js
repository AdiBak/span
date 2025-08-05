// Load Supabase client
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

function formatMonthYearUTC(dateStr) {
  const date = new Date(dateStr);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function getPositionBadge(position) {
  switch (position) {
    case "Support":
      return `<span class="badge bg-success mb-2">Support</span>`;
    case "Oppose":
      return `<span class="badge bg-danger mb-2">Oppose</span>`;
    case "Support If Amended":
      return `<span class="badge bg-warning text-dark mb-2">Support If Amended</span>`;
    case "Oppose Unless Amended":
      return `<span class="badge bg-warning text-dark mb-2">Oppose Unless Amended</span>`;
    default:
      return `<span class="badge bg-secondary mb-2">${position}</span>`;
  }
}

async function pdfExists(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchBills() {
  const { data, error } = await supabase.from("bills").select("*");
  if (error) {
    console.error("Failed to load bills:", error);
    return;
  }

  bills = data.map(b => ({
    ...b,
    bill_date: new Date(b.bill_date),
  }));

  bills.sort((a, b) => b.bill_date - a.bill_date);
  filteredBills = [...bills];
}

async function renderBillsPage(page) {
  const container = document.getElementById("billContainer");
  const resultsCount = document.getElementById("resultsCount");
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

  const cardsHtml = await Promise.all(billsToShow.map(async bill => {
    const formattedDate = formatMonthYearUTC(bill.bill_date);
    const pdfPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${bill.state}/${bill.name}.pdf`;
    const hasPdf = await pdfExists(pdfPath);

    return `
      <div class="col-md-3">
        <div class="animate__animated animate__fadeIn card impact-card h-100 shadow-sm position-relative overflow-hidden">
          <div class="card-body position-relative">
            <h5 class="card-title"><span>${bill.state} ${bill.name}</span></h5>
            ${getPositionBadge(bill.position)}
            <p class="card-text">${bill.description}</p>
            <p class="text-muted small">${formattedDate}</p>
            ${hasPdf ? `<a href="${pdfPath}" class="btn btn-outline-dark btn-sm" target="_blank" rel="noopener">
              <i class="bi bi-file-pdf"></i> Download Proposal
            </a>` : ""}
            <a href="${bill.legiscan_link}" target="_blank" rel="noopener" aria-label="View full bill on LegiScan"
               style="position: absolute; top: 12px; right: 12px;">
              <img class="state-image" src="/assets/images/states/${bill.state}.svg"
                   alt="${bill.state} flag" style="width:40px; height:auto;" />
            </a>
          </div>
        </div>
      </div>`;
  }));

  container.innerHTML = cardsHtml.join("");

  const proposalsElem = document.getElementById("proposals");
  if (proposalsElem) proposalsElem.textContent = bills.length;

  const statesElem = document.getElementById("statesTargeted");
  if (statesElem) statesElem.textContent = new Set(bills.map(b => b.state)).size;

  renderPagination();
}

function renderPagination() {
  const container = document.getElementById("paginationContainer");
  if (!container) return;

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  if (!filteredBills.length || totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `<nav><ul class="pagination justify-content-center">`;
  html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
    <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">&laquo;</a></li>`;

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
    <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">&raquo;</a></li>`;
  html += `</ul></nav>`;
  container.innerHTML = html;

  container.querySelectorAll("a.page-link").forEach(link => {
    link.addEventListener("click", async e => {
      e.preventDefault();
      const p = Number(link.getAttribute("data-page"));
      if (p >= 1 && p <= totalPages) {
        currentPage = p;
        await renderBillsPage(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  function pageLink(i) {
    return `<li class="page-item ${i === currentPage ? "active" : ""}">
      <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
  }
}

async function applyFilters() {
  const spinner = document.getElementById("loadingSpinner");
  const container = document.getElementById("billContainer");
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

document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("billSearch");

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter || "All";
      await applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", async e => {
      currentSearch = e.target.value.trim();
      await applyFilters();
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get("search");
  if (q && searchInput) {
    searchInput.value = q;
    currentSearch = q;
  }

  await fetchBills();

  if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
    filteredBills = bills.slice(0, 4);
    await renderBillsPage(1);
  } else {
    await applyFilters();
  }
});
