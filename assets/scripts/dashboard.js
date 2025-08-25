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
  messageEl.className = 'mt-2';

  if (newPassword !== confirmPassword) {
    messageEl.textContent = "Passwords do not match.";
    messageEl.classList.add('text-danger');
    return;
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    messageEl.textContent = "Password updated successfully!";
    messageEl.classList.add('text-success');
    changePasswordForm.reset();
    currentVerifiedPassword = newPassword;
  } catch (err) {
    messageEl.textContent = err.message || "Failed to update password.";
    messageEl.classList.add('text-danger');
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

// ======================
// VOLUNTEER HOURS MODULE
// ======================

async function initVolunteerSystem() {
  if (!currentMember) return;

  // ------------------ CREATE MODALS ------------------
  if (!document.getElementById('volunteerModal')) {
    const modalEl = document.createElement('div');
    modalEl.innerHTML = `
      <!-- Add Volunteer Entry Modal -->
      <div class="modal fade" id="volunteerModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Volunteer Entry</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="volunteerForm">
                <div class="mb-3">
                  <label class="form-label">Job Title</label>
                  <input type="text" class="form-control" id="volJobTitle" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Job Description</label>
                  <textarea class="form-control" id="volJobDesc" rows="3" required></textarea>
                </div>
                <div class="mb-3 row">
                  <div class="col-md-6">
                    <label class="form-label">Start Time</label>
                    <input type="datetime-local" class="form-control" id="volStart" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">End Time</label>
                    <input type="datetime-local" class="form-control" id="volEnd" required>
                  </div>
                </div>
              </form>
              <div id="volError" class="text-danger mt-2"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-dark" id="saveVolunteerBtn">Save</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Supervisor Comment Modal -->
      <div class="modal fade" id="commentModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Supervisor Comment</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <textarea class="form-control" id="modalSupervisorComment" rows="3"></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-dark" id="saveCommentBtn">Save</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title text-danger">Delete Entry</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              Are you sure you want to delete this volunteer entry? This cannot be undone.
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  const volunteerModal = new bootstrap.Modal(document.getElementById('volunteerModal'));
  const commentModal = new bootstrap.Modal(document.getElementById('commentModal'));
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

  let currentCommentEntryId = null;
  let currentDeleteEntryId = null;

  // ------------------ UTILITY FUNCTIONS ------------------
  const formatDuration = (start, end) => {
    const ms = end - start;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const formatDateLong = d => d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  // ------------------ LOAD ENTRIES ------------------
  const loadVolunteerEntries = async () => {
    if (!currentMember) return;

    // Join volunteers with members table to get name & pfp
    const { data: entries, error } = await supabase.from('volunteers')
      .select(`*, members:member_id(first_name, last_name, image, email)`)
      .order('start_timestamp', { ascending: false });

    if (error) return console.error(error);

    const cardContainer = document.getElementById('volunteerCards');
    cardContainer.innerHTML = '';

    if (!entries.length) {
      cardContainer.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-clock-history display-4 d-block mb-3"></i>
          <p>No volunteer entries found. Add your first entry to get started.</p>
        </div>
      `;
      return;
    }

    // Group entries by member_id
    const grouped = {};
    entries
      .filter(e => currentMember.tier === 1 || e.member_id === currentMember.member_id)
      .forEach(e => {
        if (!grouped[e.member_id]) grouped[e.member_id] = [];
        grouped[e.member_id].push(e);
      });

    Object.values(grouped).forEach(memberEntries => {
      const firstEntry = memberEntries[0];
      const isOwn = firstEntry.member_id === currentMember.member_id;
      const memberName = isOwn ? 'You' : `${firstEntry.members.first_name} ${firstEntry.members.last_name}`;
      const memberImage = firstEntry.members.image
        ? `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/${firstEntry.members.image}`
        : 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/default.jpg';

      // Outer accordion for the user
      const userAccordion = document.createElement('div');
      userAccordion.className = 'accordion mb-3 shadow-sm border rounded';
      const outerId = `userAccordion${firstEntry.member_id}`;
      userAccordion.innerHTML = `
        <h2 class="accordion-header" id="headingUser${firstEntry.member_id}">
          <button class="accordion-button collapsed bg-light text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapseUser${firstEntry.member_id}" aria-expanded="false">
            <div class="d-flex align-items-center gap-2">
              <img src="${memberImage}" alt="${memberName}" class="rounded-circle" width="32" height="32">
              <span>${memberName}</span>
              <span class="fw-bold ms-2 text-muted">(${memberEntries.length} ${memberEntries.length === 1 ? 'entry' : 'entries'})</span>
            </div>
          </button>
        </h2>
        <div id="collapseUser${firstEntry.member_id}" class="accordion-collapse collapse" data-bs-parent="#volunteerCards">
          <div class="accordion-body" id="userEntries${firstEntry.member_id}"></div>
        </div>
      `;
      cardContainer.appendChild(userAccordion);

      const userEntriesContainer = document.getElementById(`userEntries${firstEntry.member_id}`);

      memberEntries.forEach(entry => {
        const start = new Date(entry.start_timestamp);
        const end = new Date(entry.end_timestamp);
        const duration = formatDuration(start, end);
        const statusColor = entry.approved === 'approved' ? { bg: 'bg-success', color: 'white' } :
                            entry.approved === 'denied'   ? { bg: 'bg-danger',  color: 'white' } :
                                                            { bg: 'bg-warning', color: 'black' };

        const card = document.createElement('div');
        card.className = 'accordion-item mb-2 shadow-sm border rounded';
        card.innerHTML = `
          <h2 class="accordion-header" id="heading${entry.id}">
            <button class="accordion-button collapsed bg-white text-dark" type="button"
              data-bs-toggle="collapse" data-bs-target="#collapse${entry.id}" aria-expanded="false">
              <div class="d-flex w-100 justify-content-between align-items-center">
                <span><i class="bi bi-calendar-event me-2"></i>${formatDateLong(start)}</span>
                <span class="badge ${statusColor.bg} text-capitalize" style="color: ${statusColor.color}">
                  ${entry.approved}
                </span>
                <span class="fw-bold ms-3">${duration}</span>
              </div>
            </button>
          </h2>
          <div id="collapse${entry.id}" class="accordion-collapse collapse" data-bs-parent="#userEntries${firstEntry.member_id}">
            <div class="accordion-body">
              <p><strong>${entry.volunteering_job_title}</strong> - ${entry.volunteering_job_desc}</p>
              <p><i class="bi bi-clock me-1"></i>Start: ${start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
              <p><i class="bi bi-clock-history me-1"></i>End: ${end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
              <p><i class="bi bi-person-workspace me-1"></i>Supervisor Comment: ${entry.supervisor_comment || '-'}</p>
              <p><i class="bi bi-upload me-1"></i>Submitted: ${new Date(entry.request_submit_timestamp).toLocaleString([], {hour:'2-digit', minute:'2-digit'})}</p>
              <div class="mt-2 d-flex gap-2 flex-wrap">
                ${currentMember.tier === 1 && !isOwn ? `
                  <button class="btn btn-sm btn-outline-success approveBtn" data-id="${entry.id}"><i class="bi bi-check-circle me-1"></i>Approve</button>
                  <button class="btn btn-sm btn-outline-danger denyBtn" data-id="${entry.id}"><i class="bi bi-x-circle me-1"></i>Deny</button>
                  <button class="btn btn-sm btn-outline-secondary commentBtn" data-id="${entry.id}"><i class="bi bi-chat-left-text me-1"></i>Add Comment</button>` : ''}
                <button class="btn btn-sm btn-outline-danger deleteBtn" data-id="${entry.id}"><i class="bi bi-trash me-1"></i>Delete</button>
              </div>
            </div>
          </div>
        `;
        userEntriesContainer.appendChild(card);
      });
    });
  };

  // ------------------ ADD ENTRY ------------------
  document.getElementById('addVolunteerBtn').addEventListener('click', () => {
    document.getElementById('volunteerForm').reset();
    document.getElementById('volError').textContent = '';
    volunteerModal.show();
  });

  document.getElementById('saveVolunteerBtn').addEventListener('click', async () => {
    const title = document.getElementById('volJobTitle').value.trim();
    const desc = document.getElementById('volJobDesc').value.trim();
    const start = document.getElementById('volStart').value;
    const end = document.getElementById('volEnd').value;
    const errorEl = document.getElementById('volError');
    errorEl.textContent = '';

    if (!title || !desc || !start || !end) {
      errorEl.textContent = 'All fields are required.';
      return;
    }

    const startTime = new Date(start);
    const endTime = new Date(end);
    if (endTime <= startTime) {
      errorEl.textContent = 'End time must be after start time.';
      return;
    }

    const { error } = await supabase.from('volunteers').insert([{
      volunteering_job_title: title,
      volunteering_job_desc: desc,
      start_timestamp: startTime.toISOString(),
      end_timestamp: endTime.toISOString(),
      request_submit_timestamp: new Date().toISOString(),
      member_id: currentMember.member_id,
      approved: 'waiting',
      supervisor_comment: ''
    }]);

    if (error) {
      errorEl.textContent = error.message || 'Failed to save entry.';
      return;
    }

    volunteerModal.hide();
    await loadVolunteerEntries();
  });

  // ------------------ EVENT DELEGATION ------------------
  document.getElementById('volunteerCards').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const entryId = btn.dataset.id;
    if (!entryId) return;

    if (btn.classList.contains('approveBtn')) {
      await supabase.from('volunteers').update({ approved: 'approved' }).eq('id', entryId);
      await loadVolunteerEntries();
    }

    if (btn.classList.contains('denyBtn')) {
      await supabase.from('volunteers').update({ approved: 'denied' }).eq('id', entryId);
      await loadVolunteerEntries();
    }

    if (btn.classList.contains('commentBtn')) {
      currentCommentEntryId = entryId;
      const { data } = await supabase.from('volunteers').select('supervisor_comment').eq('id', entryId).single();
      document.getElementById('modalSupervisorComment').value = data.supervisor_comment || '';
      commentModal.show();
    }

    if (btn.classList.contains('deleteBtn')) {
      currentDeleteEntryId = entryId;
      deleteModal.show();
    }
  });

  // ------------------ COMMENT SAVE ------------------
  document.getElementById('saveCommentBtn').addEventListener('click', async () => {
    if (!currentCommentEntryId) return;
    const comment = document.getElementById('modalSupervisorComment').value.trim();
    await supabase.from('volunteers').update({ supervisor_comment: comment }).eq('id', currentCommentEntryId);
    commentModal.hide();
    currentCommentEntryId = null;
    await loadVolunteerEntries();
  });

  // ------------------ DELETE CONFIRM ------------------
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!currentDeleteEntryId) return;
    await supabase.from('volunteers').delete().eq('id', currentDeleteEntryId);
    deleteModal.hide();
    currentDeleteEntryId = null;
    await loadVolunteerEntries();
  });

  // ------------------ INITIAL LOAD ------------------
  await loadVolunteerEntries();
}

// ======================
// MAIN INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', async () => {
  await loadMemberData();
  await initVolunteerSystem();
});
