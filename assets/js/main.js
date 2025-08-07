import { isPositiveInput } from "./helperfuncs.js";

// App State
let currentView = "input";
let currentMethod = "email";
let currentPhoto = null;
let setupData = {};
let readings = [];
let cameraStream = null;

// Initialize App
function initApp() {
  loadSavedData();
  setupEventListeners();
  checkNotification();
}

function loadSavedData() {
  const savedSetup = JSON.parse(localStorage.getItem("meterSetup") || "{}");
  const savedReadings = JSON.parse(
    localStorage.getItem("meterReadings") || "[]"
  );

  if (Object.keys(savedSetup).length === 0) {
    setupData = {
      ownerName: "John Smith",
      ownerEmail: "john.smith@email.com",
      ownerContact: "+27821234567",
      address:
        "123 Maple Street\nSpringfield Gardens\nJohannesburg, 2091\nGauteng, South Africa",
      municipalityName: "City of Johannesburg",
      accountNumber: "123456789",
      meterNumber: "WM-789456123",
      municipalityEmail: "water.services@joburg.gov.za",
      municipalityWhatsApp: "+27118779000",
      additionalEmail: "billing@joburg.gov.za",
      costPerKl: "32.84",
      cycleEndDate: "15",
      notificationMethod: "email",
    };
    localStorage.setItem("meterSetup", JSON.stringify(setupData));
  } else {
    setupData = savedSetup;
  }

  if (savedReadings.length === 0) {
    readings = [
      {
        id: 1,
        value: "15420",
        date: "2024-01-15",
        sentDate: "2024-01-15T10:30:00Z",
        method: "email",
      },
      {
        id: 2,
        value: "15438",
        date: "2024-02-15",
        sentDate: "2024-02-15T09:15:00Z",
        method: "whatsapp",
      },
      {
        id: 3,
        value: "15461",
        date: "2024-03-15",
        sentDate: "2024-03-15T11:45:00Z",
        method: "email",
      },
      {
        id: 4,
        value: "15475",
        date: "2024-04-15",
        sentDate: "2024-04-15T08:20:00Z",
        method: "email",
      },
      {
        id: 5,
        value: "15502",
        date: "2024-05-15",
        sentDate: "2024-05-15T14:10:00Z",
        method: "whatsapp",
      },
      {
        id: 6,
        value: "15529",
        date: "2024-06-15",
        sentDate: "2024-06-15T16:35:00Z",
        method: "both",
      },
    ];
    localStorage.setItem("meterReadings", JSON.stringify(readings));
  } else {
    readings = savedReadings;
  }

  loadSetupForm();
  loadHistory();
}

function setupEventListeners() {
  document
    .getElementById("current-reading")
    .addEventListener("input", calculateConsumption);

  // Handle modal clicks
  document
    .getElementById("preview-modal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeModal();
      }
    });
}

// Navigation
function showView(view) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document
    .querySelectorAll(".nav-tab")
    .forEach((t) => t.classList.remove("active"));

  document.getElementById(view + "-view").classList.add("active");

  // Find and activate the correct nav tab
  const navTabs = document.querySelectorAll(".nav-tab");
  navTabs.forEach((tab) => {
    const tabText = tab.querySelector("span").textContent.toLowerCase();
    if (tabText === view) {
      tab.classList.add("active");
    }
  });

  currentView = view;

  if (view === "history") {
    updateHistorySummary();
  }
}

