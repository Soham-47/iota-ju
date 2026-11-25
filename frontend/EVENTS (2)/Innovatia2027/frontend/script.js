/**
 * Innovatia 2026 Registration Frontend Script (Supabase Storage & DB Integration)
 * Location: frontend/EVENTS (2)/Innovatia2026/frontend/script.js
 *
 * Uses central configuration from config.js (loaded from .env).
 * Uploads receipt screenshots to Supabase Storage and records registrations in Supabase PostgreSQL.
 */




// 1. RESOLVE CONFIGURATION (FROM config.js OR FALLBACK)



const CONFIG = (typeof API_CONFIG !== "undefined" && API_CONFIG) ? API_CONFIG : {
    SUPABASE_URL: "https://sndmziujhdylwxtbmkyl.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_MuWOqIoA84vAXkPizVCMew_TMZkYGww",
    TABLE_NAME: "innovatia_2026_registrations",
    STORAGE_BUCKET: "payment-receipts",
    get REST_ENDPOINT() {
        return `${this.SUPABASE_URL}/rest/v1/${this.TABLE_NAME}`;
    }
};

const DRAFT_KEY = "innovatia_2026_form_draft";
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTS = [".png", ".jpg", ".jpeg"];
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"];

/**
 * Initialize Supabase client if SDK is loaded from CDN
 */
function getSupabaseClient() {
    if (window.supabase && typeof window.supabase.createClient === "function") {
        try {
            return window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        } catch (e) {
            console.warn("Could not initialize Supabase SDK client:", e);
        }
    }
    return null;
}

/**
 * Generate official registration ID: INNO26-XXXXXX (6 hex chars)
 */
