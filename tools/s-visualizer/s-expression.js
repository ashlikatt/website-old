// Iterates over characters of a string.
class StringIterator {
	constructor(text) {
		this.current = text.split("").reverse();
	}
	
	// Peek the next character.
	peek() {
		return this.current[this.current.length-1];
	}
	
	// Consume and return the next character.
	next() {
		return this.current.pop();
	}
	
	// Skip n characters.
	skip(n) {
		for (let i = 0; i < n; i++) {
			this.next();
		}
	}
	
	// True if there are more characters to consume.
	hasNext() {
		return this.current.length > 0;
	}
}
const Value = {
	STRING : 0,
	WORD : 1,
	NUM : 2,
	LIST : 3,
	ERROR : 4,
	NOTE: 5
}

// Represents a Lisp value.
class LispValue {
	constructor(type, val) {
		this.type = type;
		this.val = val;
	}
	
	// Converts to a string-readable version
	toString() {
		if (this.type === Value.STRING) {
			return '"' + this.val + '"';
		} else if (this.type === Value.WORD || this.type === Value.NOTE) {
			return this.val;
		} else if (this.type === Value.ERROR) {
			return this.val[0];
		} else if (this.type === Value.NUM) {
			return this.val + "";
		} else if (this.type === Value.LIST) {
			return '(' + this.val.map(n => n.toString()).join(' ') + ')';
		}
	}
	
	copyText() {
		return this.type === Value.ERROR ? this.val[1] : this.toString();
	}
	
	render(x, y, minSize = 50, padding = 20, first = false) {
		textSize(minSize / 2);
		if (this.type === Value.LIST) {
			fill(100,100,100); stroke(50,50,50); strokeWeight(2);
			rect(x, y, this.renderWidth(minSize, padding), this.renderHeight(minSize, padding));
			let curX = x + padding;
			let f = true;
			for (const inner of this.val) {
				inner.render(curX, y + padding, minSize, padding, f);
				f = false;
				curX += inner.renderWidth(minSize, padding) + padding
			}
		} else {
			if (this.type === Value.WORD) { 
				if (first) {
					fill(150,150,255); stroke(50,50,150); 
				} else {
					fill(255,150,150); stroke(150,50,50); 
				}
			} 
			else if (this.type === Value.NUM) { fill(255,170,85); stroke(150,100,50); } 
			else if (this.type === Value.STRING) { fill(255,255,150); stroke(150,150,50); }
			else if (this.type === Value.ERROR) { fill(255,0,0); stroke(150,0,0); }
			else if (this.type === Value.NOTE) { fill(200); stroke(120); }
			const w = this.renderWidth(minSize, padding);
			strokeWeight(2);
			rect(x, y, w, minSize);
			fill(0);
			stroke(0);
			strokeWeight(1);
			textAlign(CENTER);
			text(this.toString(), x + w/2, y + minSize*2/3);
		}
	}
	
	renderWidth(minSize, padding) {
		if (this.type === Value.LIST) 
			return Math.max(minSize, padding + this.val.reduce((a, b) => b.renderWidth(minSize, padding) + a + padding, 0));
		else return Math.max(minSize, textWidth(this.toString()) + padding*2);
	}
	
	renderHeight(minSize, padding) {
		if (this.type === Value.LIST) 
			return Math.max(minSize, padding*2 + this.val.reduce((a, b) => Math.max(b.renderHeight(minSize, padding), a), 0));
		else return minSize;
	}
}
// Represents a compile error.
class CompileError extends Error {
	constructor(cause) {
		super(cause);
	}
}
function setup() {
	createCanvas(windowWidth, windowHeight);
	background(0);
	textFont('Courier New');
	expressions.push(new LispValue(Value.NOTE, "Left Click Empty: New Expression"));
	expressions.push(new LispValue(Value.NOTE, "Left Click Expression: Copy Text"));
	expressions.push(new LispValue(Value.NOTE, "Right Click Expression: Delete"));
	expressions.push(new LispValue(Value.NOTE, "Drag: Pan"));
	expressions.push(new LispValue(Value.NOTE, "Scroll: Zoom"));
}

var scrollX = 0;
var scrollY = 0;
var zoom = 1;
const expressions = [];
const numChar = new RegExp('[0-9]');
const wordChar = new RegExp('[^ )("]');
const comment = new RegExp(';.*$', 'gm');

// Parses lisp text
function parseLisp(text) {
	const it = new StringIterator(text.trim());
	const out = [];
	while (it.hasNext()) {
		while (it.peek() === ' ') it.skip(1);
		out.push(parseVal(it));
	}
	return out;
}

// Parses a lisp value
function parseVal(it/*StringIterator*/)/*LispValue*/{
	if (!it.hasNext()) throw new CompileError('Malformed Value');
	const next = it.peek();
	if (next === '(') {
		return parseList(it);
	} else if (next === '"') {
		return parseString(it);
	} else if (numChar.test(next)) {
		return parseNum(it);
	} else if (wordChar.test(next)) {
		return parseWord(it);
	} else {
		throw new CompileError('Unrecognized Token: ' + next);
	}
}

