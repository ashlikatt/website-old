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
        const data = imageBitmap.data;
        let currentIndex = 0;
        const lines = [];
        for (let line = 0; line < imageBitmap.height; line++) {
            let lineData = [];
            for (let column = 0; column < imageBitmap.width; column++) {
                let r = data[currentIndex++];
                let g = data[currentIndex++];
                let b = data[currentIndex++];
                currentIndex++;
                if (lineData.length === 0) {
                    lineData.push('{"italic":false,"color":"' + hex(r, g, b) + '","text":"█"}');
                } else {
                    lineData.push('{"color":"' + hex(r, g, b) + '","text":"█"}');
                }
            }
            lines.push("'[" + lineData.join(",") + "]'");
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
    document.getElementById("copyButton").classList.add("disabled");
}

function validate() {
    valid = true;
    document.getElementById("recodeButton").classList.remove("disabled");
    document.getElementById("copyButton").classList.remove("disabled");
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
    ws.addEventListener('open', e => {
        ws.send(packet);
    })
}