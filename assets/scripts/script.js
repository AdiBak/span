import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qujzohvrbfsouakzocps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================
// bills.js
// ==================

(function() {
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
            const res = await fetch(url, {
                method: "HEAD"
            });
            pdfExistenceCache.set(url, res.ok);
            return res.ok;
        } catch {
            pdfExistenceCache.set(url, false);
            return false;
        }
    }

    // Fetch all members from supabase once
    async function fetchMembers() {
        const {
            data,
            error
        } = await supabase.from("members").select("*");
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
        const {
            data,
            error
        } = await supabase.from("bills").select("*");
        if (error) {
            console.error("Failed to load bills:", error);
            return;
        }
        bills = data.map(b => ({
            ...b,
            bill_date: new Date(b.bill_date)
        }));
        bills.sort((a, b) => b.bill_date - a.bill_date);
        filteredBills = [...bills];
    }

    async function renderBillsPage(page) {
        if (!container) return;
        container.innerHTML = "";

        const start = (page - 1) * ITEMS_PER_PAGE;
        const billsToShow = filteredBills.slice(start, start + ITEMS_PER_PAGE);

        if (resultsCount) {
            resultsCount.textContent = filteredBills.length ?
                `${filteredBills.length} result${filteredBills.length !== 1 ? "s" : ""} found` :
                "";
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
            return pdfExists(pdfPath).then(exists => ({
                bill,
                pdfPath,
                exists
            }));
        }));

        container.innerHTML = pdfChecks.map(({
            bill,
            pdfPath,
            exists
        }, idx) => {
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
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
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

})();

// ==================
// blog.js
// ==================
(function() {
    const rssFeedUrl = "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fmedium.com%2Ffeed%2F%40spanationwide";
    const ITEMS_PER_PAGE = 5; // Show 1 featured + 5 normal per page
    let currentPage = 1;
    let blogData = [];

    function renderBlogs() {
        const blogContainer = document.getElementById("blog-section");
        blogContainer.innerHTML = "";

        const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        const end = start + ITEMS_PER_PAGE - 1;
        const visibleItems = blogData.slice(start, end);

        if (currentPage === 1 && blogData.length > 0) {
            const featured = blogData[0];
            blogContainer.innerHTML += generateCardHtml(featured, true);
        }

        visibleItems.forEach((item) => {
            blogContainer.innerHTML += generateCardHtml(item, false);
        });

        renderPagination();
    }

    function generateCardHtml(item, isFeatured) {
        // Extract image
        const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
        const image = imgMatch ? imgMatch[1] : "https://via.placeholder.com/600x338?text=No+Image";

        // Format date to America/New_York timezone
        const estDate = new Date(item.pubDate.replace(' ', 'T') + 'Z');
        const formattedDate = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/New_York",
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(estDate);

        // Clean content: remove <figcaption> and HTML tags
        const cleanContent = item.content
            .replace(/<figcaption>.*?<\/figcaption>/gs, '') // Remove figcaptions
            .replace(/<[^>]*>?/gm, '') // Remove all HTML tags
            .trim()
            .slice(0, 150) + "…";

        // Detect author
        let authorName = "<a class='text-muted' style='text-decoration: none;' href='/index.html'>SPAN</a>";
        const lowerContent = item.content.toLowerCase();

        if (lowerContent.includes("ashita virani")) {
            authorName = `<a class='text-muted' style='text-decoration: none;' href='/directory.html?search=Ashita+Virani'><img style='border-radius: 50%;' src='https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/ashita-virani.jpg' height='16px'> Ashita Virani</a>`;
        } else if (lowerContent.includes("arnav goyal")) {
            authorName = `<a class='text-muted' style='text-decoration: none;' href='/directory.html?search=Arnav+Goyal'><img style='border-radius: 50%;' src='https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/arnav-goyal.jpg' height='16px'> Arnav Goyal</a>`;
        }

        return `
    <div class="${isFeatured ? 'col-md-8 mb-4' : 'col-md-4 mb-4'}">
      <div class="impact-card card h-100 shadow-sm news-card ${isFeatured ? 'featured-news' : ''}">
        <img src="${image}" class="card-img-top" alt="${item.title}" style="object-fit: cover; aspect-ratio: 16/9;">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${item.title}</h5>
          <p class="card-text text-muted mb-2">
            <small>${formattedDate} · ${authorName}</small>
          </p>
          <p class="card-text">${cleanContent}</p>
          <a href="${item.link}" target="_blank" class="btn btn-dark mt-auto">Read More</a>
        </div>
      </div>
    </div>
  `;
    }

    function renderPagination() {
        const totalPages = Math.ceil((blogData.length - 1) / ITEMS_PER_PAGE);
        const paginationContainer = document.getElementById("blog-pagination");
        paginationContainer.innerHTML = "";

        if (totalPages <= 1) return;

        const nav = document.createElement("nav");
        const ul = document.createElement("ul");
        ul.className = "pagination justify-content-center";

        const createPageButton = (label, page, disabled = false, active = false) => {
            const li = document.createElement("li");
            li.className = `page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}`;
            const btn = document.createElement("button");
            btn.className = "page-link";
            btn.innerHTML = label;
            btn.addEventListener("click", () => {
                if (!disabled && page !== currentPage) {
                    currentPage = page;
                    renderBlogs();
                }
            });
            li.appendChild(btn);
            return li;
        };

        ul.appendChild(createPageButton("&laquo;", currentPage - 1, currentPage === 1));

        for (let i = 1; i <= totalPages; i++) {
            ul.appendChild(createPageButton(i, i, false, i === currentPage));
        }

        ul.appendChild(createPageButton("&raquo;", currentPage + 1, currentPage === totalPages));

        nav.appendChild(ul);
        paginationContainer.appendChild(nav);
    }

    // Fetch and render blogs
    fetch(rssFeedUrl)
        .then(res => res.json())
        .then(data => {
            blogData = data.items;
            if (!blogData.length) {
                document.getElementById("blog-section").innerHTML =
                    "<p>No blog posts available at this time.</p>";
            } else {
                renderBlogs();
            }
        })
        .catch(err => {
            console.error("Failed to fetch RSS feed:", err);
            document.getElementById("blog-section").innerHTML =
                "<p class='text-center'>Blog posts coming soon!</p>";
        });

})();


