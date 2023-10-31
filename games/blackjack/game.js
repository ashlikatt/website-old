function setup() {
	let canvas = createCanvas(min(windowWidth,windowHeight), min(windowWidth,windowHeight));
	canvas.position(
		(windowWidth - width) / 2, 
		(windowHeight - height) / 2
	);
	background(0);
	
	cardSize = width / 11;
	cardSizeX = cardSize;
	cardSizeY = cardSize * 1.5;
	initTypes();
	
	initGame();
}

function draw() {
	background(0,80,0);
	Space.renderAll();
}

class Card {
	constructor(type, d=false) {
		this.type=type;
		this.down = d;
	}
	flip() {
		this.down = !this.down;
		return this;
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

class Fan extends Deck {
	render(pos) {
		let i = 0;
		let dis = cardSizeX*0.4;
		for (let d of this.deck) {
			d.render(pos.shift((this.deck.length-1)*dis/2,0).shift(-i*dis,0));
			i++;
		}
	}
	validClick(dp, cp) {
		// Unneeded for game
	}
	clickedIndex(dp, cp) {
		// Unneeded for game
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
	fill(200,200,50);
	stroke(0);
	rect(pos.x,pos.y,cardSizeX,cardSizeY);
	fill(200,0,0);
	noStroke();
	let margin = min(cardSizeX*0.1,cardSizeY*0.1)
	rect(pos.x+margin,pos.y+margin,(cardSizeX-2*margin),(cardSizeY-2*margin));
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
	let val = [tv => tv+11>21 ? 1 : 11, ()=>2,()=>3,()=>4,()=>5,()=>6,()=>7,()=>8,()=>9,()=>10,()=>10,()=>10,()=>10];
	for (let suit of suits) {
		let i = 0;
		for (let num of nums) {
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
				value: val[i]
			});
			i++;
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

class Color {
	constructor(r,g=r,b=r) {
		this.r=r;
		this.g=g;
		this.b=b;
	}
	fill() {
		fill(this.r,this.g,this.b);
	}
}

// All data relevant to the current game
var folded = false;
var dealerFold = false;
var pWins=0, dWins=0;

function initGame() {
	let sd = Deck.standardDeck().shuffle();
	
	Space.addSpace("mainDeck", new Point(width/2 - cardSizeX/2,height/2 - cardSizeY/2), sd, (t) => {
		if (!folded) {
			if (Space.get("mainDeck").getSlot().empty) Space.get("mainDeck").setSlot(Deck.standardDeck().shuffle());
			Space.get("playerInv").getSlot().add(t.getSlot().grabCard().flip());
			if (getTotalVal("playerInv").value>21) {
				Space.get("statusText").getSlot().setText("LOSE: Busted!");
				dWins++;
				gameOver();
				return;
			}
			dealerTurn();
		}
	});
	Space.addSpace("statusText", new Point(3*width/4 - cardSizeX/2,height/2 - cardSizeY/2), new TextElement("Ongoing..."), undefined, true);
	Space.addSpace("foldButton", new Point(width/4 - cardSizeX/2,height/2 - cardSizeY/2), new Button("Fold"), (t) => {
		if (!folded) {
			folded=true;
			dealerTurn();
		} else if (dealerFold) {
			newGame();
		}
	}, true);
	Space.addSpace("playerInv", new Point(width/2 - cardSizeX/2,height/2 + (height/3) - cardSizeY), new Fan(), undefined, true);
	Space.addSpace("dealerInv", new Point(width/2 - cardSizeX/2,height/2 - (height/3)), new Fan(), undefined, true);
	Space.addSpace("wlr", new Point(width/32,height*31/32),new Chart(() => {
		return [{val: pWins, c: new Color(0,127,127)},{val: dWins, c: new Color(127,0,0)}];
	}), undefined, true);
	
	newGame();
}

function newGame() {
	folded = false;
	dealerFold = false;
	Space.get("playerInv").setSlot(new Fan());
	Space.get("dealerInv").setSlot(new Fan());

	if (Space.get("mainDeck").getSlot().empty) Space.get("mainDeck").setSlot(Deck.standardDeck().shuffle());
	Space.get("playerInv").getSlot().add(Space.get("mainDeck").getSlot().grabCard().flip());
	if (Space.get("mainDeck").getSlot().empty) Space.get("mainDeck").setSlot(Deck.standardDeck().shuffle());
	Space.get("playerInv").getSlot().add(Space.get("mainDeck").getSlot().grabCard().flip());
	if (Space.get("mainDeck").getSlot().empty) Space.get("mainDeck").setSlot(Deck.standardDeck().shuffle());
	Space.get("dealerInv").getSlot().add(Space.get("mainDeck").getSlot().grabCard());
	if (Space.get("mainDeck").getSlot().empty) Space.get("mainDeck").setSlot(Deck.standardDeck().shuffle());
	Space.get("dealerInv").getSlot().add(Space.get("mainDeck").getSlot().grabCard().flip());
	
	Space.get("statusText").getSlot().setText("Ongoing...");
	Space.get("foldButton").getSlot().txt = "Fold";
}

function checkWin() {
	if (dealerFold) {
		if (folded) {
			let dv = getTotalVal("dealerInv").value;
			let pv = getTotalVal("playerInv").value;
			if (pv>dv) {
				pWins++;
				if (pv==21 && Space.get("playerInv").getSlot().deck.length==2) {
					Space.get("statusText").getSlot().setText("WIN: Blackjack!");
				} else {
					Space.get("statusText").getSlot().setText("WIN: Higher Value!");
				}
			} else if (pv < dv) {
				dWins++;
				if (dv==21 && Space.get("dealerInv").getSlot().deck.length==2) {
					Space.get("statusText").getSlot().setText("LOSE: Blackjack!");
				} else {
					Space.get("statusText").getSlot().setText("LOSE: Lower Value");
				}
			} else {
				Space.get("statusText").getSlot().setText("TIE: Same Value");
			}
			gameOver();
		}
	}
}

function gameOver() {
	Space.get("foldButton").getSlot().txt = "New";
	for (let c of Space.get("dealerInv").getSlot().deck) {
		c.down = false;
	}
	folded = true;
	dealerFold = true;
}

function dealerTurn() {
	if (dealerFold) {
		checkWin();
		return;
	}
	let fold = false;
	
	let dealerValue = getTotalVal("dealerInv");
	let playerValue = getTotalVal("playerInv");
	let risk = random(min(21-dealerValue.value, (playerValue.value+random(8)-4)-dealerValue.value-3))
	if (dealerValue.value+7-risk>21) {
		if (dealerValue.insurance) {
			fold = dealerValue.value+4-risk>21
		} else {
			fold = true;
		}
	}
	if (fold) {
		dealerFold = true;
		if (folded) {
			checkWin();
			return;
		}
		Space.get("statusText").getSlot().setText("Dealer Folded...");
		return;
	} else {
		if (Space.get("mainDeck").getSlot().empty) Space.get("mainDeck").setSlot(Deck.standardDeck().shuffle());
		Space.get("dealerInv").getSlot().add(Space.get("mainDeck").getSlot().grabCard().flip());
		if (getTotalVal("dealerInv").value>21) {
			Space.get("statusText").getSlot().setText("WIN: Dealer Bust!");
			pWins++;
			gameOver();
			return;
		}
		if (folded) dealerTurn();
	}
}

function getTotalVal(p) {
	let v = 0;
	let insurance = false;
	let d = Space.get(p).getSlot().deck;
	let a = [];
	for (let c of d) {
		if (c.type.data.type == "A") {
			a.push(c);
			continue;
		}
		v += c.type.data.value();
	}
	for (let c of a) {
		let p = c.type.data.value(v)
		if (p==11) insurance = true;
		v+=p;
	}
	return {value: v, insurance: insurance};
}

class Button {
	constructor(t) {
		this.txt=t;
	}
	render(pos) {
		fill(0,150,200);
		stroke(0,50,100);
		rect(pos.x,pos.y,cardSizeX,cardSizeY);
		fill(255);
		noStroke();
		textAlign(CENTER);
		textSize(cardSizeX/4);
		text(this.txt,pos.x+cardSizeX/2,pos.y+cardSizeY/2 + cardSizeX/8);
	}
	validClick(dp, cp) {
		return cp.x>=dp.x && cp.x<=dp.x+cardSizeX && cp.y>=dp.y && cp.y<=dp.y+cardSizeY;
	}
}

class TextElement {
	constructor(t) {
		this.txt=t;
	}
	setText(t) {
		this.txt=t;
	}
	render(pos) {
		fill(255);
		noStroke();
		textAlign(CENTER);
		textSize(cardSizeX/3);
		text(this.txt,pos.x+cardSizeX/2,pos.y+cardSizeY/2 + cardSizeX/8);
	}
	validClick(dp, cp) {
		return false;
	}
}

class Chart {
	constructor(d) {
		this.dataFunc=d;
	}
	render(pos) {
		noStroke();
		let data = this.dataFunc();
		let len = (cardSizeX*2) / data.length;
		let tempMaxVal = max();
		for (let i of data) if (i.val>tempMaxVal) tempMaxVal = i.val; 
		let maxVal = 8;
		while (maxVal<tempMaxVal) maxVal*=2;
		textAlign(CENTER);
		textSize(cardSizeX/3);
		for (let i = 0; i < data.length; i++) {
			data[i].c.fill();
			let s = (cardSizeX*2)*(data[i].val/maxVal);
			rect(pos.x + i*len, pos.y, len, -s);
			text(data[i].val, pos.x + i*len + len/2, pos.y-s-cardSizeX/8);
		}
		stroke(255);
		line(pos.x,pos.y,pos.x+cardSizeX*2,pos.y);
		line(pos.x,pos.y,pos.x,pos.y-cardSizeX*2);
		fill(255);
		text(maxVal, pos.x, pos.y-cardSizeX*2.1);
	}
	validClick(dp, cp) {
		return false;
	}
}