// Parses a list
function parseList(it/*StringIterator*/)/*LispValue::Lisp*/{
	if (it.next() !== '(') throw new CompileError("Invalid List Opening"); // Remove (
	const out = [];
	while (true) {
		if (!it.hasNext()) throw new CompileError("Unclosed List");
		const next = it.peek();
		if (next === ')') { // If ) encountered, end list and remove it.
			it.skip(1);
			break;
		} else if (next !== ' ') { // If another element encountered, add it.
			out.push(parseVal(it));
		} else {
			it.skip(1); // Skip non-valid chars
		}
	}
	return new LispValue(Value.LIST, out);
}

// Parses a string
function parseString(it/*StringIterator*/)/*LispValue::String*/ {
	if (it.next() !== '"') throw new CompileError('Malformed String');
	let out = "";
	let escape = false;
	while (true) {
		if (!it.hasNext()) throw new CompileError("Unclosed String");
		const next = it.next();
		if (escape) {
			escape = false;
			if (next === '"' || next === '\\') {
				out += next;
			} else {
				throw new CompileError("Invalid String Escape: " + next)
			}
		} else {
			if (next === '"') {
				break;
			} else if (next === '\\') {
				escape = true;
			} else {
				out += next;
			}
		}
	}
	return new LispValue(Value.STRING, out);
}

// Parses a num
function parseNum(it/*StringIterator*/)/*LispValue::Num*/ {
	const first = it.peek();
	if (!numChar.test(first) && !numChar.test(first)) throw new CompileError('Malformed Number');
	let out = 0;
	while (it.hasNext() && numChar.test(it.peek())) { // While next char is digit
		out = 10 * out + parseInt(it.next()); // Add to number
	}
	if (it.hasNext() && it.peek() === '.') { // If we encounter a period afterwards
		it.skip(1);
		let place = 1;
		while (it.hasNext() && numChar.test(it.peek())) { // While next digit is number
			place /= 10;
			out += place * parseInt(it.next()); // Add to decimal
		}
	}
	return new LispValue(Value.NUM, out);
}

// Parses a word
function parseWord(it/*StringIterator*/)/*LispValue::Word*/ {
	if (!wordChar.test(it.peek())) throw new CompileError('Malformed Word');
	let out = "";
	while (it.hasNext() && wordChar.test(it.peek())) { // While next char is part of word
		out += it.next();
	}
	return new LispValue(Value.WORD, out);
}
let fullClick = false;
window.addEventListener("contextmenu", e => e.preventDefault());

function mouseDragged() {
	if (expressions) {
		scrollX += movedX;
		scrollY += movedY;
		fullClick = false;
	}
}

function mousePressed() {
	fullClick = true;
}

function mouseReleased() {
	if (!fullClick) return;
	textSize(50 / 2);
	let clickedExpr;
	let y = 0;
	let i = 0;
	for (const e of expressions) {
		const w = e.renderWidth(50, 10);
		const h = e.renderHeight(50, 10);
		if (mouseX > scrollX && 
				mouseX < scrollX +      w  * zoom && 
				mouseY > scrollY +      y  * zoom && 
				mouseY < scrollY + (y + h) * zoom) {
			clickedExpr = e;
			break;
		}
		y += 10 + h;
		i++;
	}
	if (clickedExpr) {
		if (mouseButton === RIGHT) {
			expressions.splice(i, 1);
		} else {
			const copy = document.createElement("textarea");
			document.body.appendChild(copy);
			copy.value = clickedExpr.copyText();
			copy.select();
			document.execCommand("copy");
			document.body.removeChild(copy);
		}
	} else {
		if (mouseButton !== RIGHT) addExpr();
	}
}

function mouseWheel(e) {
	if (expressions) {
		zoom = Math.max(0.1,Math.min(10,zoom-e.delta/5000));
	}
}

function draw() {
	render();
	if (expressions.length === 0) {
		scrollX = 0;
		scrollY = 0;
	}
}

function render() {
	background(0);
	push();
	translate(scrollX, scrollY);
	scale(zoom);
	let y = 0;
	for (const e of expressions) {
		e.render(0, y, 50, 10);
		const w = e.renderWidth(50, 10);
		const h = e.renderHeight(50, 10);
		if (mouseX > scrollX && 
				mouseX < scrollX +      w  * zoom && 
				mouseY > scrollY +      y  * zoom && 
				mouseY < scrollY + (y + h) * zoom) {
			fill(255,255,255,100);
			noStroke();
			rect(0, y, w, h);
		}
		y += 10 + h;
	}
	pop();
}

function addExpr() {
	const inp = prompt("Input LISP expression:");
	if (inp === undefined || inp === null) return;
	try {
		const program = parseLisp(inp.replaceAll(comment, "").replaceAll(/[\t\n\r]/g, ""));
		for (const p of program) {
			expressions.push(p);
		}
	} catch(e) {
		expressions.push(new LispValue(Value.ERROR, [e + " [Click to Copy Original]", inp]))
	}
}