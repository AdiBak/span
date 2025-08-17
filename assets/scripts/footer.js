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