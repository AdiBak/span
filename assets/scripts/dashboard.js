import { supabase } from './auth.js';

// ======================
// Helper functions
// ======================

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatPhone(phone) {
  if (!phone) return '-';
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
}

function shrinkText(ctx, text, maxWidth, fontBase) {
  let size = fontBase;
  ctx.font = `${size}px ${ctx.fontFamily || 'sans-serif'}`;
  while (ctx.measureText(text).width > maxWidth && size > 24) {
    size -= 2;
    ctx.font = `${size}px ${ctx.fontFamily || 'sans-serif'}`;
  }
  return size;
}

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

  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
  document.getElementById('fullName').textContent = fullName;
  document.getElementById('role').textContent = member.role || '-';

  if (member.image) {
    const img = document.getElementById('profileImage');
    img.src = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${member.image}`;
    img.style.display = 'inline-block';
  }

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

  const fields = [
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
  fields.forEach(f => {
    const col = document.createElement('div');
    col.className = 'col-md-6 mb-3';
    col.innerHTML = `
      <div class="card info-card impact-card h-100 shadow-sm">
        <div class="card-body">
          <div class="field-label fw-semibold text-muted small">${f.label}</div>
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
changePasswordForm.addEventListener('submit', async e => {
  e.preventDefault();
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const messageEl = document.getElementById('passwordMessage');
  messageEl.textContent = '';

  if (newPassword !== confirmPassword) {
    messageEl.textContent = "Passwords do not match.";
    messageEl.classList.replace('text-success', 'text-danger');
    return;
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    messageEl.textContent = "Password updated successfully!";
    messageEl.classList.replace('text-danger', 'text-success');
    changePasswordForm.reset();
    currentVerifiedPassword = newPassword;
  } catch (err) {
    messageEl.textContent = err.message || "Failed to update password.";
    messageEl.classList.replace('text-success', 'text-danger');
  }
});

// ======================
// SPAN Card Generation
// ======================

const downloadBtn = document.getElementById('downloadSpanCard');
const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
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
    await generateSpanCard(password, timestamp);
  } catch (err) {
    passwordError.textContent = "Error verifying password.";
    passwordError.style.display = 'block';
  }
}

downloadBtn.addEventListener('click', () => {
  if (!currentMember) return;
  passwordInput.value = '';
  passwordError.style.display = 'none';
  const confirmBtn = document.getElementById('confirmQrPassword');
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  document.getElementById('confirmQrPassword').addEventListener('click', handleQrPasswordConfirm);
  passwordModal.show();
});

async function generateSpanCard(password, timestamp) {
  if (!currentMember) return;

  const canvas = document.createElement('canvas');
  canvas.width = 2160;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  ctx.fontFamily = window.getComputedStyle(document.body).fontFamily || 'sans-serif';

  const loadImage = src => new Promise(res => {
    if (!src) return res(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => res(img);
    img.onerror = () => res(null);
  });

  const [bgImage, profileImage] = await Promise.all([
    loadImage('/assets/images/misc/SPANCard.jpg'),
    loadImage(currentMember.image
      ? `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${currentMember.image}`
      : null)
  ]);

  // Background
  if (bgImage) ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  else { ctx.fillStyle = '#16213e'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

  // Left half content area
  const leftW = canvas.width / 2;
  const padding = 100;

  // Profile circle
  if (profileImage) {
    const pSize = 250;
    const pX = padding;
    const pY = 250;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pX + pSize/2, pY + pSize/2, pSize/2, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(profileImage, pX, pY, pSize, pSize);
    ctx.restore();
  }

  // Text content
  const textX = padding;
  let y = 600;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;

  const fullName = `${currentMember.first_name} ${currentMember.last_name}`;
  const fontSize = shrinkText(ctx, fullName, leftW - 2*padding, 100);
  ctx.font = `bold ${fontSize}px ${ctx.fontFamily}`;
  ctx.fillText(fullName, textX, y);
  y += fontSize + 20;

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fdf0d5';
  ctx.font = `600 72px ${ctx.fontFamily}`;
  ctx.fillText(currentMember.role || '', textX, y);
  y += 80;

  ctx.fillStyle = '#fff';
  ctx.font = `500 56px ${ctx.fontFamily}`;
  ctx.fillText(currentMember.school_name || '', textX, y);
  y += 80;

  ctx.font = `300 48px ${ctx.fontFamily}`;
  if (currentMember.city || currentMember.state)
    ctx.fillText(`${currentMember.city || ''}${currentMember.city && currentMember.state?', ':''}${currentMember.state || ''}`, textX, y);
  y += 60;
  if (currentMember.phone) ctx.fillText(formatPhone(currentMember.phone), textX, y);
  y += 60;
  if (currentMember.email) ctx.fillText(currentMember.email, textX, y);
  y += 60;
  if (currentMember.start_date) ctx.fillText(`Member since ${formatDate(currentMember.start_date)}`, textX, y);

// QR Code on right half with liquid glass box (old logic + new styling)
if (typeof QRCode !== 'undefined') {
  const qrSize = 600; // keep old working size
  const qrX = leftW + (leftW - qrSize) / 2; 
  const qrY = (canvas.height - qrSize) / 2 + 75;

  // Draw translucent rounded box (liquid glass style)
  const boxPadding = 40;
  const boxX = qrX - boxPadding;
  const boxY = qrY - boxPadding;
  const boxW = qrSize + boxPadding * 2;
  const boxH = qrSize + boxPadding * 2;

  ctx.save();
  ctx.fillStyle = '#ffffff'; // match old subtle fill
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; // match old border contrast
  ctx.lineWidth = 4;
  ctx.beginPath();
  const r = 24; // old border radius
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxW - r, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
  ctx.lineTo(boxX + boxW, boxY + boxH - r);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
  ctx.lineTo(boxX + r, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Use old payload generation logic
  const qrPayload = JSON.stringify({ 
    email: currentMember.email, 
    password, 
    timestamp 
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: qrSize,
    color: { dark: '#000000', light: '#ffffff' },
    margin: 0
  });

  const qrImg = await loadImage(qrDataUrl);
  if (qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
}

  // Download image
  const link = document.createElement('a');
  link.download = `${currentMember.first_name}_${currentMember.last_name}_SPANCard.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Init
loadMemberData();
