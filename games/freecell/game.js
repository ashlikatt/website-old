function setup() {
	let canvas = createCanvas(min(windowWidth,windowHeight), min(windowWidth,windowHeight));
	canvas.position(
		(windowWidth - width) / 2, 
		(windowHeight - height) / 2
	);
	background(50);
	
	cardSize = width / 13;
	cardSizeX = cardSize;
	cardSizeY = cardSize * 1.5;
	initTypes();
	
	initGame();
}

function draw() {
	background(50);
	Space.renderAll();
}

class Card {
	constructor(type, d=false) {
		this.type=type;
		this.down = d;
	}
	flip() {
		this.down = !this.down;
	}
	render(pos) {
		if (this.down) {
			cardBack.render(pos);
		} else {
			this.type.render(pos);
		}
	}
}

class Deck {
	constructor() {
		this.deck = [];
		this.locked = false;
	}
	validClick(dp, cp) {
		let s = 2*this.deck.length/3;
		return cp.x>=dp.x && cp.x<=dp.x+cardSizeX && cp.y>=dp.y-s && cp.y<=dp.y+cardSizeY;
	}
	get empty() {
		return this.deck.length==0;
	}
	render(pos) {
		let top = this.topCard();
		if (top != undefined) {
			let s = 2*this.deck.length/3;
			fill(0);
			stroke(0);
			rect(pos.x,pos.y - s,cardSizeX,cardSizeY + s);
			top.render(pos.shift(0,-s));
		}
	}
	flip() {
		let a = [];
		for (let c of this.deck) {
			a.unshift(c);
			c.flip();
		}
		this.deck = a;
		return this;
	}
	add(c) {
		let l = [c];
		if (c instanceof Array) l = c;
		if (c instanceof Deck) l = c.deck;
		this.deck.push(... l);
	}
	bottomCard() {
		if (this.deck.length==0) return undefined;
		return this.deck[0];
	}
	topCard() {
		if (this.deck.length==0) return undefined;
		return this.deck[this.deck.length-1];
	}
	grabCard() {
		if (this.deck.length==0) return undefined;
		return this.deck.pop();
	}
	static standardDeck() {
		let d = new Deck();
		for (let t in typeList) {
			d.add(new Card(typeList[t], true));
		}
		return d;
	}
	shuffle() {
		let newOrder = [];
		while (this.deck.length>0) {
			let index = rand(this.deck.length);
			newOrder.push(... this.deck.splice(index,1));
		}
		this.deck = newOrder;
		return this;
	}
}

class Spread extends Deck {
	render(pos) {
		let i = 0;
		for (let d of this.deck) {
			d.render(pos.shift(0,i*cardSizeY*0.25));
			i++;
		}
	}
	validClick(dp, cp) {
		let s = (this.deck.length-1)*0.25*cardSizeY;
		return cp.x>=dp.x && cp.x<=dp.x+cardSizeX && cp.y>=dp.y && cp.y<=dp.y+cardSizeY+s;
	}
	clickedIndex(dp, cp) {
		let s = (this.deck.length-1)*0.25*cardSizeY;
		if (cp.x>=dp.x && cp.x<=dp.x+cardSizeX) {
			if (cp.y>=dp.y+s && cp.y<=dp.y+s+cardSizeY) {
				return this.deck.length-1;
			} else {
				let l = this.deck.length-1;
				let c = floor((cp.y - dp.y)/(0.25*cardSizeY))
				return c;
			}
		}
	}
}

class CardType {
	constructor(name,render,d) {
		this.name=name;
		this.renderFunc = render;
		this.data = d;
	}
	render(pos) {
		this.renderFunc(pos);
	}
}

var cardBack = new CardType("NONE", (pos) => {
	fill(100,0,0);
	stroke(0);
	rect(pos.x,pos.y,cardSize,cardSize*1.5);
});
var typeList = {};
var cardSize = 30;
var cardSizeX;
var cardSizeY;

