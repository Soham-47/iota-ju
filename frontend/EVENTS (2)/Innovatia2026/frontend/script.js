/**
 * Innovatia 2026 Registration Frontend Script (v3)
 * Location: EVENTS/Innovatia2026/frontend/script.js
 * Handles dynamic team member fields, file pre-validation, and submission to backend API.
 */

// Toggle Member 2 (Team Partner) fields based on participation selection
function toggleTeamSection() {
    const typeSelect = document.getElementById("registration_type");
    if (!typeSelect) return;

    const type = typeSelect.value;
    const m2Container = document.getElementById("member2_container");
    const m1Title = document.getElementById("m1_title");
    
    const m2Inputs = ["m2_name", "m2_college", "m2_department", "m2_year", "m2_email", "m2_whatsapp"];

    if (type === "team") {
        if (m2Container) m2Container.style.display = "block";
        if (m1Title) m1Title.innerText = "Team Leader Details";
        m2Inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute("required", "required");
        });
    } else {
        if (m2Container) m2Container.style.display = "none";
        if (m1Title) m1Title.innerText = "Participant Details";
        m2Inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.removeAttribute("required");
        });
    }
}

// Bind form submission event handler on DOM load
document.addEventListener("DOMContentLoaded", function () {
    const regForm = document.getElementById("innovatiaForm") || document.getElementById("regForm");
    if (!regForm) return;

    // Attach toggle handler to registration type selector
    const typeSelect = document.getElementById("registration_type");
    if (typeSelect) {
        typeSelect.addEventListener("change", toggleTeamSection);
        toggleTeamSection(); // Initial state check
    }

    regForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const submitBtn = document.getElementById("submitBtn");
        const responseDiv = document.getElementById("responseMessage");

        // Client-side file pre-validation
        const fileInput = document.getElementById("payment_screenshot") || regForm.querySelector('input[type="file"]');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const maxMB = 5;
            const maxBytes = maxMB * 1024 * 1024;
            const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
            const allowedExts = [".png", ".jpg", ".jpeg"];

            const fileName = file.name.toLowerCase();
            const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));
            const hasValidType = allowedTypes.includes(file.type.toLowerCase());

            if (!hasValidExt && !hasValidType) {
                alert("Invalid file format. Please upload a PNG or JPEG screenshot.");
                return;
            }

            if (file.size > maxBytes) {
                alert(`File size exceeds ${maxMB}MB limit. Please upload a smaller screenshot.`);
                return;
            }
        }

        // Lock submit button during request execution
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Submitting... <i class="fas fa-spinner fa-spin"></i>';
        }

        const formData = new FormData(regForm);

        // API Endpoint routing: local server relative route vs production backend API domain
        const isLocalHost = window.location.hostname === "localhost" || 
                            window.location.hostname === "127.0.0.1" || 
                            window.location.hostname.startsWith("192.168.");
        
        // Use relative URL for local development; configure production backend endpoint URL for live static hosts
        const API_BASE_URL = isLocalHost 
            ? "" 
            : (window.SERVER_API_URL || "https://iota-ju-backend.up.railway.app");

        const targetEndpoint = `${API_BASE_URL}/EVENTS/Innovatia2026/Registration`;

        try {
            const response = await fetch(targetEndpoint, {
                method: "POST",
                body: formData
            });

            let result = {};
            try {
                result = await response.json();
            } catch (jsonErr) {
                result = { message: `Server error (${response.status} ${response.statusText})` };
            }

            if (response.ok && result.status === "success") {
                regForm.style.display = "none";
                if (responseDiv) {
                    responseDiv.className = "status-success";
                    responseDiv.style.display = "block";
                    responseDiv.innerHTML = `
                        <h3><i class="fas fa-check-circle"></i> Registration Received!</h3>
                        <p style="margin-top: 8px;">Your response has been logged successfully.</p>
                        <p style="margin-top: 12px; font-size: 1.1rem;"><strong>Registration ID:</strong> <span style="color: #2ecc71;">${result.registration_id}</span></p>
                        <p style="margin-top: 6px; color: var(--text-dim);"><strong>Payment Status:</strong> Pending Verification</p>
                        <p style="margin-top: 16px; font-size: 0.85rem; color: var(--text-muted);">Organizers will cross-check your UPI transaction reference ID. You will receive confirmation once verified.</p>
                    `;
                }
            } else {
                const errorMsg = result.message || "Please verify form inputs and try again.";
                alert("Submission error: " + errorMsg);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Submit Registration <i class="fas fa-paper-plane"></i>';
                }
            }
        } catch (err) {
            console.error("Registration submission error:", err);
            alert("Network error: Could not reach the registration server. Please check your connection and try again.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Registration <i class="fas fa-paper-plane"></i>';
            }
        }
    });
});