// ==================
// directory.js
// ==================
(function() {

    const stateAbbrToFullName = {
        AL: "Alabama",
        AK: "Alaska",
        AZ: "Arizona",
        AR: "Arkansas",
        CA: "California",
        CO: "Colorado",
        CT: "Connecticut",
        DE: "Delaware",
        FL: "Florida",
        GA: "Georgia",
        HI: "Hawaii",
        ID: "Idaho",
        IL: "Illinois",
        IN: "Indiana",
        IA: "Iowa",
        KS: "Kansas",
        KY: "Kentucky",
        LA: "Louisiana",
        ME: "Maine",
        MD: "Maryland",
        MA: "Massachusetts",
        MI: "Michigan",
        MN: "Minnesota",
        MS: "Mississippi",
        MO: "Missouri",
        MT: "Montana",
        NE: "Nebraska",
        NV: "Nevada",
        NH: "New Hampshire",
        NJ: "New Jersey",
        NM: "New Mexico",
        NY: "New York",
        NC: "North Carolina",
        ND: "North Dakota",
        OH: "Ohio",
        OK: "Oklahoma",
        OR: "Oregon",
        PA: "Pennsylvania",
        RI: "Rhode Island",
        SC: "South Carolina",
        SD: "South Dakota",
        TN: "Tennessee",
        TX: "Texas",
        UT: "Utah",
        VT: "Vermont",
        VA: "Virginia",
        WA: "Washington",
        WV: "West Virginia",
        WI: "Wisconsin",
        WY: "Wyoming",
        DC: "District of Columbia"
    };

    document.addEventListener("DOMContentLoaded", async () => {
        const container = document.getElementById("directoryContainer");
        if (!container) return;

        // Loading state
        container.innerHTML = `
    <div class="text-center my-5 py-5">
      <div class="spinner-border text-secondary" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading directory...</p>
    </div>
  `;

        const ITEMS_PER_PAGE = 10;
        let currentPage = 1;
        let filterText = "";
        let currentSortKey = "name";
        let sortAsc = true;
        let membersData = [];

        try {
            const {
                data,
                error
            } = await supabase.from("members").select("*").eq("active", true);
            if (error) throw error;

            membersData = data.map(m => {
                const firstName = (m.first_name || "").trim();
                const lastName = (m.last_name || "").trim();
                return {
                    firstName,
                    lastName,
                    name: (firstName || lastName) ? `${firstName} ${lastName}`.trim() : m.email || "",
                    school: m.school_name || "",
                    city: m.city || "",
                    state: m.state || "",
                    location: (m.city && m.state) ? `${m.city}, ${m.state}` : (m.city || m.state || ""),
                    email: m.email || "",
                    role: m.role || "",
                    image: m.image || "default.jpg"
                };
            }).sort(sortByName);

            renderUI();
        } catch (error) {
            container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle-fill"></i> Failed to load member data. Please try again later.
      </div>
    `;
            console.error("Directory load error:", error);
        }

        function sortByName(a, b) {
            const lastA = (a.lastName || a.name.split(" ").slice(-1)[0] || "").toLowerCase();
            const lastB = (b.lastName || b.name.split(" ").slice(-1)[0] || "").toLowerCase();
            if (lastA === lastB) {
                const firstA = (a.firstName || a.name.split(" ").slice(0, -1).join(" ") || "").toLowerCase();
                const firstB = (b.firstName || b.name.split(" ").slice(0, -1).join(" ") || "").toLowerCase();
                return firstA.localeCompare(firstB);
            }
            return lastA.localeCompare(lastB);
        }

        function renderUI() {
            container.innerHTML = `
      <div class="mb-4 d-flex justify-content-end">
        <input type="search" id="directorySearch" class="form-control" placeholder="Search by name, school, or location..." style="max-width: 400px;">
      </div>
      <div class="table-responsive">
        <table class="animate__animated animate__fadeIn table table-striped table-hover align-middle" style="min-width: 600px">
          <thead class="bg-white text-dark">
            <tr>
              <th><span>Name</span> <button data-key="name" class="btn btn-sm p-0 ms-2 sort-btn"><i class="bi bi-arrow-down-up"></i></button></th>
              <th><span>Location</span> <button data-key="location" class="btn btn-sm p-0 ms-2 sort-btn"><i class="bi bi-arrow-down-up"></i></button></th>
              <th>Email</th>
              <th><span>Role</span> <button data-key="role" class="btn btn-sm p-0 ms-2 sort-btn"><i class="bi bi-arrow-down-up"></i></button></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div id="paginationContainer" class="mt-3 d-flex justify-content-center"></div>
    `;

            const searchInput = container.querySelector("#directorySearch");
            const tbody = container.querySelector("tbody");
            const paginationContainer = container.querySelector("#paginationContainer");
            const sortButtons = container.querySelectorAll(".sort-btn");
            const sortableKeys = ["name", "location", "role"];

            sortButtons.forEach(btn => {
                btn.addEventListener("click", () => {
                    const key = btn.dataset.key;
                    if (key && sortableKeys.includes(key)) {
                        if (currentSortKey === key) {
                            sortAsc = !sortAsc;
                        } else {
                            currentSortKey = key;
                            sortAsc = true;
                        }
                        currentPage = 1;
                        updateSortIndicators();
                        renderTable();
                    }
                });
            });

            // Debounce function to limit render calls during typing
            function debounce(fn, delay = 300) {
                let timeout;
                return (...args) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => fn(...args), delay);
                };
            }

            searchInput.addEventListener("input", debounce(e => {
                filterText = e.target.value.trim().toLowerCase();
                currentPage = 1;
                updateURL();
                renderTable();
            }));

            updateSortIndicators();
            initSearchFromURL();
            renderTable();

            function updateSortIndicators() {
                sortButtons.forEach(btn => {
                    const key = btn.dataset.key;
                    if (key === currentSortKey) {
                        btn.innerHTML = sortAsc ? `<i class="bi bi-arrow-up"></i>` : `<i class="bi bi-arrow-down"></i>`;
                        btn.style.color = "#0d6efd";
                    } else {
                        btn.innerHTML = `<i class="bi bi-arrow-down-up"></i>`;
                        btn.style.color = "#777";
                    }
                });
            }

            function getFilteredData() {
                if (!filterText) return [...membersData]; // shallow copy to avoid side effects

                return membersData.filter(member => ["name", "school", "location", "email", "role"].some(field =>
                    (member[field] || "").toLowerCase().includes(filterText)
                ));
            }

            function renderTable() {
                const data = getFilteredData();

                data.sort((a, b) => {
                    if (currentSortKey === "name") {
                        return sortAsc ? sortByName(a, b) : sortByName(b, a);
                    }
                    const valA = (a[currentSortKey] || "").toLowerCase();
                    const valB = (b[currentSortKey] || "").toLowerCase();
                    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                });

                tbody.innerHTML = "";

                if (!data.length) {
                    tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center text-muted py-4">
              ${filterText ? `No results found for "${filterText}"` : "No members available."}
            </td>
          </tr>
        `;
                    paginationContainer.innerHTML = "";
                    return;
                }

                const start = (currentPage - 1) * ITEMS_PER_PAGE;
                const pageItems = data.slice(start, start + ITEMS_PER_PAGE);

                // Use DocumentFragment to minimize reflows
                const fragment = document.createDocumentFragment();

                for (const member of pageItems) {
                    const fullState = stateAbbrToFullName[(member.state || "").toUpperCase()] || "";
                    const stateFlagSrc = fullState ?
                        `/assets/images/states/${fullState}.svg` :
                        `/assets/images/states/placeholder.svg`;
                    const stateFlagAlt = fullState ? `${fullState} flag` : "Location";

                    const tr = document.createElement("tr");

                    tr.innerHTML = `
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${member.image}" 
                   alt="${member.name}" width="32" height="32" class="rounded-circle object-fit-cover">
              ${member.name}
            </div>
          </td>
          <td>
            <img src="${stateFlagSrc}" height="18" style="margin-right:6px" alt="${stateFlagAlt}">
            ${member.location}
          </td>
          <td>
            ${member.email ? `<a href="mailto:${member.email}" class="btn btn-sm btn-outline-dark"><i class="bi bi-envelope"></i> Email</a>` : ""}
          </td>
          <td>${member.role}</td>
        `;

                    fragment.appendChild(tr);
                }
                tbody.appendChild(fragment);

                renderPagination(data.length);
            }

            function renderPagination(totalItems) {
                const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
                if (totalPages <= 1) {
                    paginationContainer.innerHTML = "";
                    return;
                }

                let html = `
        <nav>
          <ul class="pagination justify-content-center">
            <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
              <button class="page-link" aria-label="Previous" ${currentPage === 1 ? "disabled" : ""}>
                <i class="bi bi-chevron-left"></i>
              </button>
            </li>
      `;

                for (let i = 1; i <= totalPages; i++) {
                    html += `
          <li class="page-item ${i === currentPage ? "active" : ""}">
            <button class="page-link" aria-current="${i === currentPage ? "page" : ""}">${i}</button>
          </li>
        `;
                }

                html += `
            <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
              <button class="page-link" aria-label="Next" ${currentPage === totalPages ? "disabled" : ""}>
                <i class="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      `;

                paginationContainer.innerHTML = html;

                // Event delegation for pagination buttons
                paginationContainer.querySelector("ul").onclick = (e) => {
                    const btn = e.target.closest("button");
                    if (!btn || btn.disabled) return;

                    if (btn.parentElement.classList.contains("disabled") || btn.parentElement.classList.contains("active")) return;

                    if (btn.getAttribute("aria-label") === "Previous" && currentPage > 1) {
                        currentPage--;
                        renderTable();
                    } else if (btn.getAttribute("aria-label") === "Next" && currentPage < totalPages) {
                        currentPage++;
                        renderTable();
                    } else {
                        const pageNum = Number(btn.textContent);
                        if (!isNaN(pageNum) && pageNum !== currentPage) {
                            currentPage = pageNum;
                            renderTable();
                        }
                    }
                };
            }

            function updateURL() {
                const url = new URL(window.location);
                if (filterText) url.searchParams.set("search", filterText);
                else url.searchParams.delete("search");
                window.history.pushState({}, "", url);
            }

            function initSearchFromURL() {
                const params = new URLSearchParams(window.location.search);
                const search = params.get("search");
                if (search) {
                    filterText = search.toLowerCase();
                    searchInput.value = search;
                    currentPage = 1;
                }
            }

            window.addEventListener("popstate", () => {
                initSearchFromURL();
                renderTable();
            });
        }
    });

})();

