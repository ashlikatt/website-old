class TokenError extends Error {
	constructor(s, y, x) {
		super("Compile Error: " + s + "\n At: line " + x + ", column " + y);
	}
}
class CompileError extends Error {
	constructor(s, v) {
		super("Compile Error: " + s + "\n At: line " + v.y + ", column " + v.x);
	}
}
class UnexpectedToken extends Error {
	constructor(s, v) {
		super("Compile Error: " + s + "\n At: line " + v.y + ", column " + v.x);
	}
}
class ParseError extends Error {
	constructor(s) {
		super("Parse Error: " + s);
	}
}
class RuntimeError extends Error {
	constructor(s) {
		super("Command Error: " + s);
	}
}
class TokenIterator {
	constructor() {
		this.tokens = [];	
		this.lastToken = undefined;
	}
	push(v) {
		this.tokens.unshift(v);
	}
	next() {
	  return this.lastToken = this.tokens.pop();	
	}
	peek(n = 0) {
		return this.tokens[this.tokens.length - 1 - n]
	}
	get length() {
		return this.tokens.length;	
	}
	get x() {
		return this.lastToken?.x || 0;	
	}
	get y() {
		return this.lastToken?.y || 0;	
	}
	get after() {
		return {x: this.x, y: this.y}	
	}
}
const TokenType = {
	COMMA: 0, ARROW: 1, IDENT: 2, 
}
const ArrowDir = {
	LEFT: 0, RIGHT: 1, BOTH: 2,
}
class Token {
	constructor(type, data, x, y) {
		this.type = type;
		this.data = data;
		this.x = x;
		this.y = y;
	}
	get after() {
		return (this.type === TokenType.IDENT) ? { x: this.x + this.data.length, y: this.y }
		     : (this.type === TokenType.ARROW) ? { x: this.x + 2 } 
		     : { x: this.x + 1, y: this.y };
	}
}

function tokenize(str) {
	const out = new TokenIterator();
	let i = 0;
	let x = 0;
	let y = 1;
	while (i < str.length) {
		if (i+1 < str.length && str[i] === '/' && str[i+1] === '/') {
			while (i < str.length && str[i] !== '\n') i++;
			continue;
		}
		else if (str[i] === '<') {
			if (i+1 < str.length && str[i+1] === '-') {
				out.push(new Token(TokenType.ARROW, ArrowDir.LEFT, x, y));
				i++; x++;
			} else throw new TokenError("Unexpected character; expected '-' to complete '<-' token.", x+1, y);
		}
		else if (str[i] === '-') {
			if (i+1 < str.length && str[i+1] === '-') {
				out.push(new Token(TokenType.ARROW, ArrowDir.BOTH, x, y));
				i++; x++;
			} else if (i+1 < str.length && str[i+1] === '>') {
				out.push(new Token(TokenType.ARROW, ArrowDir.RIGHT, x, y));
				i++; x++;
			} else throw new TokenError("Unexpected character; expected '>' or '-' to complete '--' or '->' tokens.", x+1, y);
		}
		else if (str[i] === ',') out.push(new Token(TokenType.COMMA, undefined, x, y)); 
		else if (str[i] === '\n') { 
			y++;
			x = 0;
			i++;
			continue;
		} else if (identChar(str[i])) {
			let ident = "";
			const x_pos = x;
			while (i < str.length && identChar(str[i])) {
				ident += str[i];
				i++;
				x++;
			}
			out.push(new Token(TokenType.IDENT, ident, x_pos, y));
			continue;
		} else if (str[i].trim().length > 0) throw new TokenError("Unexpected character.", x, y);
		x++;
		i++;
	}
	return out;
}

function identChar(c) {
	return /[a-zA-Z0-9_]/.test(c);
}
class World {
	constructor() {
		this.areas = {};	
		this.acronyms = {};
		this.revAcronyms = {};
	}
	get(name) {
		if(this.areas[name]) return this.areas[name];
		return this.revAcronyms[name.toUpperCase()];
	}
	get areaList() {
		return Object.keys(this.areas);	
	}
	addArea(a) {
		this.areas[a.name] = a;
	}
	getArea(name) {
		if (!this.areas[name]) this.addArea(new Area(name));
		return this.areas[name];
	}
	toString() {
		return Object.keys(this.areas).map(n => this.areas[n].toString()).join("; ");
	}
	updateAcronyms() {
		this.acronyms = areaAcronyms(this);	
		this.revAcronyms = {};
		for (const name in this.acronyms) {
			this.revAcronyms[this.acronyms[name]] = this.areas[name];
		}
	}
}

class Area {
	constructor(name) {
		this.name = name;
		this.connections = {};
	}
	addConnection(name) {
		if (name !== this.name && !this.connections[name]) this.connections[name] = true;
	}
	node(p = undefined) {
		return new SearchNode(this, p);	
	}
	toString() {
		return this.name + " -> " + Object.keys(this.connections).join(", ");
	}
}

