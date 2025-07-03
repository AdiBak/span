// Import team data
import { members } from "/assets/data/team.js";

// String to store HTML for displaying member cards
var teamContainerHTML = "";

// Construct HTML for each card using forEach loop
members.forEach(function(member) {
teamContainerHTML += `
<div class="col-md-4 col-lg-3">
    <div class="card h-100 border-0 shadow-sm text-center">
    <img src="/assets/images/team/${member.image}" class="card-img-top rounded-circle w-75 mx-auto mt-4" alt="${member.firstName} ${member.lastName}">
    <div class="card-body">
        <h5 class="card-title">${member.firstName} ${member.lastName}</h5>
        <p class="card-text text-muted">${member.position}<br>${member.location}</p>
        <a href="mailto:${member.email}" class="btn btn-outline-dark btn-sm">
        <i class="bi bi-envelope"></i> Email ${member.firstName}
        </a>
    </div>
    </div>
</div>
`;
});

// Add the constructed HTML to the card container in the document
document.getElementById("teamContainer").innerHTML = teamContainerHTML;
document.getElementById("advocates").innerHTML = members.length;