function selectMethod(method) {
  currentMethod = method;

  document
    .querySelectorAll(".method-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(method + "-btn").classList.add("active");

  const sendBtn = document.getElementById("send-btn");
  if (method === "whatsapp") {
    sendBtn.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
            </svg>
            Send via WhatsApp
        `;
    sendBtn.className = "button button-success";
  } else if (method === "both") {
    sendBtn.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
            </svg>
            Send Both 📧💬
        `;
    sendBtn.className = "button button-warning";
  } else {
    sendBtn.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            Send via Email
        `;
    sendBtn.className = "button button-primary";
  }
}

// Camera permission request with user guidance
async function requestCameraAccess() {
  // First check if camera is supported
  const permissionCheck = await checkCameraPermissions();

  if (!permissionCheck.supported) {
    showError(
      "Camera not supported in this browser. Please use the Gallery option to select a photo."
    );
    return;
  }

  // Show loading message
  showSuccess("Checking camera permissions...");

  // If permission is already granted, start camera directly
  if (permissionCheck.permission === "granted") {
    startCamera();
    return;
  }

  // If permission is denied, guide user
  if (permissionCheck.permission === "denied") {
    showError(
      "Camera permission was previously denied. Please click the camera icon in your browser's address bar to allow camera access, then try again."
    );
    setTimeout(() => {
      showSuccess(
        "💡 Alternative: Use the Gallery button to select an existing photo of your meter."
      );
    }, 3000);
    return;
  }

  // For unknown permission state, try to access camera
  showSuccess(
    '🎥 Camera permission will be requested. Please click "Allow" when prompted.'
  );
  setTimeout(() => {
    startCamera();
  }, 1500);
}
async function startCamera() {
  try {
    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError(
        "Camera not supported in this browser. Please try the gallery option."
      );
      return;
    }

    // Stop any existing stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    showSuccess("Requesting camera permission...");

    // Try different camera configurations
    let constraints = {
      video: {
        facingMode: "environment", // Try back camera first
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
    };

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (backCameraError) {
      // If back camera fails, try front camera
      console.log("Back camera failed, trying front camera:", backCameraError);
      constraints.video.facingMode = "user";
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        showSuccess("Using front camera (back camera not available)");
      } catch (frontCameraError) {
        // If specific facing mode fails, try any camera
        console.log(
          "Front camera failed, trying any camera:",
          frontCameraError
        );
        constraints.video = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        };
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        showSuccess("Camera access granted!");
      }
    }

    const video = document.getElementById("camera-video");
    const cameraArea = document.getElementById("camera-area");
    const placeholder = document.getElementById("photo-placeholder");
    const photoPreview = document.getElementById("photo-preview");

    video.srcObject = cameraStream;

    // Wait for video to load
    video.onloadedmetadata = () => {
      video
        .play()
        .then(() => {
          // Show camera interface
          placeholder.style.display = "none";
          photoPreview.style.display = "none";
          cameraArea.style.display = "block";

          document.getElementById("photo-area").classList.add("capturing");

          showSuccess(
            "Camera ready! Position your meter in the frame and tap the red button to capture."
          );
        })
        .catch((playError) => {
          console.error("Video play error:", playError);
          showError(
            "Camera started but video playback failed. Try refreshing the page."
          );
        });
    };
  } catch (error) {
    console.error("Camera access error:", error);

    let errorMessage = "Unable to access camera. ";

    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      errorMessage +=
        "Camera permission was denied. Please allow camera access and try again, or use the gallery option.";
    } else if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      errorMessage +=
        "No camera found on this device. Please use the gallery option.";
    } else if (
      error.name === "NotReadableError" ||
      error.name === "TrackStartError"
    ) {
      errorMessage +=
        "Camera is being used by another app. Please close other camera apps and try again.";
    } else if (
      error.name === "OverconstrainedError" ||
      error.name === "ConstraintNotSatisfiedError"
    ) {
      errorMessage +=
        "Camera does not meet requirements. Please try the gallery option.";
    } else if (error.name === "NotSupportedError") {
      errorMessage +=
        "Camera not supported in this browser. Please try the gallery option.";
    } else if (error.name === "SecurityError") {
      errorMessage +=
        "Camera access blocked for security reasons. Please use HTTPS or try the gallery option.";
    } else {
      errorMessage += "Please check permissions or try the gallery option.";
    }

    showError(errorMessage);

    // Show help message for permissions
    setTimeout(() => {
      showSuccess(
        "💡 Tip: Look for a camera icon in your browser's address bar to allow camera permissions, or try using the Gallery option instead."
      );
    }, 3000);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  const cameraArea = document.getElementById("camera-area");
  const placeholder = document.getElementById("photo-placeholder");

  cameraArea.style.display = "none";
  placeholder.style.display = "block";

  document.getElementById("photo-area").classList.remove("capturing");
}

function capturePhoto() {
  const video = document.getElementById("camera-video");
  const canvas = document.createElement("canvas");

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  // Convert to data URL
  currentPhoto = canvas.toDataURL("image/jpeg", 0.8);

  // Stop camera and show photo
  stopCamera();
  showPhoto();
  showSuccess("Photo captured successfully!");
}

function selectFromGallery() {
  const fileInput = document.getElementById("file-input");
  fileInput.click();
}

async function checkCameraPermissions() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        message: "Camera not supported in this browser",
      };
    }

    // Check if we can get permission status
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({
        name: "camera",
      });
      return {
        supported: true,
        permission: permission.state,
        message: `Camera permission: ${permission.state}`,
      };
    }

    return {
      supported: true,
      message: "Camera supported, permission unknown",
    };
  } catch (error) {
    return {
      supported: false,
      message: "Cannot check camera permissions",
    };
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];

  if (!file) {
    return; // User cancelled selection
  }

  if (!file.type.startsWith("image/")) {
    showError("Please select a valid image file (JPG, PNG, etc.).");
    return;
  }

  // Check file size (limit to 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showError(
      "Image file is too large. Please select an image smaller than 10MB."
    );
    return;
  }

  showSuccess("Loading image...");

  const reader = new FileReader();
  reader.onload = function (e) {
    currentPhoto = e.target.result;
    showPhoto();
    showSuccess("Photo selected from gallery successfully!");
  };

  reader.onerror = function () {
    showError("Failed to read the selected image. Please try another image.");
  };

  reader.readAsDataURL(file);
}

function showPhoto() {
  const photoArea = document.getElementById("photo-area");
  const placeholder = document.getElementById("photo-placeholder");
  const preview = document.getElementById("photo-preview");
  const controls = document.getElementById("photo-controls");
  const cameraArea = document.getElementById("camera-area");

  photoArea.classList.remove("capturing");
  photoArea.classList.add("has-photo");
  placeholder.style.display = "none";
  cameraArea.style.display = "none";
  preview.src = currentPhoto;
  preview.style.display = "block";
  controls.style.display = "flex";

  calculateConsumption();
}

function retakePhoto() {
  startCamera();
}

function deletePhoto() {
  currentPhoto = null;
  const photoArea = document.getElementById("photo-area");
  const placeholder = document.getElementById("photo-placeholder");
  const preview = document.getElementById("photo-preview");
  const controls = document.getElementById("photo-controls");
  const cameraArea = document.getElementById("camera-area");

  photoArea.classList.remove("has-photo", "capturing");
  placeholder.style.display = "block";
  preview.style.display = "none";
  controls.style.display = "none";
  cameraArea.style.display = "none";

  document.getElementById("consumption-stats").style.display = "none";
  document.getElementById("file-input").value = "";

  // Stop camera if running
  if (cameraStream) {
    stopCamera();
  }
}

// Calculations
function calculateConsumption() {
  const currentReading = document.getElementById("current-reading");
  const currentReadingValue = parseFloat(currentReading.value);

  //Check for valid reading input
  if (!isPositiveInput(currentReadingValue)) {
    currentReading.style.borderColor = "2px solid red";
    currentReading.value = "";
    showError("Please enter a positive number for the reading.");
    currentReading.focus();
    return;
  }
  currentReading.style.borderColor = "";

  if (!currentReadingValue || readings.length === 0) return;

  const lastReading = readings[readings.length - 1];
  const usage = currentReadingValue - parseFloat(lastReading.value);
  const cost = usage * parseFloat(setupData.costPerKl || 0);

  let totalUsage = 0;
  for (let i = 1; i < readings.length; i++) {
    totalUsage +=
      parseFloat(readings[i].value) - parseFloat(readings[i - 1].value);
  }
  const average = readings.length > 1 ? totalUsage / (readings.length - 1) : 0;

  document.getElementById("usage-amount").textContent =
    usage.toFixed(2) + " kL";
  document.getElementById("estimated-cost").textContent = "R" + cost.toFixed(2);
  document.getElementById("running-average").textContent =
    average.toFixed(2) + " kL";
  document.getElementById("consumption-stats").style.display = "block";
}

// Message Generation
function generateEmailMessage(reading) {
  const addressLines = setupData.address.split("\n");
  const houseNumber = addressLines[0].split(" ")[0];
  const streetName = addressLines[0].replace(houseNumber, "").trim();
  const date = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `Subject: Water meter reading for ${houseNumber} ${streetName}

Dear ${setupData.municipalityName || "Municipal Water Services"},

Please find below the monthly water meter reading for the property located at:

${setupData.address}

ACCOUNT DETAILS:
Account Number: ${setupData.accountNumber || "Not provided"}
Meter Number: ${setupData.meterNumber || "Not provided"}

CURRENT METER READING: ${reading} kL
Reading taken on: ${date}

Note: This reading was submitted via our automated Municipal Water Meter Reading System.

For any queries regarding this submission, please contact the property owner:
${setupData.ownerName || "Property Owner"}
Email: ${setupData.ownerEmail || "Email not provided"}
Phone: ${setupData.ownerContact || "Phone not provided"}

Kind regards,
${setupData.ownerName || "Property Owner"}`;
}

function generateWhatsAppMessage(reading) {
  const addressLines = setupData.address.split("\n");
  const houseNumber = addressLines[0].split(" ")[0];
  const streetName = addressLines[0].replace(houseNumber, "").trim();
  const date = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `🏠 *Water Meter Reading*
${
  setupData.municipalityName || "Municipality"
} - Property: ${houseNumber} ${streetName}

📍 *Address:* ${setupData.address.replace(/\n/g, ", ")}

🔢 *Account #:* ${setupData.accountNumber || "Not provided"}
🏷️ *Meter #:* ${setupData.meterNumber || "Not provided"}

💧 *READING: ${reading} kL*
📅 *Date:* ${date}

👤 *Contact:* ${setupData.ownerName || "Property Owner"}
📧 *Email:* ${setupData.ownerEmail || "Not provided"}
📱 *Phone:* ${setupData.ownerContact || "Not provided"}

📸 *Meter Photo:* [Image attached]

✅ _Submitted via Municipal Water Reading App_`;
}

function generateEmailPreview(reading) {
  const addressLines = setupData.address.split("\n");
  const houseNumber = addressLines[0].split(" ")[0];
  const streetName = addressLines[0].replace(houseNumber, "").trim();
  const date = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
                        <div style="margin-bottom: 20px; padding: 16px; background: var(--gray-50); border-radius: 12px;">
            <div style="font-size: 14px; margin-bottom: 8px;"><strong>To:</strong> ${
              setupData.municipalityEmail
            }</div>
            ${
              setupData.additionalEmail
                ? `<div style="font-size: 14px; margin-bottom: 8px;"><strong>CC:</strong> ${setupData.additionalEmail}</div>`
                : ""
            }
            <div style="font-size: 14px;"><strong>Subject:</strong> Water meter reading for ${houseNumber} ${streetName}</div>
        </div>
        
        <div style="border: 2px solid var(--gray-200); border-radius: 16px; padding: 24px; background: white;">
            <p style="margin-bottom: 16px; font-size: 16px;">Dear ${
              setupData.municipalityName || "Municipal Water Services"
            },</p>
            <p style="margin-bottom: 24px; line-height: 1.6;">Please find below the monthly water meter reading for the property located at:</p>
            
            <div style="background: var(--gray-50); padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid var(--primary-color);">
                <div style="font-weight: 600; color: var(--primary-color); margin-bottom: 8px; font-size: 14px;">PROPERTY ADDRESS</div>
                <div style="white-space: pre-line; line-height: 1.5;">${
                  setupData.address
                }</div>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid var(--warning-color);">
                <div style="font-weight: 700; color: var(--warning-color); margin-bottom: 12px; font-size: 16px;">ACCOUNT DETAILS</div>
                <div style="margin-bottom: 8px;"><strong>Account Number:</strong> <span style="font-size: 18px; font-weight: 700; color: var(--gray-900);">${
                  setupData.accountNumber || "Not provided"
                }</span></div>
                <div><strong>Meter Number:</strong> <span style="font-size: 18px; font-weight: 700; color: var(--gray-900);">${
                  setupData.meterNumber || "Not provided"
                }</span></div>
            </div>
            
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center; border: 2px solid var(--success-color);">
                <div style="font-weight: 600; color: var(--success-color); margin-bottom: 8px; font-size: 14px;">CURRENT METER READING</div>
                <div style="font-size: 36px; font-weight: 700; color: var(--success-color);">${reading} kL</div>
                <div style="font-size: 14px; color: #059669; margin-top: 8px;">Reading taken on: ${date}</div>
            </div>
            
            <div style="background: var(--gray-50); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                <div style="font-weight: 600; color: var(--primary-color); margin-bottom: 12px; font-size: 14px;">METER PHOTOGRAPH</div>
                <img src="${currentPhoto}" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px; border: 1px solid var(--gray-200);">
            </div>
            
            <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid var(--gray-200); font-size: 14px; color: var(--gray-600); line-height: 1.6;">
                <p><strong>Note:</strong> This reading was submitted via our automated Municipal Water Meter Reading System.</p>
                <p style="margin-top: 12px;">For any queries regarding this submission, please contact the property owner:</p>
                <div style="margin-top: 8px; padding: 16px; background: var(--gray-50); border-radius: 8px; border-left: 3px solid var(--primary-color);">
                    <strong>${
                      setupData.ownerName || "Property Owner"
                    }</strong><br>
                    <span style="color: var(--primary-color);">📧 ${
                      setupData.ownerEmail || "Email not provided"
                    }</span><br>
                    <span style="color: var(--primary-color);">📱 ${
                      setupData.ownerContact || "Phone not provided"
                    }</span>
                </div>
                <p style="margin-top: 16px; color: var(--gray-700);">Kind regards,<br><strong>${
                  setupData.ownerName || "Property Owner"
                }</strong></p>
            </div>
        </div>
    `;
}

function generateWhatsAppPreview(reading) {
  const addressLines = setupData.address.split("\n");
  const houseNumber = addressLines[0].split(" ")[0];
  const streetName = addressLines[0].replace(houseNumber, "").trim();
  const date = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
        <div style="margin-bottom: 20px; padding: 16px; background: var(--gray-50); border-radius: 12px;">
            <div style="font-size: 14px; margin-bottom: 4px;"><strong>To:</strong> ${
              setupData.municipalityWhatsApp
            }</div>
            <div style="font-size: 12px; color: var(--gray-600);">WhatsApp Business Message</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #dcf8c6 0%, #c8e6c9 100%); border-left: 4px solid var(--success-color); padding: 20px; border-radius: 16px; font-family: 'SF Pro Text', -apple-system, sans-serif; font-size: 15px; line-height: 1.4; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="white-space: pre-line;">🏠 <strong>Water Meter Reading</strong>
${
  setupData.municipalityName || "Municipality"
} - Property: ${houseNumber} ${streetName}

📍 <strong>Address:</strong> ${setupData.address.replace(/\n/g, ", ")}

🔢 <strong>Account #:</strong> ${setupData.accountNumber || "Not provided"}
🏷️ <strong>Meter #:</strong> ${setupData.meterNumber || "Not provided"}

💧 <strong>READING: ${reading} kL</strong>
📅 <strong>Date:</strong> ${date}

👤 <strong>Contact:</strong> ${setupData.ownerName || "Property Owner"}
📧 <strong>Email:</strong> ${setupData.ownerEmail || "Not provided"}
📱 <strong>Phone:</strong> ${setupData.ownerContact || "Not provided"}

📸 <strong>Meter Photo:</strong> [Image attached below]

✅ <em>Submitted via Municipal Water Reading App</em></div>
        </div>
        
        <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 12px; border: 1px solid var(--gray-200);">
            <div style="font-size: 12px; color: var(--gray-600); margin-bottom: 8px; font-weight: 600;">📸 ATTACHED PHOTOGRAPH:</div>
            <img src="${currentPhoto}" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px; border: 1px solid var(--gray-200);">
            <div style="font-size: 11px; color: var(--gray-500); margin-top: 8px; text-align: center;">Image will be compressed for WhatsApp delivery</div>
        </div>
    `;
}

// Email and WhatsApp Functions
function sendEmail(reading) {
  const subject = encodeURIComponent(
    `Water meter reading for ${setupData.address.split("\n")[0]}`
  );
  const body = encodeURIComponent(generateEmailMessage(reading));

  const emailUrl = `mailto:${setupData.municipalityEmail}?subject=${subject}&body=${body}`;

  // For additional email CC
  if (setupData.additionalEmail) {
    const ccEmailUrl = `mailto:${setupData.additionalEmail}?cc=${setupData.municipalityEmail}&subject=${subject}&body=${body}`;
    window.open(ccEmailUrl, "_blank");
  } else {
    window.open(emailUrl, "_blank");
  }
}

function sendWhatsApp(reading) {
  const message = encodeURIComponent(generateWhatsAppMessage(reading));
  const whatsappUrl = `https://wa.me/${setupData.municipalityWhatsApp.replace(
    /[^0-9]/g,
    ""
  )}?text=${message}`;
  window.open(whatsappUrl, "_blank");
}

// Preview and Send Functions
function previewMessage() {
  const reading = document.getElementById("current-reading").value;
  if (!reading || !currentPhoto) {
    showError("Please enter a reading and capture a photo first!");
    return;
  }

  const modal = document.getElementById("preview-modal");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");

  if (currentMethod === "email") {
    title.innerHTML = "📧 Email Preview";
    body.innerHTML = generateEmailPreview(reading);
  } else if (currentMethod === "whatsapp") {
    title.innerHTML = "💬 WhatsApp Preview";
    body.innerHTML = generateWhatsAppPreview(reading);
  } else if (currentMethod === "both") {
    title.innerHTML = "📧💬 Both Messages Preview";
    body.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h4 style="color: var(--primary-color); margin-bottom: 15px; font-size: 18px;">📧 Email Message:</h4>
                ${generateEmailPreview(reading)}
            </div>
            <div style="border-top: 2px solid var(--gray-200); padding-top: 30px;">
                <h4 style="color: var(--success-color); margin-bottom: 15px; font-size: 18px;">💬 WhatsApp Message:</h4>
                ${generateWhatsAppPreview(reading)}
            </div>
        `;
  }

  modal.classList.add("active");
}

