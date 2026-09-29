/**
 * Innovatia 2026 Registration Frontend Script
 * Location: EVENTS (2)/Innovatia2026/frontend/script.js
 * Handles dynamic team member fields and form submission to local Python server.
 */

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

document.addEventListener("DOMContentLoaded", function () {
    const regForm = document.getElementById("innovatiaForm") || document.getElementById("regForm");
    if (!regForm) return;

    regForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById("submitBtn");
        const responseDiv = document.getElementById("responseMessage");

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Submitting... <i class="fas fa-spinner fa-spin"></i>';
        }

        const formData = new FormData(regForm);

        // Target the endpoint dynamically relative to current origin
        const targetUrl = window.location.origin + "/EVENTS (2)/Innovatia2026/Registration";
        console.log("Submitting form to:", targetUrl);

        try {
            const response = await fetch(targetUrl, {
                method: "POST",
                body: formData
            });

            const text = await response.text();
            let result = {};
            try {
                result = JSON.parse(text);
            } catch (pErr) {
                console.error("Non-JSON server response:", text);
                alert(`Server returned status ${response.status} (${response.statusText}). Check your terminal running python server.py.`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Submit Registration <i class="fas fa-paper-plane"></i>';
                }
                return;
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
                alert("Submission error: " + (result.message || `Server Status ${response.status}`));
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Submit Registration <i class="fas fa-paper-plane"></i>';
                }
            }
        } catch (err) {
            console.error("Registration fetch error:", err);
            alert("Network connection failed. Make sure 'python server.py' is running in terminal on port 3000.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Registration <i class="fas fa-paper-plane"></i>';
            }
        }
    });
});
