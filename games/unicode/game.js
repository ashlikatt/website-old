p5.disableFriendlyErrors = true;

const gameWidth = 400;
const gameHeight = 200;
const sidebarX = 320;
var renderScale;
var renderOffsetX;
var renderOffsetY;

var heldSymbolContext;

const symbols = new Symbols([
    new GameSymbol(sidebarX     / 5, gameHeight     / 5, "🔥"),
    new GameSymbol(sidebarX * 4 / 5, gameHeight     / 5, "🪨"),
    new GameSymbol(sidebarX     / 5, gameHeight * 4 / 5, "💧"),
    new GameSymbol(sidebarX * 4 / 5, gameHeight * 4 / 5, "💨")
]);

function setup() {
	createCanvas(windowWidth, windowHeight);
    updateScale();
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
    clear();
    updateScale();
}

function draw() {
    fill(0);
    noStroke();
    rect(0,0,windowWidth,windowHeight);

    push();
    translate(renderOffsetX, renderOffsetY);
    scale(renderScale, renderScale);

    renderBackdrop();
    renderSidebar();
    symbols.render();

    pop();

    if (currentSidebarScroll > targetSidebarScroll - 0.001 && currentSidebarScroll < targetSidebarScroll + 0.001) {
        currentSidebarScroll = targetSidebarScroll
    } else {
        currentSidebarScroll = currentSidebarScroll+(targetSidebarScroll-currentSidebarScroll)*0.05;
    }
}

function updateScale() {
    renderScale = Math.min(windowWidth / gameWidth, windowHeight / gameHeight);
    renderOffsetX = (windowWidth - gameWidth * renderScale) / 2;
    renderOffsetY = (windowHeight - gameHeight * renderScale) / 2;
}

function renderBackdrop() {
    fill(20);
    noStroke();
    rect(0,0,gameWidth,gameHeight);
    stroke(10);
    strokeWeight(3);
    line(sidebarX,0,sidebarX,gameHeight);
}

function gameMouseX() {
    return (mouseX - renderOffsetX) / renderScale;
}

function gameMouseY() {
    return (mouseY - renderOffsetY) / renderScale;
}

var targetSidebarScroll = 0;
var currentSidebarScroll = 0;

function renderSidebar() {
    const height = 16;
    const width = 14;
    const horizontalPadding = 5;
    const verticalPadding = 5;

    const ts = 8;

    const symbolsPerRow = Math.floor((gameWidth - sidebarX - horizontalPadding * 2) / width);
    const visibleRows = Math.floor((gameHeight - verticalPadding * 2) / height);

    const minRow = Math.max(0,Math.floor(currentSidebarScroll - 1));
    const maxRow = Math.floor(currentSidebarScroll + visibleRows + 1);

    stroke(0);
    strokeWeight(1);
    textSize(ts);
    textAlign(CENTER, CENTER);
    textFont('Courier New')
    fill("#FF0000");
    for (let row = minRow; row < maxRow; row++) {
        for (let column = 0; column < symbolsPerRow; column++) {
            const x = sidebarX + horizontalPadding + (column + 0.5) * width;
            const y = verticalPadding + (row - currentSidebarScroll + 0.5) * height;
            const index = row * symbolsPerRow + column;

            if (index > knownSymbols.length) {
                return;
            }

            text(knownSymbols[index], x, y);
        }
    }
}

function mouseWheel(e) {
    const width = 14;
    const horizontalPadding = 5;
    const symbolsPerRow = Math.floor((gameWidth - sidebarX - horizontalPadding * 2) / width);
    const maxScroll = Math.ceil(knownSymbols.length/symbolsPerRow) - 1;

    targetSidebarScroll += e.delta / 200;
    targetSidebarScroll = Math.max(Math.min(targetSidebarScroll, maxScroll), 0)
}

var mouseIsDown = false;

function mousePressed() {
    mouseIsDown = true;

    const mx = gameMouseX();

    if (mx > sidebarX) {
        const height = 16;
        const width = 14;
        const horizontalPadding = 5;
        const verticalPadding = 5;
    
        const symbolsPerRow = Math.floor((gameWidth - sidebarX - horizontalPadding * 2) / width);
        const visibleRows = Math.floor((gameHeight - verticalPadding * 2) / height);

        const left = sidebarX + horizontalPadding;
        const top = verticalPadding - (currentSidebarScroll * height);
        const right = sidebarX + horizontalPadding + symbolsPerRow * width;
        const bottom = (verticalPadding + visibleRows - currentSidebarScroll) * height;

        const mx = gameMouseX();
        const my = gameMouseY();

        if (mx >= left && mx <= right) {
            if (my >= top && my <= bottom) {
                const x = Math.floor((mx - left) / width);
                const y = Math.floor((my - top) / height);
                const index = (y) * symbolsPerRow + x;
                if (index >= 0 && index < knownSymbols.length) {
                    const symbol = new GameSymbol(0, 0, knownSymbols[index]);
                    symbols.add(symbol);
                    heldSymbolContext = {
                        id: symbol.id,
                        offsetX: 0,
                        offsetY: 0
                    }

                }
            }
        }

        //const x = sidebarX + horizontalPadding + (column + 0.5) * width;
        //const y = verticalPadding + (row - currentSidebarScroll + 0.5) * height;
    
        // TODO FINISH
    } else {
        const hovered = symbols.findLastIndexed(n => n.mouseIsOver())
        if (hovered) {
            const symbol = hovered.symbol;
            const index = hovered.index;
            symbols.prioritize(index);
            heldSymbolContext = {
                id: symbol.id,
                offsetX: mx - symbol.x,
                offsetY: gameMouseY() - symbol.y
            }
        }
    }

}

function mouseReleased() {
    mouseIsDown = false;

    if (heldSymbolContext) {
        const mx = gameMouseX();

        if (mx > sidebarX) {
            symbols.remove(heldSymbolContext.id);
        } else {
            const symbol = symbols.get(heldSymbolContext.id);
            symbol.moveTo(
                mx - heldSymbolContext.offsetX,
                gameMouseY() - heldSymbolContext.offsetY
            )
        }
        heldSymbolContext = undefined;
    }

}