function sendReading() {
  const reading = document.getElementById("current-reading").value;

  if (!reading || !currentPhoto) {
    showError("Please enter a reading and capture a photo!");
    return;
  }

  if (readings.length > 0) {
    const lastReading = readings[readings.length - 1];
    if (parseFloat(reading) <= parseFloat(lastReading.value)) {
      showError("Current reading must be higher than the previous reading!");
      return;
    }
  }

  // Validate setup data
  if (!setupData.municipalityEmail && !setupData.municipalityWhatsApp) {
    showError("Please configure municipality contact details in Setup first!");
    return;
  }

  if (currentMethod === "email" && !setupData.municipalityEmail) {
    showError("Please configure municipality email in Setup first!");
    return;
  }

  if (currentMethod === "whatsapp" && !setupData.municipalityWhatsApp) {
    showError("Please configure municipality WhatsApp in Setup first!");
    return;
  }

  // Show loading state
  const sendBtn = document.getElementById("send-btn");
  const originalHTML = sendBtn.innerHTML;
  sendBtn.innerHTML =
    '<div class="loading"><div class="spinner"></div>Sending...</div>';
  sendBtn.disabled = true;

  setTimeout(() => {
    try {
      // Send the message(s)
      if (currentMethod === "email") {
        sendEmail(reading);
      } else if (currentMethod === "whatsapp") {
        sendWhatsApp(reading);
      } else if (currentMethod === "both") {
        sendEmail(reading);
        setTimeout(() => sendWhatsApp(reading), 1000); // Delay WhatsApp slightly
      }

      // Record the reading
      const currentDate = new Date().toISOString().split("T")[0];
      const newReading = {
        id: Date.now(),
        value: reading,
        date: currentDate,
        sentDate: new Date().toISOString(),
        method: currentMethod,
        status: "sent",
        photo: currentPhoto,
      };

      readings.push(newReading);
      localStorage.setItem("meterReadings", JSON.stringify(readings));

      let successMessage = "";
      if (currentMethod === "both") {
        successMessage =
          "Reading apps opened for both Email and WhatsApp! Complete the sending process in each app.";
      } else if (currentMethod === "email") {
        successMessage =
          "Email app opened! Complete the sending process in your email app.";
      } else {
        successMessage =
          "WhatsApp opened! Complete the sending process in WhatsApp.";
      }

      showSuccess(successMessage);

      // Reset form
      document.getElementById("current-reading").value = "";
      deletePhoto();

      // Reload history
      loadHistory();
      updateHistorySummary();
    } catch (error) {
      console.error("Send error:", error);
      showError(
        "Failed to open messaging app. Please check your setup configuration."
      );
    }

    // Restore button state
    sendBtn.innerHTML = originalHTML;
    sendBtn.disabled = false;
  }, 2000);
}

