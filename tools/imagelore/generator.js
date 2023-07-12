// When the page loads...
addEventListener('load', function() {

    // When the selected file changes 
    document.getElementById('inputfile').addEventListener('change', inputChanged);

    // When the selected quality changes 
    document.getElementById('inputrange').addEventListener('change', inputChanged);

    inputChanged();
    invalidate();
});

var inputImage = undefined;
var imageBitmap = undefined;
var imageBitmapURL = undefined;
var tellraw = undefined;
var valid = false;

function inputChanged() {
    try {
        // Get file input
        const file = document.getElementById('inputfile').files[0];

        // Get quality input
        const quality = parseInt(document.getElementById('inputrange').value) - 1;
    
        // Validate input
        if (!(file instanceof File)) throw new Error("Input file is invalid - invalid data.");
        if (!file.type.startsWith("image")) throw new Error("Input file is invalid - not an image.");
        if (quality < 0 || quality > 99) throw new Error("Input quality is invalid - out of range.");

        inputImage = URL.createObjectURL(file);
        createImageBitmap(file).then(bitmap => {
            // Figure out size
            const scale = Math.min(100 / bitmap.width, 100 / bitmap.height)
            const targetWidth = interpInt(5, bitmap.width * scale, quality/100);
            const targetHeight = interpInt(5, bitmap.height * scale, quality/100);
            
            // Create canvas with size
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Draw image
            const context = canvas.getContext("2d");
            context.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

            // Save drawn image (Resized lmao)
            imageBitmap = context.getImageData(0, 0, targetWidth, targetHeight);
            imageBitmapURL = canvas.toDataURL();
            
            // Cleanup
            canvas.remove();
            updateOutput();
        });
    } catch (e) {
        invalidate();
        console.log(e);
    }
}

function updateOutput() {
    if (inputImage) {
        const img = new Image();
        img.src = inputImage;
        const display = document.getElementById("imageDisplay");
        display.innerHTML = "";
        display.appendChild(img);
    }

    if (imageBitmapURL) {
        const img = new Image();
        img.src = imageBitmapURL;
        img.id = "pixelImage";
        const display = document.getElementById("pixelDisplay");
        display.innerHTML = "";
        display.appendChild(img);
    }

    if (imageBitmap) {
        // Init
        const data = imageBitmap.data;
        let currentIndex = 0;
        const lines = [];

        // For every line
        for (let line = 0; line < imageBitmap.height; line++) {
            let lineData = [];
            
            // For every pixel in line
            for (let column = 0; column < imageBitmap.width; column++) {
                // Grab pixel data
                let r = data[currentIndex++];
                let g = data[currentIndex++];
                let b = data[currentIndex++];
                currentIndex++; // Skip alpha
                
                // Determine what to do
                let color = hex(r, g, b);
                if (lineData.length > 0 && lineData[lineData.length-1].color === color) { // Identical to last pixel, merge
                    lineData[lineData.length-1].count++;
                } else { // New pixel data
                    lineData.push({ 
                        first: lineData.length === 0,
                        color: color,
                        count: 1  
                    });
                }

            }
            lines.push("'[" + lineData.map(pixelDataToString).join(",") + "]'");
        }
        tellraw = "[" + lines.join(",") + "]";

        validate();
    } else {
        invalidate();
    }
}

function interpInt(min, max, percent) {
    return Math.round(((max-min)*percent)+min)
}

function hex(r, g, b) {
    return "#" + 
        r.toString(16).padStart(2, "0") +
        g.toString(16).padStart(2, "0") +
        b.toString(16).padStart(2, "0")
}

function invalidate() {
    valid = false;
    document.getElementById("recodeButton").classList.add("disabled");
    const copyButton = document.getElementById("copyButton");
    copyButton.classList.add("disabled");
    copyButton.classList.remove("warning");
}

function validate() {
    valid = true;
    document.getElementById("recodeButton").classList.remove("disabled");
    const copyButton = document.getElementById("copyButton");
    copyButton.classList.remove("disabled");
    if (tellraw.length + 31 > 32500) { // Too large for command block
        copyButton.classList.add("warning");
    } else {
        copyButton.classList.remove("warning");
    }
}

function copyButton() {
    if (!valid) return;
    const nbt = "{display:{Lore:" + tellraw + "}}"
    const command = "/give @p minecraft:stone" + nbt;
    navigator.clipboard.writeText(command);
}

function recodeButton() {
    if (!valid) return;
    const packet = `{"source":"Ashli's Site","type":"nbt","data":"{'id':'minecraft:stone','Count':1,tag:{display:{Lore:${tellraw.replaceAll('"', '\\"')}}}}"}`;
    const ws = new WebSocket("ws://localhost:31371");
    ws.addEventListener('open', _ => {
        ws.send(packet);
    })
}

function pixelDataToString(data) {
    if (data.first) {
        return `{"italic":false,"color":"${data.color}","text":"${"█".repeat(data.count)}"}`
    } else {
        return `{"color":"${data.color}","text":"${"█".repeat(data.count)}"}`
    }
}