class SearchNode {
	constructor(area, parent = undefined) {
		this.area = area;
		this.parent = parent;
	}
}
function parseMap(tokens) {
	const world = new World();
	while (tokens.length > 0) {
		parseStatement(tokens, world);
	}
	world.updateAcronyms();
	return world;
}

function parseStatement(tokens, world) {
	if (tokens.length === 0) throw new CompileError("Expected statement, found none.", tokens.after);
	let current = parseAreaList(tokens);
	while (tokens.length > 0 && tokens.peek(0).type === TokenType.ARROW) {
		const arrow = tokens.next();
		const next = parseAreaList(tokens);
		for (let area of current) {
			area = world.getArea(area);
			for (let area2 of next) {
				area2 = world.getArea(area2);
				if (arrow.data === ArrowDir.LEFT || arrow.data === ArrowDir.BOTH) {
					area2.addConnection(area.name);
				}
				if (arrow.data === ArrowDir.RIGHT || arrow.data === ArrowDir.BOTH) {
					area.addConnection(area2.name);
				}
			}
		}
		current = next;
	}
}

function parseAreaList(tokens) {
	if (tokens.length === 0) throw new CompileError("Expected area list, found none.", tokens.after);
	const first = tokens.next();
	if (first.type !== TokenType.IDENT) throw new UnexpectedToken("Unexpected token: Expected area name.", first);
	const areas = [first.data];
	while (tokens.length > 0 && tokens.peek(0).type === TokenType.COMMA) {
		tokens.next();
		if (tokens.length === 0) throw new CompileError("Expected another area, found none.", tokens.after);
		const n = tokens.next();
		if (n.type !== TokenType.IDENT) throw new CompileError("Unexpected token: Expected another area.", n);
		areas.push(n.data);
	}
	return areas;
}
function buildMap(mapData) {
	try {
		const world = parseMap(tokenize(mapData));
		currentMap = world;
		mapStr = mapData;
	} catch(e) {
		printErr(e + "");
	}
}

var mapStr;
var currentMap;
const definedCommands = {
	'compile': r => {
		printMsg("Recompiling...");
		buildMap(mapCode.value());
		printMsg("Done!")
	},
	'help': r => {
		printMsg("help: Display this menu.");
		printMsg("compile: Rebuilds the map from text input.");
		printMsg("clear: Clears console.");
		printMsg("path A B: Prints shortest path between A and B.");
		printMsg("areas: Prints all areas, sorted alphabetically.");
		printMsg("disjoint A?: Prints if the map is entirely interconnected [from a specific area].");
		printMsg("print Type?: Prints the map in text format. Types: raw (default), strict, compressed");
	},
	'path': r => parsePath(currentMap, r),
	'clear': r => clearConsole(),
	'areas': r => {
		printMsg("All areas: " + Object.keys(currentMap.areas).sort().map(n => n + " (" + currentMap.acronyms[n] + ")").join(", "));
	},
	'disjoint': r => {
		disjointPath(currentMap, r);
	},
	'info': r => {
		areaInfo(currentMap, r);	
	},
	'print': r => {
		printCode(currentMap, r);	
	}
}

function evalCommand(instructions) {
	try {
		printMsg("| " + instructions);
		const tokens = tokenize(instructions);
		if (tokens.length > 0) {
			const name = tokens.next();
			if (name.type !== TokenType.IDENT) throw new RuntimeError("Expected a valid function name.");
			const command = name.data;
			if (!definedCommands[command]) throw new RuntimeError("Invalid function, run 'help' for help.");
			definedCommands[command](tokens);
		}
	} catch(e) {
		printErr(e + "");	
	
	}
}

function breadth(world, start, end) {
	const queue = [world.areas[start].node()];
	const explored = new Set();
	explored.add(start);
	while (queue.length > 0) {
		const current = queue.shift();
		if (current.area.name === end) return current;
		for (let adj in current.area.connections) {
			if (!explored.has(adj)) {
				explored.add(adj);
				queue.push(world.areas[adj].node(current));
			}
		}
	}
	return undefined;
}