function generateRegistrationId() {
    const chars = "0123456789ABCDEF";
    let code = "";
    if (window.crypto && window.crypto.getRandomValues) {
        const bytes = new Uint8Array(3);
        window.crypto.getRandomValues(bytes);
        bytes.forEach(b => {
            code += chars[Math.floor(b / 16)] + chars[b % 16];
        });
    } else {
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    return `INNO26-${code}`;
}

/**
 * Toggle Member 2 section based on registration type (Single vs Team)
 */
function toggleTeamSection() {
    const typeSelect = document.getElementById("registration_type") || document.querySelector('[name="registration_type"]');
    if (!typeSelect) return;

    const type = typeSelect.value;
    const m2Container = document.getElementById("member2_container");
    const m1Title = document.getElementById("m1_title");

    const m2Inputs = ["m2_name", "m2_college", "m2_department", "m2_year", "m2_email", "m2_whatsapp"];

    if (type === "team") {
        if (m2Container) m2Container.style.display = "block";
        if (m1Title) m1Title.innerText = "Team Leader Details";
        m2Inputs.forEach(id => {
            const el = document.getElementById(id) || document.querySelector('[name="' + id + '"]');
            if (el) el.setAttribute("required", "required");
        });
    } else {
        if (m2Container) m2Container.style.display = "none";
        if (m1Title) m1Title.innerText = "Participant Details";
        m2Inputs.forEach(id => {
            const el = document.getElementById(id) || document.querySelector('[name="' + id + '"]');
            if (el) el.removeAttribute("required");
        });
    }
}

/**
 * Form Auto-Draft Persistence (localStorage)
 */
function saveFormDraft(form) {
    if (!form) return;
    const formData = {};
    const elements = form.querySelectorAll("input, select, textarea");

    elements.forEach(el => {
        const key = el.name || el.id;
        if (!key || el.type === "file" || el.type === "submit" || el.type === "button") return;

        if (el.type === "checkbox" || el.type === "radio") {
            if (el.checked) formData[key] = el.value;
        } else {
            formData[key] = el.value;
        }
    });

    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch (e) {
        console.warn("Could not save form draft to localStorage:", e);
    }
}

function restoreFormDraft(form) {
    if (!form) return;
    let saved = null;
    try {
        saved = localStorage.getItem(DRAFT_KEY);
    } catch (e) {
        console.warn("Could not read form draft from localStorage:", e);
        return;
    }

    if (!saved) return;

    try {
        const formData = JSON.parse(saved);
        Object.keys(formData).forEach(key => {
            const val = formData[key];
            const elements = form.querySelectorAll('[name="' + key + '"], #' + key);

            elements.forEach(el => {
                if (el.type === "checkbox" || el.type === "radio") {
                    el.checked = (el.value === val);
                } else if (el.type !== "file") {
                    el.value = val;
                }
            });
        });

        toggleTeamSection();
    } catch (e) {
        console.error("Failed to parse saved form draft:", e);
    }
}

function clearFormDraft() {
    try {
        localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
        console.warn("Could not clear form draft from localStorage:", e);
    }
}

/**
 * Optionally optimize high-res screenshot to ensure fast and reliable upload
 */
function prepareImageForUpload(file) {
    return new Promise((resolve) => {
        // If file is under 1.2MB, upload original directly
        if (file.size <= 1.2 * 1024 * 1024) {
            return resolve(file);
        }

        // 8-second safety timeout: fallback to original file if compression takes too long
        const timeoutId = setTimeout(() => {
            console.warn("Image optimization timed out, uploading original file.");
            resolve(file);
        }, 8000);

        const reader = new FileReader();
        reader.onerror = () => {
            clearTimeout(timeoutId);
            resolve(file);
        };
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => {
                clearTimeout(timeoutId);
                resolve(file);
            };
            img.onload = () => {
                const maxDim = 1600;
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    clearTimeout(timeoutId);
                    if (blob && blob.size < file.size) {
                        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        const optimizedFile = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
                        resolve(optimizedFile);
                    } else {
                        resolve(file);
                    }
                }, "image/jpeg", 0.85);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Upload screenshot to Supabase Storage bucket and return public URL
 */
async function uploadScreenshotToStorage(file, regId) {
    const bucket = (CONFIG.STORAGE_BUCKET || (typeof API_CONFIG !== "undefined" && API_CONFIG.STORAGE_BUCKET) || "payment-receipts").trim();

    // 1. Optimize image payload if necessary
    const uploadPayload = await prepareImageForUpload(file);
    const contentType = uploadPayload.type || file.type || "image/jpeg";

    // Determine clean file extension matched to payload MIME type
    let ext = "jpg";
    if (contentType === "image/png") {
        ext = "png";
    } else if (contentType === "image/jpeg" || contentType === "image/jpg") {
        ext = "jpg";
    } else {
        ext = file.name.split('.').pop().toLowerCase() || "jpg";
    }

    const filePath = `${regId}-${Date.now()}.${ext}`;
    const targetHost = (function() {
        try { return new URL(CONFIG.SUPABASE_URL).host; } catch (_) { return CONFIG.SUPABASE_URL; }
    })();

    console.log(`[Innovatia 2026 Storage] Uploading receipt: host="${targetHost}", bucket="${bucket}", path="${filePath}"`);

    const client = getSupabaseClient();
    let publicUrl = "";

    // Try Supabase JS client storage upload first
    if (client && client.storage) {
        const { error: uploadError } = await client.storage
            .from(bucket)
            .upload(filePath, uploadPayload, {
                cacheControl: "3600",
                upsert: false,
                contentType: contentType
            });

        if (uploadError) {
            console.error("[Innovatia 2026 Storage] SDK upload failed:", { targetHost, bucket, filePath, error: uploadError });
            throw new Error(uploadError.message || "Failed to upload screenshot to Supabase Storage.");
        }

        const { data: publicUrlData } = client.storage
            .from(bucket)
            .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
            publicUrl = publicUrlData.publicUrl;
        } else {
            publicUrl = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
        }
    } else {
        // Direct Supabase Storage REST API fallback
        const uploadUrl = `${CONFIG.SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
        const response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "apikey": CONFIG.SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                "Content-Type": contentType
            },
            body: uploadPayload
        });

        if (!response.ok) {
            let errJson = null;
            try { errJson = await response.json(); } catch (_) {}
            const errorMsg = (errJson && (errJson.message || errJson.error)) ||
                             `Storage upload failed with HTTP ${response.status} (${response.statusText})`;
            console.error("[Innovatia 2026 Storage] REST upload failed:", { targetHost, bucket, filePath, error: errJson || response.statusText });
            throw new Error(errorMsg);
        }

        publicUrl = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
    }

    // Strict assertion: Verify URL is a valid Supabase Storage HTTP(S) URL and NEVER Base64
    if (!publicUrl || !publicUrl.startsWith("http") || publicUrl.startsWith("data:")) {
        throw new Error("Invalid Supabase Storage URL generated. Could not obtain a valid public URL.");
    }

    return publicUrl;
}

/**
 * Direct Supabase record insertion (SDK client or REST API fallback)
 */
async function insertRegistrationToSupabase(record) {
    const client = getSupabaseClient();

    if (client) {
        const { data, error } = await client
            .from(CONFIG.TABLE_NAME)
            .insert([record])


        if (error) {
            throw new Error(error.message || error.details || "Database insertion failed.");
        }
        return data;
    }

    // Direct REST API Fallback
    const response = await fetch(CONFIG.REST_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": CONFIG.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
            "Prefer": "return=representation"
        },
        body: JSON.stringify(record)
    });

    if (!response.ok) {
        let errJson = null;
        try {
            errJson = await response.json();
        } catch (_) {}
        const errorMsg = (errJson && (errJson.message || errJson.error || errJson.details)) ||
                         `Server error (${response.status} ${response.statusText})`;
        throw new Error(errorMsg);
    }

    return await response.json();
}




// 2. DOM INITIALIZATION & SUBMIT HANDLER



document.addEventListener("DOMContentLoaded", function () {
    const regForm = document.getElementById("innovatiaForm") ||
                    document.getElementById("regForm") ||
                    document.getElementById("registrationForm") ||
                    document.querySelector("form");

    if (!regForm) {
        console.warn("Innovatia Registration: No form element found on page.");
        return;
    }

    restoreFormDraft(regForm);

    regForm.addEventListener("input", function () { saveFormDraft(regForm); });
    regForm.addEventListener("change", function () { saveFormDraft(regForm); });
    window.addEventListener("beforeunload", function () { saveFormDraft(regForm); });
    window.addEventListener("pagehide", function () { saveFormDraft(regForm); });

    const typeSelect = document.getElementById("registration_type") || document.querySelector('[name="registration_type"]');
    if (typeSelect) {
        typeSelect.addEventListener("change", function () {
            toggleTeamSection();
            saveFormDraft(regForm);
        });
        toggleTeamSection();
    }

    regForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        // Ensure .env variables have finished loading if promise is pending
        if (CONFIG.ready && typeof CONFIG.ready.then === "function") {
            try {
                        await CONFIG.ready;

        console.log('[Innovatia 2026 Config] STORAGE_BUCKET (CONFIG):', CONFIG.STORAGE_BUCKET);
        console.log('[Innovatia 2026 Config] STORAGE_BUCKET (derived):', (CONFIG.STORAGE_BUCKET || (typeof API_CONFIG !== "undefined" && API_CONFIG.STORAGE_BUCKET) || "payment-receipts").trim());
            } catch (_) {}
        }

        const submitBtn = document.getElementById("submitBtn") || regForm.querySelector('button[type="submit"]');
        const responseDiv = document.getElementById("responseMessage");

        // 1. Client file pre-validation
        const fileInput = document.getElementById("payment_screenshot") || regForm.querySelector('input[type="file"]');
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
            alert("Please upload your UPI payment screenshot receipt.");
            return;
        }

        const file = fileInput.files[0];
        const fileName = file.name.toLowerCase();
        const hasValidExt = ALLOWED_EXTS.some(ext => fileName.endsWith(ext));
        const hasValidType = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type === "";

        if (!hasValidExt && !hasValidType) {
            alert("Invalid file format. Please upload a PNG or JPG/JPEG screenshot.");
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            alert(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Please upload a screenshot smaller than ${MAX_FILE_SIZE_MB}MB.`);
            return;
        }

        // 2. Show loading status
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Uploading & Submitting... <i class="fas fa-spinner fa-spin"></i>';
        }

        try {
            const regId = generateRegistrationId();

            // 3. Upload screenshot file directly to Supabase Storage bucket
            let screenshotUrl = "";
            try {
                screenshotUrl = await uploadScreenshotToStorage(file, regId);
            } catch (storageErr) {
                console.error("Storage upload error:", storageErr);
                throw new Error(`Receipt screenshot upload failed: ${storageErr.message}\n\nPlease verify that the Supabase storage bucket '${CONFIG.STORAGE_BUCKET}' exists and allows public uploads.`);
            }

            // Hard security assertion: Guarantee screenshotUrl is strictly a valid HTTP/HTTPS storage URL and never Base64
            if (!screenshotUrl || !screenshotUrl.startsWith("http") || screenshotUrl.startsWith("data:")) {
                throw new Error("Invalid receipt screenshot URL. A valid Supabase Storage public URL is required.");
            }

            // 4. Construct record matching existing database schema
            const formData = new FormData(regForm);
            const regType = (formData.get("registration_type") || "single").toLowerCase();
            const isTeam = regType === "team";


            const record = {
                // Primary key will be auto‑generated (bigint)
                // Use the generated registration ID for our custom identifier
                registration_id: regId,

                // Map primary participant fields to top‑level columns
                full_name: (formData.get("m1_name") || "").trim(),
                email: (formData.get("m1_email") || "").trim(),
                phone: (formData.get("m1_whatsapp") || "").trim(),
                college: (formData.get("m1_college") || "").trim(),
                department: (formData.get("m1_department") || "").trim(),
                year_of_study: (formData.get("m1_year") || "").trim(),
                // Team name – use second member name if this is a team registration
                team_name: isTeam ? ((formData.get("m2_name") || "").trim() || null) : null,
                event_name: "Innovatia2026",
                // Payment fields
                payment_amount: null,
                transaction_id: (formData.get("upi_ref_id") || "").trim(),
                payment_screenshot_url: screenshotUrl,
                payment_status: "PENDING",
                expectations: (formData.get("expectations") || "").trim() || null,
                // Preserve the detailed per‑member columns that already exist in the table
                m1_name: (formData.get("m1_name") || "").trim(),
                m1_college: (formData.get("m1_college") || "").trim(),
                m1_department: (formData.get("m1_department") || "").trim(),
                m1_year: (formData.get("m1_year") || "").trim(),
                m1_email: (formData.get("m1_email") || "").trim(),
                m1_whatsapp: (formData.get("m1_whatsapp") || "").trim(),
                m1_alt_phone: (formData.get("m1_alt_phone") || "").trim() || null,
                m2_name: isTeam ? ((formData.get("m2_name") || "").trim() || null) : null,
                m2_college: isTeam ? ((formData.get("m2_college") || "").trim() || null) : null,
                m2_department: isTeam ? ((formData.get("m2_department") || "").trim() || null) : null,
                m2_year: isTeam ? ((formData.get("m2_year") || "").trim() || null) : null,
                m2_email: isTeam ? ((formData.get("m2_email") || "").trim() || null) : null,
                m2_whatsapp: isTeam ? ((formData.get("m2_whatsapp") || "").trim() || null) : null,
                m2_alt_phone: isTeam ? ((formData.get("m2_alt_phone") || "").trim() || null) : null,
                upi_ref_id: (formData.get("upi_ref_id") || "").trim(),
                suggestions_query: (formData.get("suggestions_query") || "").trim() || null
            };

            // 5. Direct Supabase insert
            await insertRegistrationToSupabase(record);

            // 6. Clear draft and display success confirmation UI
            clearFormDraft();

            regForm.style.display = "none";
            if (responseDiv) {
                responseDiv.className = "status-success";
                responseDiv.style.display = "block";
                
                responseDiv.innerHTML = `
                    <h3><i class="fas fa-check-circle"></i> Registration Received!</h3>
                    <p style="margin-top: 8px;">Your response has been logged successfully.</p>

                    <p style="margin-top: 12px; font-size: 1.1rem;">
                        <strong>Registration ID:</strong>
                        <span style="color: #2ecc71;">${regId}</span>
                    </p>

                    <p style="margin-top: 12px; color: #cdaa5a; font-size: 0.9rem; font-weight: 500;">
                        <i class="fas fa-info-circle"></i>
                        Please save your Registration ID for future reference and all event-related communication.
                    </p>

                    <p style="margin-top: 6px; color: var(--text-dim);">
                        <strong>Payment Status:</strong> Pending Verification
                    </p>

                    <p style="margin-top: 16px; font-size: 0.85rem; color: var(--text-muted);">
                        Organizers will cross-check your UPI transaction reference ID. You will receive confirmation once verified.
                    </p>
                `;
            }
        } catch (err) {
            console.error("Registration submission error:", err);
            // User-friendly error alert preserving form data in place
            alert("Submission error:\n" + (err.message || "Could not complete registration. Please try again."));
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Registration <i class="fas fa-paper-plane"></i>';
            }
        }
    });
});
