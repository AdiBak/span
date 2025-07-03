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
          <a class="nav-link" href="https://www.paypal.com/donate/?hosted_button_id=EXAMPLE">Donate</a>
        </li>
      </ul>
    </div>
  </div>
`;

document.getElementById("navbarContainer").innerHTML = navbar;
