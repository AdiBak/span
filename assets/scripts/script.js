import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qujzohvrbfsouakzocps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================
// bills.js
// ==================
// NOTE: Bills functionality has been migrated to React
// - Full bills page: src/pages/BillsPage.jsx
// - Homepage preview: src/components/BillsPreview.jsx
// - Stats updater: src/components/BillsStats.jsx
// This code block has been removed - the React versions handle all bills rendering

// ==================
// blog.js
// ==================
// NOTE: Blog functionality has been migrated to React (src/pages/BlogPage.jsx)
// This code block has been removed - the React version handles all blog rendering


// ==================
// directory.js
// ==================
// NOTE: Directory functionality has been migrated to React (src/pages/DirectoryPage.jsx)
// This code block has been removed - the React version handles all directory rendering

// ==================
// navbar.js
// ==================
(async function() {
    let currentPath = window.location.pathname;
    if (currentPath === "/") currentPath = "/index.html";

    const navContainer = document.getElementById("navbarContainer");

    async function renderNavbar() {
        const { data: { session } } = await supabase.auth.getSession();

        let userMenu = '';

        if (session && session.user) {
            const { data: member } = await supabase
                .from('members')
                .select('first_name, image')
                .eq('email', session.user.email)
                .maybeSingle();

            let firstName = "there";
            let imageUrl = '';

            if (member) {
                if (member.first_name) firstName = member.first_name;
                if (member.image) imageUrl = member.image;
            }

            userMenu = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" style="padding-top:0.5rem; padding-bottom:0.5rem;">
                    ${imageUrl ? `<img src="https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${imageUrl}" 
                    alt="${firstName}" width="32" height="32" class="rounded-circle me-2" style="object-fit: cover;">` : ''}
                    Welcome, ${firstName}!
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/dashboard.html">Dashboard</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="signOutBtn">Sign Out</a></li>
                </ul>
            </li>
            `;
        } else {
            userMenu = `
            <li class="nav-item">
                <a class="nav-link ${currentPath === "/login.html" ? "active" : ""}" href="/login.html">Login</a>
            </li>
            `;
        }

        navContainer.innerHTML = `
            <div class="container">
                <a class="navbar-brand" href="/index.html">
                    <img class="my-2" src="/assets/images/index/logo-wide-light.svg" height="30" alt="SPAN Logo">
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto align-items-center">
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
                        ${userMenu}
                    </ul>
                </div>
            </div>
        `;

        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabase.auth.signOut();
            });
        }
    }

    // Initial render
    renderNavbar();

    // Re-render on auth changes
    supabase.auth.onAuthStateChange(() => {
        renderNavbar();
    });

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