// Setup Functions
function saveSetup() {
  const newSetupData = {
    ownerName: document.getElementById("owner-name").value,
    ownerEmail: document.getElementById("owner-email").value,
    ownerContact: document.getElementById("owner-contact").value,
    address: document.getElementById("house-address").value,
    municipalityName: document.getElementById("municipality-name").value,
    accountNumber: document.getElementById("account-number").value,
    meterNumber: document.getElementById("meter-number").value,
    municipalityEmail: document.getElementById("municipality-email").value,
    municipalityWhatsApp: document.getElementById("municipality-whatsapp")
      .value,
    additionalEmail: document.getElementById("additional-email").value,
    costPerKl: document.getElementById("cost-per-kl").value,
    cycleEndDate: document.getElementById("cycle-end-date").value,
    notificationMethod: document.getElementById("notification-method").value,
  };

  // Validate required fields
  if (
    !newSetupData.ownerName ||
    !newSetupData.address ||
    (!newSetupData.municipalityEmail && !newSetupData.municipalityWhatsApp)
  ) {
    showError(
      "Please fill in your name, address and at least one municipality contact method."
    );
    return;
  }

  setupData = newSetupData;
  localStorage.setItem("meterSetup", JSON.stringify(setupData));

  showSuccess("Configuration saved successfully!");
  setTimeout(() => showView("input"), 1500);
}

