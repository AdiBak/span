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
    authorName = `<a class='text-muted' style='text-decoration: none;' href='/directory.html?search=Ashita+Virani'><img style='border-radius: 50%;' src='/assets/images/team/ashita-virani.jpg' height='16px'> Ashita Virani</a>`;
  } else if (lowerContent.includes("arnav goyal")) {
    authorName = `<a class='text-muted' style='text-decoration: none;' href='/directory.html?search=Arnav+Goyal'><img style='border-radius: 50%;' src='/assets/images/team/arnav-goyal.jpg' height='16px'> Arnav Goyal</a>`;
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
