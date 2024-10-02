const qrText = document.getElementById('qr-text');
const sizes = document.getElementById('sizes');
const colorPicker = document.getElementById('color');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const qrContainer = document.querySelector('.qr-body');
const urlDisplay = document.getElementById('url-display'); // New: display URL or image link

let size = sizes.value;
let color = colorPicker.value;

generateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isEmptyInput();
});

sizes.addEventListener('change', (e) => {
    size = e.target.value;
    isEmptyInput();
});

colorPicker.addEventListener('change', (e) => {
    color = e.target.value;
    isEmptyInput();
});

downloadBtn.addEventListener('click', () => {
    let img = document.querySelector('.qr-body img');

    if (img !== null) {
        let imgAtrr = img.getAttribute('src');
        downloadBtn.setAttribute("href", imgAtrr);
    } else {
        downloadBtn.setAttribute("href", `${document.querySelector('canvas').toDataURL()}`);
    }
});

function isEmptyInput() {
    if (qrText.value.length > 0) {
        generateQRCode();
    } else {
        alert("Enter the text or URL to generate your QR code");
    }
}

function generateQRCode() {
    // Clear previous QR code
    qrContainer.innerHTML = "";
    urlDisplay.textContent = ""; // Clear previous URL display

    try {
        // Generate QR code
        new QRCode(qrContainer, {
            text: qrText.value,
            height: size,
            width: size,
            colorLight: "#ffffff", // QR code background color
            colorDark: color,  // QR code color
        });

        // Display the URL or image link entered by the user
        urlDisplay.textContent = `QR Code for: ${qrText.value}`;
        urlDisplay.style.display = 'block'; // Show the URL

    } catch (error) {
        alert("An error occurred while generating the QR code. Please try again.");
        console.error("QR Code Generation Error: ", error);
    }
}