function breadthScan(world, start) {
	const queue = [world.areas[start].node()];
	const explored = new Set();
	explored.add(start);
	while (queue.length > 0) {
		const current = queue.shift();
		for (let adj in current.area.connections) {
			if (!explored.has(adj)) {
				explored.add(adj);
				queue.push(world.areas[adj].node(current));
			}
		}
	}
	const out = [];
	for (let n of explored.values()) out.push(n);
	return out;
}
function areaInfo(world, tokens) {
	if (tokens.length !== 1) throw new RuntimeError("Incorrect number of arguments.");
	const first = tokens.next();
	if (first.type !== TokenType.IDENT) throw new RuntimeError("Argument 1: Expected area name.");
	const inpName = first.data;
	if (!world.get(first.data)) throw new RuntimeError(first.data + " is not a valid area.");
	const areaData = world.get(inpName);
	const connections = Object.keys(world.get(inpName).connections);
	printMsg("Name: " + areaData.name);
	printMsg("Acronym: " + world.acronyms[areaData.name]);
	const msgs = [];
	for (const c of connections) {
		const twoWay = world.get(c).connections[areaData.name]
		if (!twoWay) {
			msgs.push(" -> " + c);	
		} else {
			msgs.unshift(" -- " + c);
		}
	}
	for (const c in world.areas) {
		if (!areaData.connections[c] && world.get(c).connections[areaData.name]) {
			msgs.push(" <- " + c);
		}
	}
	printMsg("Connections: " + msgs.length);
	msgs.forEach(n => printMsg(n));
}

function parsePath(world, tokens) {
	if (tokens.length !== 2) throw new RuntimeError("Incorrect number of arguments.");
	const first = tokens.next();
	if (first.type !== TokenType.IDENT) throw new RuntimeError("Argument 1: Expected area name.");
	const third = tokens.next();
	if (third.type !== TokenType.IDENT) throw new RuntimeError("Argument 2: Expected area name.");
	if (!world.get(first.data)) throw new RuntimeError(first.data + " is not a valid area.");
	if (!world.get(third.data)) throw new RuntimeError(third.data + " is not a valid area.");
	const start_area = world.get(first.data).name;
	const end_area = world.get(third.data).name;
	const search = breadth(world, start_area, end_area);
	if (search === undefined) {
		printMsg("No valid path from " + start_area + " to " + end_area + ".");
	} else {
		let c = search;
		let path = [];
		while (c !== undefined) {
			path.push(c.area.name);
			c = c.parent;
		}
		printMsg("Shortest path: " + path.reverse().join(" -> "));	
	}
}

function disjointPath(world, tokens) {
	const allAreas = world.areaList;
	if (allAreas.length < 2) return printMsg("World is not disjoint. All areas can reach eachother.");	
	if (tokens.length === 1) {
		const first = tokens.next();
		if (first.type !== TokenType.IDENT) throw new RuntimeError("Argument 1: Expected area name.");
		if (!world.get(first.data)) throw new RuntimeError(first.data + " is not a valid area.");
		let fromPoint = world.get(first.data).name;
		const found = breadthScan(world, fromPoint);
		if (allAreas.length === found.length) {
			printMsg("World is not disjoint from " + fromPoint + ". It can reach all areas.");
		} else {
			printMsg("World is disjoint from " + fromPoint + ". It cannot reach the following areas: " + allAreas.filter(n => !found.includes(n)).join(", "));
		}
	} else if (tokens.length === 0) {
		let cannotReach = false;
		for (const area of allAreas) {
			const found = breadthScan(world, area);
			if (allAreas.length !== found.length) {
				if (!cannotReach) printMsg("================");
				cannotReach = true;
				printMsg(area + " is disjoint. It cannot reach the following areas: " + allAreas.filter(n => !found.includes(n)).join(", "));
			}	
		}
		if (!cannotReach) {
			printMsg("World is not disjoint. All areas can reach eachother.");	
		} else printMsg("================");
	} else throw new RuntimeError("Incorrect number of arguments.");
}
class Connection {
	constructor(one, two, dual) {
		this.one = one;
		this.two = two;
		this.dual = dual;
	}
	toString() {
		if (this.dual) {
			return this.one + " -- " + this.two;	
		} else {
			return this.one + " -> " + this.two;
		}
	}
}
class ConnectionChain {
	constructor(initial) {
		this.str = initial.toString();
		this.first = initial.one;
		this.last = initial.two;
	}
	connect(other) {
		if (this.last === other.one) {
			this.str += (other.dual ? " -- " : " -> ") + other.two;
			this.last = other.two;
		} else if (this.last === other.two) {
			this.str += (other.dual ? " -- " : " -> ") + other.one;
			this.last = other.one;
		} else if (this.first === other.one) {
			this.str = other.two + (other.dual ? " -- " : " <- ") + this.str;
			this.first = other.two;
		} else if (this.first === other.two) {
			this.str = other.one + (other.dual ? " -- " : " -> ") + this.str;
			this.first = other.one;
		}
	}
	canConnect(other) {
		return other.one === this.first || other.two === this.first || other.one === this.last || other.two === this.last;
	}
}

