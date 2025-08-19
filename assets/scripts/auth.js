import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import jsQR from "https://cdn.jsdelivr.net/npm/jsqr/+esm";

const SUPABASE_URL = "https://qujzohvrbfsouakzocps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- EMAIL/PASSWORD LOGIN ----------
const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("error-message");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorMessage) errorMessage.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/dashboard.html";
    } catch (err) {
      if (errorMessage) errorMessage.textContent = err.message || "Login failed.";
    }
  });
}

// ---------- QR LOGIN ----------
const qrLoginBtn = document.getElementById("qr-login-btn");
if (qrLoginBtn) {
  qrLoginBtn.addEventListener("click", async () => {
    const qrModalEl = document.getElementById("qrLoginModal");
    const qrModal = new bootstrap.Modal(qrModalEl);
    qrModal.show();

    const video = document.getElementById("qrVideo");
    const qrError = document.getElementById("qrError");
    if (qrError) qrError.style.display = "none";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });

      // Display stream in video
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().catch(err => console.error("Video play blocked:", err));
        scanLoop();
      };

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      async function scanLoop() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            try {
              const qrData = JSON.parse(code.data);
              if (!qrData.email || !qrData.password) throw new Error("Invalid QR format");

              const { error } = await supabase.auth.signInWithPassword({
                email: qrData.email,
                password: qrData.password
              });
              if (error) throw error;

              // stop stream
              stream.getTracks().forEach(track => track.stop());
              qrModal.hide();
              window.location.href = "/dashboard.html";
              return;
            } catch (err) {
              if (qrError) {
                qrError.textContent = "QR Login Failed: " + err.message;
                qrError.style.display = "block";
              }
            }
          }
        }
        requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      console.error("Camera error:", err);
      if (qrError) {
        qrError.textContent = "Camera access required.";
        qrError.style.display = "block";
      }
    }
  });
}

// ---------- LOGOUT ----------
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/index.html";
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await logout();
  });
}
