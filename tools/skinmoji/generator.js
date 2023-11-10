/**
 * Stores a segment of a skin. Includes information about where it is on the skin's texture file and where to place it on the output.
 */
class SkinSegment {
    constructor(x = 0, y = 0, w = 0, h = 0, ox = 0, oy = 0, ow = 0, oh = 0, grow = 0) {
        this.width = w;
        this.height = h;
        this.x = x;
        this.y = y;

        this.outputWidth = ow;
        this.outputHeight = oh;
        this.outputX = ox;
        this.outputY = oy;

        this.grow = grow; // Makes it grow
    }
}

const PLAYER_PIXEL_WIDTH = 4 + 8 + 4; // Arms + Body
const PLAYER_PIXEL_HEIGHT = 8 + 12 + 12; // Head + Body + Legs

const PIXEL_PADDING = 4; // +4 pixels on each side
const SCALE_FACTOR = 25; // x25 the whole image

const OVERLAY_GROW_FACTOR = 1.125

const OUTPUT_WIDTH = (PLAYER_PIXEL_WIDTH + PIXEL_PADDING * 2) * SCALE_FACTOR;
const OUTPUT_HEIGHT = (PLAYER_PIXEL_HEIGHT + PIXEL_PADDING * 2) * SCALE_FACTOR;

const THIN = [
    // Main
    new SkinSegment( 8,  8,  8,  8,    4,  0,  8,  8), // Head
    new SkinSegment(20, 20,  8, 12,    4,  8,  8, 12), // Body
    new SkinSegment(36, 52,  3, 12,   12,  8,  3, 12), // Left Arm
    new SkinSegment(44, 20,  3, 12,    1,  8,  3, 12), // Right Arm
    new SkinSegment(20, 52,  4, 12,    8, 20,  4, 12), // Left Leg
    new SkinSegment( 4, 20,  4, 12,    4, 20,  4, 12), // Right Leg

    // Overlay
    new SkinSegment(20, 36,  8, 12,    4,  8,  8, 12, 0.25), // Body
    new SkinSegment(52, 52,  3, 12,   12,  8,  3, 12, 0.25), // Left Arm
    new SkinSegment(44, 36,  3, 12,    1,  8,  3, 12, 0.25), // Right Arm
    new SkinSegment( 4, 52,  4, 12,    8, 20,  4, 12, 0.25), // Left Leg
    new SkinSegment( 4, 36,  4, 12,    4, 20,  4, 12, 0.25), // Right Leg
    new SkinSegment(40,  8,  8,  8,    4,  0,  8,  8,  0.5), // Head (Priority)
];

const WIDE = [
    // Main
    new SkinSegment( 8,  8,  8,  8,    4,  0,  8,  8), // Head
    new SkinSegment(20, 20,  8, 12,    4,  8,  8, 12), // Body
    new SkinSegment(36, 52,  4, 12,   12,  8,  4, 12), // Left Arm
    new SkinSegment(44, 20,  4, 12,    0,  8,  4, 12), // Right Arm
    new SkinSegment(20, 52,  4, 12,    8, 20,  4, 12), // Left Leg
    new SkinSegment( 4, 20,  4, 12,    4, 20,  4, 12),  // Right Leg

    // Overlay
    new SkinSegment(20, 36,  8, 12,    4,  8,  8, 12, 0.25), // Body
    new SkinSegment(52, 52,  4, 12,   12,  8,  4, 12, 0.25), // Left Arm
    new SkinSegment(44, 36,  4, 12,    0,  8,  4, 12, 0.25), // Right Arm
    new SkinSegment( 4, 52,  4, 12,    8, 20,  4, 12, 0.25), // Left Leg
    new SkinSegment( 4, 36,  4, 12,    4, 20,  4, 12, 0.25), // Right Leg
    new SkinSegment(40,  8,  8,  8,    4,  0,  8,  8,  0.5), // Head (Priority)
];

/**
 * Generate the skin
 */
async function generateButton() {
    try {
        const file = document.getElementById('inputfile').files[0];
        const selectedType = document.querySelector('input[name="skin_type"]:checked')?.value;
        const segments = selectedType === "Slim" ? THIN : WIDE;
        const display = document.getElementById("pixelDisplay");

        if (!display) return;

        // Validate input
        if (!(file instanceof File)) throw new Error("Input file is invalid - Invalid data.");
        if (!file.type.startsWith("image")) throw new Error("Input file is invalid - Not an image.");

        // Validate
        {
            let bitmap = await createImageBitmap(file);
            if (bitmap.width != 64 || bitmap.height != 64) throw new Error("Input file is invalid - Must be 64x64.");
        }

        // Create canvas with size
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_WIDTH;
        canvas.height = OUTPUT_HEIGHT;

        // Draw segments onto canvas
        const context = canvas.getContext("2d");
        context.imageSmoothingEnabled = false;

        for (let segment of segments) {
            let subImage = await createImageBitmap(file, segment.x, segment.y, segment.width, segment.height);

            const grow = segment.grow;

            const drawX = (segment.outputX + PIXEL_PADDING - grow/2) * SCALE_FACTOR;
            const drawY = (segment.outputY + PIXEL_PADDING - grow/2) * SCALE_FACTOR;
            const drawWidth = (segment.outputWidth + grow) * SCALE_FACTOR;
            const drawHeight = (segment.outputHeight + grow) * SCALE_FACTOR;

            
            context.drawImage(subImage, drawX, drawY, drawWidth, drawHeight);

        }




        const img = new Image();
        img.src = canvas.toDataURL();
        img.id = "pixelImage";
        display.innerHTML = "";
        display.appendChild(img);
        
    } catch(e) {
        console.log(e);
    }
}
