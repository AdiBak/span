// Array containing information about team members
var members = [
{
  firstName: "Vishank",
  lastName: "Panchbhavi",
  position: "Collegiate Ambassador",
  location: "Atlanta, GA",
  email: "vishpanchbhavi@gmail.com",
  image: "vishank-panchbhavi.jpg"
},
{
  firstName: "Shayan",
  lastName: "Saqib",
  position: "High School Ambassador",
  location: "Houston, TX",
  email: "shayansaqib59@gmail.com",
  image: "shayan-saqib.jpg"
},
{
  firstName: "Joel",
  lastName: "Blessan",
  position: "Policy Research Director",
  location: "Houston, TX",
  email: "joelvblessan@gmail.com",
  image: "joel-blessan.jpg"
},
{
  firstName: "Ben",
  lastName: "Kurian",
  position: "Outreach Director",
  location: "Columbus, OH",
  email: "bkuroh17@gmail.com",
  image: "ben-kurian.jpg"
},
];

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