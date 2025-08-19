import { supabase } from './auth.js';

// ======================
// Helper functions
// ======================

function formatDate(dateStr) {
  if (!dateStr) return '-';
  
  // Split the date string "YYYY-MM-DD"
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Month is 0-indexed in JS Date
  const d = new Date(year, month - 1, day);

  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}


function formatPhone(phone) {
  if (!phone) return '-';
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  return phone;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// ======================
// Global variables
// ======================

let currentMember = null;
let currentVerifiedPassword = '';

// ======================
// Load Member Data
// ======================

async function loadMemberData() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return window.location.href = "/login.html";

  const email = session.user.email;

  const { data: member, error } = await supabase
    .from('members')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error || !member) return console.error(error);

  currentMember = member;

  // Header
  const fullName = `${member.first_name || ''} ${member.last_name || ''}`;
  document.getElementById('fullName').textContent = fullName;
  document.getElementById('role').textContent = member.role || '-';

  // Profile image
  if (member.image) {
    const img = document.getElementById('profileImage');
    img.src = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${member.image}`;
    img.style.display = 'inline-block';
  }

  // Social links
  if (member.linkedin) {
    const li = document.getElementById('linkedinLink');
    li.href = member.linkedin;
    li.style.display = 'inline-block';
  }
  if (member.instagram) {
    const ig = document.getElementById('instagramLink');
    ig.href = member.instagram;
    ig.style.display = 'inline-block';
  }

  // Info cards
  const combinedFields = [
    { label: 'Full Name', value: fullName },
    { label: 'Role', value: member.role || '-' },
    { label: 'Start Date', value: formatDate(member.start_date) },
    { label: 'Date of Birth', value: formatDate(member.dob) },
    { label: 'School', value: member.school_name || '-' },
    { label: 'Location', value: member.city && member.state ? `${member.city}, ${member.state}` : '-' },
    { label: 'Email', value: member.email || '-' },
    { label: 'Phone', value: formatPhone(member.phone) },
  ];

  const infoCards = document.getElementById('infoCards');
  infoCards.innerHTML = '';
  combinedFields.forEach(f => {
    const col = document.createElement('div');
    col.className = 'col-md-6 mb-3';
    col.innerHTML = `
      <div class="card info-card h-100">
        <div class="card-body">
          <div class="field-label">${f.label}</div>
          <div class="card-text">${f.value}</div>
        </div>
      </div>
    `;
    infoCards.appendChild(col);
  });
}

// ======================
// Change Password
// ======================

const changePasswordForm = document.getElementById('changePasswordForm');
changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const messageEl = document.getElementById('passwordMessage');
  messageEl.textContent = '';

  if (newPassword !== confirmPassword) {
    messageEl.textContent = "Passwords do not match.";
    messageEl.classList.remove('text-success');
    messageEl.classList.add('text-danger');
    return;
  }

  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    messageEl.textContent = "Password updated successfully!";
    messageEl.classList.remove('text-danger');
    messageEl.classList.add('text-success');
    changePasswordForm.reset();

    // Update QR code password automatically
    currentVerifiedPassword = newPassword;

  } catch (err) {
    messageEl.textContent = err.message || "Failed to update password.";
    messageEl.classList.remove('text-success');
    messageEl.classList.add('text-danger');
  }
});

// ======================
// Generate SPAN Card with QR Timestamp
// ======================

const downloadBtn = document.getElementById('downloadSpanCard');
const passwordModalEl = document.getElementById('passwordModal');
const passwordModal = new bootstrap.Modal(passwordModalEl);
const confirmBtn = document.getElementById('confirmQrPassword');
const passwordInput = document.getElementById('qrPasswordInput');
const passwordError = document.getElementById('qrPasswordError');

async function handleQrPasswordConfirm() {
  const password = passwordInput.value.trim() || currentVerifiedPassword;
  if (!password) {
    passwordError.textContent = "Password required.";
    passwordError.style.display = 'block';
    return;
  }

  passwordError.style.display = 'none';
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: currentMember.email,
      password
    });

    if (error) {
      passwordError.textContent = "Incorrect password.";
      passwordError.style.display = 'block';
      return;
    }

    passwordModal.hide();
    currentVerifiedPassword = password;

    const timestamp = new Date().toISOString();
    await generateSpanCard(currentVerifiedPassword, timestamp);

  } catch (err) {
    console.error(err);
    passwordError.textContent = "Error verifying password.";
    passwordError.style.display = 'block';
  }
}

downloadBtn.addEventListener('click', () => {
  if (!currentMember) return;

  passwordInput.value = '';
  passwordError.style.display = 'none';

  // Remove old listener
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  const newConfirmBtn = document.getElementById('confirmQrPassword');
  newConfirmBtn.addEventListener('click', handleQrPasswordConfirm);

  passwordModal.show();
});

async function generateSpanCard(password, timestamp) {
  if (!currentMember) return;

  const canvas = document.createElement('canvas');
  canvas.width = 2160;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  const siteFont = window.getComputedStyle(document.body).fontFamily || 'sans-serif';

  const loadImage = src => new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });

  try {
    const [bgImage, profileImage, spanLogo] = await Promise.all([
      loadImage('/assets/images/index/hero.jpg'),
      loadImage(currentMember.image
        ? `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${currentMember.image}`
        : null),
      loadImage('/assets/images/index/logo-wide-light.svg')
    ]);

    // Background
    if (bgImage) ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    else { ctx.fillStyle = '#16213e'; ctx.fillRect(0,0,canvas.width,canvas.height); }

    // Accent bar
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0,0,40,canvas.height);

    // Profile
    const profileX=160, profileY=200, profileSize=400;
    if (profileImage) {
      ctx.fillStyle='#fff';
      ctx.beginPath();
      ctx.arc(profileX+profileSize/2, profileY+profileSize/2, profileSize/2+8,0,Math.PI*2); ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(profileX+profileSize/2, profileY+profileSize/2, profileSize/2,0,Math.PI*2); ctx.closePath(); ctx.clip();
      ctx.drawImage(profileImage, profileX, profileY, profileSize, profileSize);
      ctx.restore();
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=16; ctx.beginPath();
      ctx.arc(profileX+profileSize/2, profileY+profileSize/2, profileSize/2,0,Math.PI*2); ctx.stroke();
    }

    // SPAN Logo
    if (spanLogo) {
      const logoWidth=600;
      const aspectRatio=spanLogo.naturalWidth/spanLogo.naturalHeight;
      const logoHeight=logoWidth/aspectRatio;
      ctx.drawImage(spanLogo, canvas.width-logoWidth-120, 100, logoWidth, logoHeight);
    }

    // Text
    const contentX=profileX+profileSize+120, contentWidth=canvas.width-contentX-120;
    ctx.fillStyle='#fff'; ctx.textBaseline='top';
    ctx.font=`bold 128px ${siteFont}`; ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=16;
    wrapText(ctx, `${currentMember.first_name} ${currentMember.last_name}`, contentX, 200, contentWidth, 140);
    ctx.shadowColor='transparent'; ctx.fillStyle='#4cc9f0'; ctx.font=`600 80px ${siteFont}`;
    ctx.fillText(currentMember.role||'', contentX, 360);
    ctx.fillStyle='#fff'; ctx.font=`500 72px ${siteFont}`; ctx.fillText(currentMember.school_name||'', contentX, 460);

    // Divider
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(contentX,560); ctx.lineTo(contentX+contentWidth,560); ctx.stroke();

    // Contact info
    const contactY=600, columnWidth=contentWidth/2-60;
    ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.font=`300 56px ${siteFont}`;
    if(currentMember.city||currentMember.state) ctx.fillText(`${currentMember.city||''}${currentMember.city&&currentMember.state?', ':''}${currentMember.state||''}`, contentX, contactY);
    if(currentMember.phone) ctx.fillText(formatPhone(currentMember.phone), contentX, contactY+80);
    if(currentMember.email) ctx.fillText(currentMember.email, contentX+columnWidth+60, contactY);
    if(currentMember.start_date) ctx.fillText(`Member since ${formatDate(currentMember.start_date)}`, contentX+columnWidth+60, contactY+80);

    // QR Code
    if (typeof QRCode !== 'undefined') {
      const qrSize=280, qrX=profileX+60, qrY=profileY+profileSize+120;
      ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.roundRect(qrX-20, qrY-20, qrSize+40, qrSize+40,24); ctx.fill(); ctx.stroke();

      const qrPayload = JSON.stringify({ email: currentMember.email, password, timestamp });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: qrSize, color:{ dark:'#ffffff', light:'#00000000' }, margin:0 });
      const qrImg = await loadImage(qrDataUrl);
      if(qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }

    // Download
    const link=document.createElement('a');
    link.download=`${currentMember.first_name}_${currentMember.last_name}_SPANCard.png`;
    link.href=canvas.toDataURL('image/png'); link.click();

  } catch(err){ console.error(err); alert('Failed to generate SPAN card: '+err.message);}
}

// ======================
// Init
// ======================

loadMemberData();