// ==================
// navbar.js
// ==================
(function() {
    var currentPath = window.location.pathname;
    if (currentPath === "/") currentPath = "/index.html"; // treat root as index.html

    var navbar = `
  <div class="container">
    <a class="navbar-brand" href="/index.html">
      <img class="my-2" src="/assets/images/index/logo-wide-light.svg" height="30" alt="SPAN Logo">
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav ms-auto">
        <li class="nav-item">
          <a class="nav-link ${currentPath === "/index.html" ? "active" : ""}" href="/index.html">Home</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${currentPath === "/our-story.html" ? "active" : ""}" href="/our-story.html">Our Story</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${currentPath === "/bills.html" ? "active" : ""}" href="/bills.html">Bills</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${currentPath === "/directory.html" ? "active" : ""}" href="/directory.html">Directory</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${currentPath === "/blog.html" ? "active" : ""}" href="/blog.html">Blog</a>
        </li>
      </ul>
    </div>
  </div>
`;

    document.getElementById("navbarContainer").innerHTML = navbar;

})();

// ==================
// footer.js
// ==================
(function() {
    var footer = `
    <div class="container">
      <div class="row p-3">
        <div class="col-md-6 mb-4 mb-md-0">
          <img src="/assets/images/index/logo-wide-light.svg" height="40" alt="SPAN Logo" class="mb-3">
          <p>Students for Patient Advocacy Nationwide - Empowering the next generation of healthcare advocates.</p>
          <div class="mt-3">
          <a href="https://www.linkedin.com/company/spanationwide/" target="_blank" class="text-white me-2"><i class="bi bi-linkedin" style="font-size: 1.5rem;"></i></a>
          <a href="https://www.instagram.com/spanationwide_/" target="_blank" class="text-white me-2"><i class="bi bi-instagram" style="font-size: 1.5rem;"></i></a>
          <a href="https://www.tiktok.com/@spanationwide" target="_blank" class="text-white"><i class="bi bi-tiktok" style="font-size: 1.5rem;"></i></a>
          <a href="https://x.com/spanationwide" target="_blank" class="text-white me-2"><i class="bi bi-twitter-x" style="font-size: 1.5rem;"></i></a>
          <a href="https://www.youtube.com/@spanationwide" target="_blank" class="text-white"><i class="bi bi-youtube" style="font-size: 1.5rem;"></i></a>
          </div>
        </div>
        <div class="col-md-6 mb-4 mb-md-0">
          <h5>Quick Links</h5>
          <ul class="list-unstyled">
            <li class="mb-2"><a href="/index.html" class="text-white text-decoration-none">Home</a></li>
            <li class="mb-2"><a href="/our-story.html" class="text-white text-decoration-none">Our Story</a></li>
            <li class="mb-2"><a href="/bills.html" class="text-white text-decoration-none">Bills</a></li>
            <li class="mb-2"><a href="/directory.html" class="text-white text-decoration-none">Directory</a></li>
            <li class="mb-2"><a href="/blog.html" class="text-white text-decoration-none">Blog</a></li>
            <!-- <li class="mb-2"><a href="https://www.paypal.com/donate/?hosted_button_id=EXAMPLE" target="_blank" class="text-white text-decoration-none">Donate</a></li> -->
          </ul>
        </div>
      </div>
      <hr class="my-4">
      <div class="text-center">
        <p class="mb-0">© ${new Date().getFullYear()} SPAN – Students for Patient Advocacy Nationwide. All rights reserved.</p>
      </div>
    </div>
`;

    document.getElementById('footerContainer').innerHTML = footer;

})();
// ==================
// map.js
// ==================
(function() {

    google.charts.load("current", {
        packages: ["geochart"]
    });
    google.charts.setOnLoadCallback(drawRegionsMap);

    async function drawRegionsMap() {
        const {
            data: bills,
            error
        } = await supabase.from("bills").select("state");

        if (error) {
            console.error("Error fetching bills:", error);
            return;
        }

        const stateCounts = {};
        for (const bill of bills) {
            if (bill.state) {
                stateCounts[bill.state] = (stateCounts[bill.state] || 0) + 1;
            }
        }

        const dataArray = [
            ["State", "HasBill", {
                role: "tooltip"
            }]
        ];
        for (const [stateName, count] of Object.entries(stateCounts)) {
            const stateCode = getStateCode(stateName);
            if (stateCode) {
                const tooltip = `${count === 1 ? "1 bill impacted" : `${count} bills impacted`}`;
                dataArray.push([stateName, 1, tooltip]);
            }
        }

        const data = google.visualization.arrayToDataTable(dataArray);

        const options = {
            region: "US",
            displayMode: "regions",
            resolution: "provinces",
            backgroundColor: "transparent",
            defaultColor: "#e9ecef",
            datalessRegionColor: "#f8f9fa",
            colorAxis: {
                values: [0, 1],
                colors: ["#f8f9fa", "#003049"],
            },
            tooltip: {
                isHtml: false,
                textStyle: {
                    fontName: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    fontSize: 14,
                    color: "#212529",
                },
            },
            legend: "none",
        };

        const chartDiv = document.getElementById("regions_div");
        const chart = new google.visualization.GeoChart(chartDiv);
        chart.draw(data, options);

        // Interactivity
        google.visualization.events.addListener(chart, "regionMouseOver", (event) => {
            const regionCode = event.region;
            const hasBills = Object.keys(stateCounts).some(
                (state) => getStateCode(state) === regionCode
            );
            chartDiv.style.cursor = hasBills ? "pointer" : "default";
        });

        google.visualization.events.addListener(chart, "regionMouseOut", () => {
            chartDiv.style.cursor = "default";
        });

        google.visualization.events.addListener(chart, "regionClick", (event) => {
            const regionCode = event.region;
            const matchedState = Object.keys(stateCounts).find(
                (state) => getStateCode(state) === regionCode
            );
            if (matchedState) {
                window.location.href = `/bills.html?search=${encodeURIComponent(
        matchedState
      )}`;
            }
        });
    }

    function getStateCode(stateName) {
        const states = {
            "Alabama": "US-AL",
            "Alaska": "US-AK",
            "Arizona": "US-AZ",
            "Arkansas": "US-AR",
            "California": "US-CA",
            "Colorado": "US-CO",
            "Connecticut": "US-CT",
            "Delaware": "US-DE",
            "Florida": "US-FL",
            "Georgia": "US-GA",
            "Hawaii": "US-HI",
            "Idaho": "US-ID",
            "Illinois": "US-IL",
            "Indiana": "US-IN",
            "Iowa": "US-IA",
            "Kansas": "US-KS",
            "Kentucky": "US-KY",
            "Louisiana": "US-LA",
            "Maine": "US-ME",
            "Maryland": "US-MD",
            "Massachusetts": "US-MA",
            "Michigan": "US-MI",
            "Minnesota": "US-MN",
            "Mississippi": "US-MS",
            "Missouri": "US-MO",
            "Montana": "US-MT",
            "Nebraska": "US-NE",
            "Nevada": "US-NV",
            "New Hampshire": "US-NH",
            "New Jersey": "US-NJ",
            "New Mexico": "US-NM",
            "New York": "US-NY",
            "North Carolina": "US-NC",
            "North Dakota": "US-ND",
            "Ohio": "US-OH",
            "Oklahoma": "US-OK",
            "Oregon": "US-OR",
            "Pennsylvania": "US-PA",
            "Rhode Island": "US-RI",
            "South Carolina": "US-SC",
            "South Dakota": "US-SD",
            "Tennessee": "US-TN",
            "Texas": "US-TX",
            "Utah": "US-UT",
            "Vermont": "US-VT",
            "Virginia": "US-VA",
            "Washington": "US-WA",
            "West Virginia": "US-WV",
            "Wisconsin": "US-WI",
            "Wyoming": "US-WY",
            "District of Columbia": "US-DC"
        };
        return states[stateName];
    }

    window.addEventListener("resize", drawRegionsMap);
})();
// ==================
// schools.js
// ==================
(function() {

    function handleSchoolClick(schoolName) {
        if (window.location.pathname.includes("directory.html")) {
            const event = new CustomEvent("schoolSearch", {
                detail: {
                    school: schoolName
                },
                bubbles: true,
                composed: true,
            });
            document.dispatchEvent(event);
        } else {
            window.location.href = `/directory.html?search=${encodeURIComponent(schoolName)}`;
        }
    }

    async function renderSchoolCarousel() {
        const carousel = document.getElementById("schoolCarousel");
        if (!carousel) return;

        // Fetch school data from Supabase
        const {
            data: schools,
            error
        } = await supabase
            .from("schools")
            .select("school_name, school_image");

        if (error) {
            console.error("Failed to fetch schools from Supabase:", error);
            return;
        }

        const sortedSchools = [...schools].sort((a, b) => a.display_order - b.display_order);


        const repeatCount = 4;
        let html = "";

        for (let i = 0; i < repeatCount; i++) {
            for (const school of sortedSchools) {
                html += `
        <div class="school-logo-item">
          <img src="https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/schools-images/${school.school_image}"
               alt="${school.school_name}"
               class="school-logo"
               title="View ${school.school_name} members"
               loading="lazy"
               data-school="${school.school_name}"
               tabindex="0">
        </div>
      `;
            }
        }

        carousel.innerHTML = `<div class="school-carousel-track">${html}</div>`;

        document.querySelectorAll(".school-logo").forEach((logo) => {
            const schoolName = logo.getAttribute("data-school");

            logo.addEventListener("click", () => handleSchoolClick(schoolName));
            logo.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSchoolClick(schoolName);
                }
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderSchoolCarousel();

        const track = document.querySelector(".school-carousel-track");
        if (track) {
            track.addEventListener("mouseenter", () => {
                track.style.animationPlayState = "paused";
            });
            track.addEventListener("mouseleave", () => {
                track.style.animationPlayState = "running";
            });
        }
    });

})();
// ==================
// team.js
// ==================
(function() {

    let members = [];

    async function loadAndRenderExecutiveDirectors() {
        const {
            data,
            error
        } = await supabase
            .from("members")
            .select("*")
            .eq("role", "Executive Director")
            .limit(4);

        if (error) {
            console.error("Error fetching Executive Directors:", error);
            return;
        }

        members = data || [];

        let teamContainerHTML = "";

        members.forEach((member, index) => {
            teamContainerHTML += `
      <div class="col-md-4 col-lg-3">
        <div class="impact-card card h-100 border-0 shadow-sm text-center">
          <img src="https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${member.image}" 
               class="card-img-top rounded-circle w-75 mx-auto mt-4" 
               alt="${member.first_name} ${member.last_name}">
          <div class="card-body d-flex flex-column justify-content-between">
            <div>
              <h5 class="card-title">${member.first_name} ${member.last_name}</h5>
              <p class="card-text text-muted">${member.role}<br>${member.city}, ${member.state}</p>
            </div>
            <div class="btn-group mt-3" role="group">
              <button class="btn btn-outline-dark btn-sm w-50" data-index="${index}" data-bs-toggle="modal" data-bs-target="#bioModal">
                <i class="bi bi-person-lines-fill"></i> About
              </button>
              <a href="mailto:${member.email}" class="btn btn-outline-dark btn-sm w-50">
                <i class="bi bi-envelope"></i> Email
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
        });

        const container = document.getElementById("teamContainer");
        if (container) container.innerHTML = teamContainerHTML;

        // Modal population
        document.querySelectorAll('[data-bs-target="#bioModal"]').forEach(button => {
            button.addEventListener("click", (e) => {
                const index = e.currentTarget.getAttribute("data-index");
                const member = members[index];

                document.getElementById("bioModalImage").src = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${member.image}`;
                document.getElementById("bioModalLabel").textContent = `${member.first_name} ${member.last_name}`;
                document.getElementById("bioModalSubLabel").textContent = `${member.role} • ${member.city}, ${member.state}`;
                document.getElementById("bioModalBody").innerHTML = `<p>${member.bio}</p>`;

                const emailBtn = document.getElementById("bioModalEmail");
                emailBtn.href = `mailto:${member.email}`;
                emailBtn.innerHTML = `<i class="bi bi-envelope"></i> Email ${member.first_name}`;
            });
        });
    }

    document.addEventListener("DOMContentLoaded", loadAndRenderExecutiveDirectors);

})();