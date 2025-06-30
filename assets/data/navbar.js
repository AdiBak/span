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
          <li class="nav-item"><a class="nav-link" href="#home">Home</a></li>
          <li class="nav-item"><a class="nav-link" href="#about">About</a></li>
          <li class="nav-item"><a class="nav-link" href="#impact">Impact</a></li>
          <li class="nav-item"><a class="nav-link" href="#join">Join Us</a></li>
          <li class="nav-item"><a class="nav-link" href="#resources">Resources</a></li>
          <li class="nav-item"><a class="nav-link" href="#team">Our Team</a></li>
          <li class="nav-item"><a class="nav-link" href="#contact">Contact</a></li>
          <li class="nav-item"><a class="nav-link" href="#donate">Donate</a></li>
        </ul>
      </div>
    </div>
`;

document.getElementById('navbarContainer').innerHTML = navbar;