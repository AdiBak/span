// Load Supabase client
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qujzohvrbfsouakzocps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let members = [];

async function loadAndRenderExecutiveDirectors() {
  const { data, error } = await supabase
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