function initTypes() {
	let suits = [
		{name:"SPADES", symbol: (p, s=1) => { fill(0); ellipse(p.x,p.y,s*cardSize/8,s*cardSize/8); }},
		{name:"HEARTS", symbol: (p, s=1) => { fill(255,0,0); ellipse(p.x,p.y,s*cardSize/8,s*cardSize/8); }},
		{name:"CLUBS", symbol: (p, s=1) => { fill(0); rect(p.x - (s*cardSize/15),p.y - (s*cardSize/15), (2*s*cardSize/15), (2*s*cardSize/15)); }},
		{name:"DIAMONDS", symbol: (p, s=1) => { fill(255,0,0); rect(p.x - (s*cardSize/15),p.y - (s*cardSize/15), (2*s*cardSize/15), (2*s*cardSize/15));}}
	];
	let nums = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
	for (let suit of suits) {
		let i = 0;
		for (let num of nums) {
			i++;
			let name = suit.name + "_" + num;
			typeList[name] = new CardType(name, (pos) => {
				fill(255);
				stroke(0);
				rect(pos.x,pos.y,cardSize,cardSize*1.5); // Card
				// Suit Symbols:
				noStroke();
				suit.symbol(pos.shift(cardSize/6,cardSize/6), 1.5);
				suit.symbol(pos.shift(cardSizeX,cardSizeY).shift(-cardSize/6,-cardSize/6), 1.5);
				textSize(cardSize/3);
				textAlign(CENTER);
				let textPos = pos.shift(cardSizeX/2,cardSizeY/2 + cardSize/6);
				text(num, textPos.x, textPos.y);
				// Corner nums
				textSize(cardSize/4);
				textPos = pos.shift(cardSizeX*0.95, cardSizeY*0.2);
				textAlign(RIGHT);
				text(num, textPos.x, textPos.y);
				textPos = pos.shift(cardSizeX*0.05, cardSizeY*0.95);
				textAlign(LEFT);
				text(num, textPos.x, textPos.y);
			}, {
				suit: suit,
				type: num,
				isRed: suit.name=="HEARTS" || suit.name=="DIAMONDS",
				nextType: (nums[i]==undefined) ? undefined : suit.name + "_" + nums[i],
				nextNum: (nums[i]==undefined) ? undefined : nums[i]
			});
		}
	}
}

// Immutable
class Point {
	constructor(x,y) {
		this.x=x;
		this.y=y;
	}
	shift(x,y) {
		return new Point(this.x + x,this.y + y);
	}
	static mouse() {
		return new Point(mouseX,mouseY);
	}
}

var spaces = {};

class Space {
	constructor(n,p,s=undefined,c=undefined,h=false) {
		this.name = n;
		this.pos=p;
		this.storage = s;
		this.onClick = c;
		this.hidden = h;
	}
	getPos() {
		if (this.pos instanceof Function) return this.pos(); 
		return this.pos;
	}
	render() {
		let marginX = cardSizeX/10;
		let marginY = cardSizeY/10;
		if (!this.hidden) {
			fill(100);
			stroke(200);
			rect(this.getPos().x-marginX,this.getPos().y-marginY,cardSizeX+2*marginX,cardSizeY+2*marginY);
		}
		if (this.storage != undefined) this.storage.render(this.getPos());
	}
	attemptClick(p) {
		let marginX = cardSizeX/10;
		let marginY = cardSizeY/10;
		let mainClicked = p.x >= this.getPos().x-marginX && p.x <= this.getPos().x+cardSizeX+marginX && p.y>=this.getPos().y-marginY && p.y<=this.getPos().y+cardSizeY+marginY;
		if (mainClicked || (this.getSlot()!=undefined && this.getSlot().validClick(this.getPos(), Point.mouse()))) {
			if (this.onClick != undefined) {
				this.onClick(this);
			}
		}
		//rect(this.pos.x-marginX,this.pos.y-marginY,cardSizeX+2*marginX,cardSizeY+2*marginY);
	}
	static addSpace(n, ... params) {
		spaces[n] = new Space(n, ... params);
		return spaces[n];
	}
	static renderAll() {
		for (let s in spaces) {
			spaces[s].render();
		}
	}
	static get(n) {
		return spaces[n];
	}
	getSlot() {
		return this.storage;
	}
	setSlot(n) {
		this.storage = n;
	}
}