function loadSetupForm() {
  document.getElementById("owner-name").value = setupData.ownerName || "";
  document.getElementById("owner-email").value = setupData.ownerEmail || "";
  document.getElementById("owner-contact").value = setupData.ownerContact || "";
  document.getElementById("house-address").value = setupData.address || "";
  document.getElementById("municipality-name").value =
    setupData.municipalityName || "";
  document.getElementById("account-number").value =
    setupData.accountNumber || "";
  document.getElementById("meter-number").value = setupData.meterNumber || "";
  document.getElementById("municipality-email").value =
    setupData.municipalityEmail || "";
  document.getElementById("municipality-whatsapp").value =
    setupData.municipalityWhatsApp || "";
  document.getElementById("additional-email").value =
    setupData.additionalEmail || "";
  document.getElementById("cost-per-kl").value = setupData.costPerKl || "";
  document.getElementById("cycle-end-date").value =
    setupData.cycleEndDate || "";
  document.getElementById("notification-method").value =
    setupData.notificationMethod || "email";
}

// History Functions
function loadHistory() {
  const historyList = document.getElementById("history-list");

  if (readings.length === 0) {
    historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">No readings recorded yet</div>
            </div>
        `;
    return;
  }

  let html = "";
  const sortedReadings = [...readings].reverse();

  sortedReadings.forEach((reading, index) => {
    const reversedIndex = readings.length - 1 - index;
    let usageHtml = "";

    if (reversedIndex > 0) {
      const usage =
        parseFloat(reading.value) -
        parseFloat(readings[reversedIndex - 1].value);
      const cost = usage * parseFloat(setupData.costPerKl || 0);
      usageHtml = `
                <div class="reading-details">
                    <span><strong>Usage:</strong> ${usage.toFixed(2)} kL</span>
                    <span style="margin-left: 20px;"><strong>Cost:</strong> R${cost.toFixed(
                      2
                    )}</span>
                </div>
            `;
    }

    const methodIcon =
      reading.method === "email"
        ? "📧"
        : reading.method === "whatsapp"
        ? "💬"
        : "📧💬";
    const methodText =
      reading.method === "email"
        ? "Email"
        : reading.method === "whatsapp"
        ? "WhatsApp"
        : "Both";
    const statusColor =
      reading.status === "sent"
        ? "var(--success-color)"
        : "var(--warning-color)";

    html += `
            <div class="reading-card">
                <div class="reading-header">
                    <div class="reading-value">${reading.value} kL</div>
                    <div class="reading-date">${new Date(
                      reading.date
                    ).toLocaleDateString("en-ZA")}</div>
                </div>
                ${usageHtml}
                <div class="reading-meta">
                    <span style="color: ${statusColor};">✓ Sent ${new Date(
      reading.sentDate
    ).toLocaleDateString()}</span>
                    <span>${methodIcon} ${methodText}</span>
                    <span>${new Date(reading.sentDate).toLocaleTimeString(
                      "en-ZA",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}</span>
                </div>
            </div>
        `;
  });

  historyList.innerHTML = html;
}

function updateHistorySummary() {
  if (readings.length === 0) {
    document.getElementById("history-summary").style.display = "none";
    return;
  }

  let totalUsage = 0;
  for (let i = 1; i < readings.length; i++) {
    totalUsage +=
      parseFloat(readings[i].value) - parseFloat(readings[i - 1].value);
  }

  const averageUsage =
    readings.length > 1 ? totalUsage / (readings.length - 1) : 0;

  document.getElementById("total-readings").textContent = readings.length;
  document.getElementById("average-usage").textContent =
    averageUsage.toFixed(2) + " kL";
  document.getElementById("total-usage").textContent =
    totalUsage.toFixed(2) + " kL";
  document.getElementById("history-summary").style.display = "block";
}

// Notification Functions
function checkNotification() {
  if (!setupData.cycleEndDate) return;

  const today = new Date();
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    parseInt(setupData.cycleEndDate)
  );

  if (endDate < today) {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  const timeDiff = endDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (daysDiff <= 2 && daysDiff >= 0) {
    document.getElementById("notification").style.display = "block";
  }
}

// Utility Functions
function closeModal() {
  document.getElementById("preview-modal").classList.remove("active");
}

function showSuccess(message) {
  const existingMessage = document.querySelector(".success-message");
  if (existingMessage) existingMessage.remove();

  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.innerHTML = `
        <span class="success-icon">✅</span>
        <span>${message}</span>
    `;

  document.querySelector(".content").prepend(successDiv);

  setTimeout(() => {
    successDiv.remove();
  }, 5000);
}

function showError(message) {
  const existingMessage = document.querySelector(".error-message");
  if (existingMessage) existingMessage.remove();

  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `
        <span class="error-icon">❌</span>
        <span>${message}</span>
    `;

  document.querySelector(".content").prepend(errorDiv);

  setTimeout(() => {
    errorDiv.remove();
  }, 7000);
}

// Cleanup camera on page unload
window.addEventListener("beforeunload", function () {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
});

// Initialize app when page loads
document.addEventListener("DOMContentLoaded", initApp);

//Export functions for use in HTML, find more compact way to do this later
window.showView = showView;
window.previewMessage = previewMessage;
window.requestCameraAccess = requestCameraAccess;
window.capturePhoto = capturePhoto;
window.closeModal = closeModal;
