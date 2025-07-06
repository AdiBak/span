// Import team data
import { members } from "/assets/data/team.js";

// Render cards
let teamContainerHTML = "";

members.forEach((member, index) => {
  teamContainerHTML += `
    <div class="col-md-4 col-lg-3">
      <div class="card h-100 border-0 shadow-sm text-center">
        <img src="/assets/images/team/${member.image}" class="card-img-top rounded-circle w-75 mx-auto mt-4" alt="${member.firstName} ${member.lastName}">
        <div class="card-body d-flex flex-column justify-content-between">
          <div>
            <h5 class="card-title">${member.firstName} ${member.lastName}</h5>
            <p class="card-text text-muted">${member.position}<br>${member.location}</p>
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

document.getElementById("teamContainer").innerHTML = teamContainerHTML;

// Modal population
document.querySelectorAll('[data-bs-target="#bioModal"]').forEach(button => {
  button.addEventListener("click", (e) => {
    const index = e.currentTarget.getAttribute("data-index");
    const member = members[index];

    document.getElementById("bioModalImage").src = `/assets/images/team/${member.image}`;
    document.getElementById("bioModalLabel").textContent = `${member.firstName} ${member.lastName}`;
    document.getElementById("bioModalSubLabel").textContent = `${member.position} • ${member.location}`;
    document.getElementById("bioModalBody").innerHTML = `<p>${member.bio}</p>`;

    const emailBtn = document.getElementById("bioModalEmail");
    emailBtn.href = `mailto:${member.email}`;
    emailBtn.innerHTML = `<i class="bi bi-envelope"></i> Email ${member.firstName}`;
  });
});