function mousePressed() {
	for (let sp in spaces) {
		spaces[sp].attemptClick(Point.mouse());
	}
}

function rand(a) {
	return floor(random(a));
}

var canReturnToStack = false;

// All data relevant to the current game
function initGame() {
	let sd = Deck.standardDeck().flip().shuffle();
	
	let sc = t => {
		let held = Space.get("held");
		let heldCard = held.getSlot();
		if (heldCard.empty) {
			let c = t.getSlot().clickedIndex(t.getPos(), Point.mouse());
			let l = t.getSlot().deck.length;
			if (c!=undefined && !t.getSlot().empty && (l-c)-2<getFreeCells()) {
				for (let i = c; i<l-1; i++) {
					if (t.getSlot().deck[i].type.data.isRed == t.getSlot().deck[i+1].type.data.isRed) return;
					if (t.getSlot().deck[i+1].type.data.nextNum != t.getSlot().deck[i].type.data.type) return;
				}
				held.getSlot().add(t.getSlot().deck.splice(c));
				canReturnToStack = t.name;
			}
		} else {
			let heldData = held.getSlot().bottomCard().type.data;
			let stackData;
			if (!t.getSlot().empty) stackData = t.getSlot().topCard().type.data;
			if ((t.getSlot().empty) || (!t.getSlot().empty && heldData.isRed != stackData.isRed && heldData.nextNum==stackData.type) || t.name==canReturnToStack) {
				t.getSlot().add(held.getSlot());
				held.setSlot(new Spread());
				canReturnToStack = false;
			}
		}
	}
	let cs = t => {
		let heldCard = Space.get("held").getSlot();
		if (!heldCard.empty) {
			if (heldCard.deck.length==1 && t.getSlot().empty) {
				t.getSlot().add(heldCard.grabCard());
			}
		} else if (!t.getSlot().empty) {
			heldCard.add(t.getSlot().grabCard());
		}
	}
	let gs = t => {
		let heldCard = Space.get("held").getSlot();
		if (heldCard.empty) {
			// TODO take top card
		} else if (heldCard.deck.length == 1) {
			if (t.getSlot().empty) {
				if (heldCard.topCard().type.data.type == "A") {
					t.getSlot().add(heldCard.grabCard());
					canReturnToStack = false;
				}
			} else {
				let d = t.getSlot().topCard().type.data
				if (d.nextType!=undefined && d.nextType==heldCard.topCard().type.name) {
					t.getSlot().add(heldCard.grabCard());
					canReturnToStack = false;
				}
			}
		}
	}
	for (let i = 0; i < 8; i++) {
		Space.addSpace("slot" + i, new Point((width/30)*(i*3.5+1),height/8), new Spread(), sc);
	}
	for (let i = 0; i < 4; i++) {
		Space.addSpace("goal" + i, new Point((width/30)*(i*3.3+1),height - (height/10) - cardSizeY), new Deck(), gs);
	}
	for (let i = 0; i < 4; i++) {
		Space.addSpace("cell" + i, new Point((width/30)*(i*3.3+15.5),height - (height/10) - cardSizeY), new Deck(), cs);
	}
	Space.addSpace("held", () => Point.mouse(), new Spread(), undefined, true);
	
	let i = 0;
	while (!sd.empty) {
		let c = sd.grabCard();
		Space.get("slot" + i).getSlot().add(c);
		i = (i+1)%8;
	}
}

function getFreeCells() {
	let cells = 0;
	let out = 0;
	for (let i = 0; i < 4; i++) {
		if (Space.get("cell" + i).getSlot().empty) cells++;
	}
	out+=cells;
	for (let i = 0; i < 8; i++) {
		if (Space.get("slot" + i).getSlot().empty) out+=cells;
	}
	return out;
}