function printCode(world, tokens) {
	let type = 'raw';
	if (tokens.length > 1) throw new RuntimeError("Incorrect number of arguments.");
	else if (tokens.length === 1) {
		let first = tokens.next();
		if (first.type !== TokenType.IDENT) throw new RuntimeError("Argument 1: Expected format type.");
		type = first.data;
	}
	if (type === 'raw') {
		printMsg("Map data:");
		printMsg("================");
		printMsg(mapStr);
		printMsg("================");
	} else if (type === 'strict') {
		printMsg("Strict map data:");
		printMsg("================");
		for (const name in world.areas) {
			const connections = Object.keys(world.areas[name].connections);
			printMsg(connections.length === 0 ? name + " -> _" : name + " -> " + connections.join(", "));
		}
		printMsg("================");
	} else if (type === 'compressed') {
		printMsg("Compressed map data:");
		printMsg("================");
		// List of A -> B connections
		const rawConnections = world.areaList
			.map(n => world.areas[n])
			.map(n => Object.keys(n.connections)
			.map(m => new Connection(n.name, m, false)))
			.flat();
		// Compress A -> B; B -> A into A -- B
		const connections = [];
		for (let i = 0; i < rawConnections.length; i++) {
			const c = rawConnections[i];
			let index = rawConnections.findIndex(n => n.one === c.two && n.two === c.one);
			if (index > -1) {
				c.dual = true;
				connections.push(c);
				rawConnections.splice(index, 1);
			} else {
				connections.push(c);
			}
		}
		// Compress A -- B; B -- C into A -- B -- C.
		const chains = [];
		outer: 
		for (const c of connections) {
			for (const chain of chains) {
				if (chain.canConnect(c)) {
					chain.connect(c);
					continue outer;
				}
			}
			chains.push(new ConnectionChain(c));
		}
		printMsg(chains.map(n => n.str).join("\n"));
		printMsg("================");
	} else throw new RuntimeError(type + " is not a valid format. Expected 'raw', 'strict', or 'compressed'")
}

function areaAcronyms(world) {
	const acronyms = {};
	const usedAcronyms = [];
	for (const name in world.areas) {
		if (name.length <= 3) {
			acronyms[name] = name;
			usedAcronyms.push(name);
		} else {
			let trip = validTriplet(name.replaceAll(/[^A-Z]/g, ''), usedAcronyms) ||
								 validPair(name.replaceAll(/[^A-Z]/g, ''), usedAcronyms) ||
			           validTriplet(name[0].toUpperCase() + name.substring(1).toUpperCase().replaceAll(/[AEIOU]/g, ''), usedAcronyms) ||
			           validTriplet(name.toUpperCase(), usedAcronyms);
			if (trip) {
				acronyms[name] = trip;
				usedAcronyms.push(trip);
			} else { // Failsafe
				let n = 0;
				let s;
				while (usedAcronyms.includes(s = name.substring(0,1).toUpperCase() + n)) n++;
				acronyms[name] = s;
				usedAcronyms.push(s);
			}
		}
	}
	return acronyms;
}

function validTriplet(str, used) {
	if (str.length < 3) return undefined;
	for (let a = 0; a < str.length; a++) {
		for (let b = a + 1; b < str.length; b++) {
			for (let c = b + 1; b < str.length; c++) {
				let s = str[a] + str[b] + str[c];
				if (!used.includes(s)) return s;
			}
		}
	}
	return undefined;
}

function validPair(str, used) {
	if (str.length < 2) return undefined;
	for (let a = 0; a < str.length; a++) {
		for (let b = a + 1; b < str.length; b++) {
			let s = str[a] + str[b];
			if (!used.includes(s)) return s;
		}
	}
	return undefined;
}

var consoleBuffer = "";
var textBox;

function printMsg(m) {
	printMsgInline(m + "<br>");
}

function printMsgInline(m) {
	consoleBuffer += m;
	textBox.innerHTML = consoleBuffer.replaceAll("\n", "<br>");
	textBox.scroll(0, 9999999);
}

function printErr(m) {
	printMsg(m.substring(7));
}

function clearConsole() {
	consoleBuffer = "";
	textBox.innerHTML = "";
}

var mapCode;
var inputBox;
var initialCode;

addEventListener('load', function() {
    mapCode = document.getElementById('codebox');
    initialCode = mapCode.value;
    
    inputBox = document.getElementById('inputbox');
    inputBox.addEventListener('keyup', function(e) {
        console.log('a')
        if (e.key === 'Enter') {
            evalCommand(inputBox.value);
            inputBox.value = "";
        }
    });
    setTimeout(() => inputBox.focus(), 500);
    
    textBox = document.getElementById('console')
    
    clearConsole();
    printMsg("Type 'help' for help.");
    buildMap(mapCode.value);
});

window.addEventListener("beforeunload", function (e) {
    if (mapCode.value === initialCode) return;
    var confirmationMessage = 'Map data will be erased. Really leave?';
    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});