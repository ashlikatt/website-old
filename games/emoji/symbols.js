class Symbols {
    constructor(list) {
        this.symbolMap = {};
        this.symbolList = [];
        if (list) {
            for (let n of list) {
                this.add(n);
            }
        }
    }

    add(symbol) {
        this.symbolList.push(symbol)
        this.symbolMap[symbol.getID()] = symbol;
    }

    get(uuid) {
        return this.symbolMap[uuid];  
    }

    remove(uuid) {
        const index = this.symbolList.indexOf(this.symbolMap[uuid]);
        this.symbolList.splice(index, 1);
        delete this.symbolMap[uuid];
    }

    render() {
        this.forEach(n => n.render());
    }

    tick() {
        this.forEach(n => n.tick());
    }

    forEach(f) {
        for (let sym of this.symbolList) {
            f(sym);
        }
    }

    findFirst(f) {
        for (let sym of this.symbolList) {
            if(f(sym)) return sym;
        }
        return undefined;
    }

    findLast(f) {
        for (let i = this.symbolList.length - 1; i >= 0; i--) {
            const sym = this.symbolList[i];
            if(f(sym)) return sym;
        }
        return undefined;
    }

    findLastIndexed(f) {
        for (let i = this.symbolList.length - 1; i >= 0; i--) {
            const sym = this.symbolList[i];
            if(f(sym)) return { symbol: sym, index: i };
        }
        return undefined;
    }

    poll(f, h) {
        for (let sym of this.symbolList) {
            if(f(sym)) {
                h(sym);
                return;
            }
        }
    }

    pollLast(f, h) {
        for (let i = this.symbolList.length - 1; i >= 0; i--) {
            const sym = this.symbolList[i];
            if(f(sym)) {
                h(sym);
                return;
            }
        }
    }

    prioritize(index) {
        const elem = this.symbolList.splice(index, 1);
        this.symbolList.push(...elem);
    }

}

class GameSymbol {
    static currentID = 0;
    static WIDTH = 18;
    static HEIGHT = 18;
    static HALF_WIDTH = GameSymbol.WIDTH / 2;
    static HALF_HEIGHT = GameSymbol.HEIGHT / 2;
    static SHOW_HITBOX = false;

    constructor(x, y, char) {
        this.char = char;
        this.id = GameSymbol.currentID++;
        this.x = x;
        this.y = y;
        this.image = twemoji.parse(this.char, {
            callback: (icon, options) => {
                console.log(icon);
            }
        })
    }

    render() {
        var x = this.x;
        var y = this.y;

        if (heldSymbolContext && this.id === heldSymbolContext.id) {
            x = gameMouseX() - heldSymbolContext.offsetX;
            y = gameMouseY() - heldSymbolContext.offsetY;
        }

        noStroke();
        textSize(15);
        textAlign(CENTER, CENTER);
        textFont('Courier New')
        fill("#000000");
        text(this.char, x, y);

        if (GameSymbol.SHOW_HITBOX) {
            stroke(255,0,0);
            noFill();
            stroke(2);
            rect(this.left, this.top, GameSymbol.WIDTH, GameSymbol.HEIGHT);
        }
    }

    tick() {

    }

    getID() {
        return this.id;
    }

    mouseIsOver() {
        const x = gameMouseX();
        const y = gameMouseY();
        return x > this.left && x < this.right && y > this.top && y < this.bottom;
    }

    moveTo(x, y) {
        this.x = Math.min(sidebarX - GameSymbol.HALF_WIDTH, Math.max(GameSymbol.HALF_WIDTH, x));
        this.y = Math.min(gameHeight - GameSymbol.HALF_HEIGHT, Math.max(GameSymbol.HALF_HEIGHT, y));

        symbols.poll(m => this !== m && this.overlapsWith(m) && this.canCombine(m), sym => {
            this.combine(sym);
        });
    }

    overlapsWith(other) {
        return this.right > other.left && this.left < other.right &&
                this.top < other.bottom && this.bottom > other.top;
    }

    canCombine(other) {
        return RecipeManager.result(this.char, other.char);
    }

    combine(other) {
        symbols.remove(this.id);
        symbols.remove(other.id);
        const result = RecipeManager.result(this.char, other.char);

        if (!knownSymbolsSet.has(result)) {
            knownSymbolsSet.add(result);
            knownSymbols.push(result);
        }

        symbols.add(new GameSymbol((this.x + other.x) / 2, (this.y + other.y) / 2, result)) 
    }

    get left() {
        return this.x - GameSymbol.HALF_WIDTH;
    }
    get right() {
        return this.x + GameSymbol.HALF_WIDTH;
    }
    get top() {
        return this.y - GameSymbol.HALF_HEIGHT;
    }
    get bottom() {
        return this.y + GameSymbol.HALF_HEIGHT;
    }
}