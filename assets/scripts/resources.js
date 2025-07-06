// Import resource data
import {
   resources
} from "/assets/data/resources.js";

// String to store HTML for displaying resource cards
var resourceContainerHTML = "";

// Construct HTML for each card using forEach loop
resources.forEach(function (resource) {
   resourceContainerHTML += `
    <div class="col-md-6">
        <div class="impact-card card h-100">
            <div class="card-body">
            <h5 class="card-title">${resource.title}</h5>
            <p class="card-text">${resource.description}</p>
            <a href="${resource.link}" target="_blank" class="btn btn-outline-dark">${resource.linkText}</a>
            </div>
        </div>
    </div>
`;
});

// Add the constructed HTML to the card container in the document
document.getElementById("resourceContainer").innerHTML = resourceContainerHTML;