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
		super("Runtime Error: " + s);
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
	OPEN_ANGLE: 0, CLOSE_ANGLE: 1, IDENT: 2, ARROW: 3, EXTENSION: 4, COMMA: 5
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
		     : { x: this.x, y: this.y };
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
		else if (str[i] === '<') out.push(new Token(TokenType.OPEN_ANGLE, undefined, x, y));
		else if (str[i] === '>') out.push(new Token(TokenType.CLOSE_ANGLE, undefined, x, y));
		else if (str[i] === '|') out.push(new Token(TokenType.EXTENSION, undefined, x, y)); 
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
			if (ident === '-' && i < str.length && str[i] === '>') {
				out.push(new Token(TokenType.ARROW, undefined, x_pos, y));
				i++;
				x++;
			} else out.push(new Token(TokenType.IDENT, ident, x_pos, y));
			continue;
		}
		x++;
		i++;
	}
	return out;
}

function identChar(c) {
	return ' ,<>|\n\t'.indexOf(c) === -1;
}
class Program {
	constructor() {
		this.types = {'IO': 1, 'IO.null': 0, 'IO.1': 1, 'IO.0': 1}
		this.specific_casts = {};
		this.from_casts = {};
		this.to_casts = {};
	}
	add_cast(c) {
		if (c.pattern instanceof Deconstruct) 
			if (c.expression instanceof Constructor || c.expression instanceof Cast) {
				if (!this.specific_casts[c.pattern.type]) this.specific_casts[c.pattern.type] = {};
				if (!this.specific_casts[c.pattern.type][c.expression.type]) this.specific_casts[c.pattern.type][c.expression.type] = [];
				this.specific_casts[c.pattern.type][c.expression.type].push(c);
			}	else {
				if (!this.from_casts[c.pattern.type]) this.from_casts[c.pattern.type] = [];
				this.from_casts[c.pattern.type].push(c);
			}
		else if (c.expression instanceof Constructor || c.expression instanceof Cast) {
			if (!this.to_casts[c.expression.type]) this.to_casts[c.expression.type] = [];
			this.to_casts[c.expression.type].push(c);
		}
		else throw new ParseError("Ambiguous cast declaration."); // Try to show where occured
	}
	validate() {
		for (let a in this.specific_casts) for (let b in this.specific_casts[a]) for (let n of this.specific_casts[a][b]) n.validate(this);
		for (let a in this.from_casts) for (let n of this.from_casts[a]) n.validate(this);
		for (let a in this.to_casts) for (let n of this.to_casts[a]) n.validate(this);
	}
}

class Type {
	constructor(name, amount) {
		this.name = name;
		this.subtypes = amount;
	}
	toString() {
		return this.name + " : " + this.subtypes + ";";	
	}
}

class CastDef {
	constructor(ft, tt) {
		this.pattern = ft;
		this.expression = tt;
	}
	validate(p) {
		const vars = this.pattern.validate(p);
		this.expression.validate(p, vars);
	}
	toString() {
		return this.pattern.toString() + " -> " + this.expression.toString();
	}
}

class Deconstruct {
	constructor(type, inner) {
		this.type = type;
		this.innerPatterns = inner; // List
	}
	validate(p) {
		const amnt = p.types[this.type];
		if (amnt === undefined) throw new ParseError("No type named '" + this.type + "' defined.");
		if (amnt !== this.innerPatterns.length) throw new ParseError("Type '" + this.type + "' requires " + this.innerPatterns.length + " sub-types; got " + amnt + ".");
		return this.innerPatterns.flatMap(n => n.validate(p));
	}
	matches(val, bindings = {}) {
		if (val.type === this.type && val.subvalues.length === this.innerPatterns.length) {
			for (let i = 0; i < val.subvalues.length; i++) {
				if (!this.innerPatterns[i].matches(val.subvalues[i], bindings)) return false;
			}
			return true;
		} else return false;
	}
	toString() {
		return this.type + "<" + this.innerPatterns.map(n => n.toString()).join(", ") + ">";	
	}
}

class Variable { // Used by patterns and expressions.
	constructor(name) {
		this.name = name;
	}
	validate(p, vars = undefined) {
		if (vars && !vars.includes(this.name)) throw new ParseError("No variable named '" + this.name + "' defined here.");
		return this.name;
	}
	matches(val, bindings = {}) {
		bindings[this.name] = val;
		return true;
	}
	toString() {
		return this.name;	
	}
}

class Constructor {
	constructor(type, inner) {
		this.type = type;
		this.innerExpressions = inner; // List
	}
	validate(p, vars) {
		const amnt = p.types[this.type];
		if (amnt === undefined) throw new ParseError("No type named '" + this.type + "' defined.");
		if (amnt !== this.innerExpressions.length) throw new ParseError("Type '" + this.type + "' requires " + this.innerExpressions.length + " sub-types; got " + amnt + ".");
		for (let n of this.innerExpressions) n.validate(p, vars);
	}
	toString() {
		return this.type + "<" + this.innerExpressions.map(n => n.toString()).join(", ") + ">";	
	}
}

class Cast {
	constructor(a, type) {
		this.op = a; // Expression
		this.type = type;
	}
	validate(p, vars) {
		if (!p.types[this.type]) throw new ParseError("No type named '" + this.type + "' defined.");
		this.op.validate(p, vars);
	}
	toString() {
		return this.op.toString() + " -> " + this.type;	
	}
} 

function parseProgram(tokens) {
	const p = new Program();
	while(tokens.length > 0) {
		const s = parseStatement(tokens);
		if (s instanceof Type) {
			p.types[s.name] = s.subtypes;
		} else if (s instanceof CastDef) {
			p.add_cast(s);
		}
	}
	p.validate();
	return p;
}

function parseStatement(tokens) {
	if (tokens.length === 0) throw new CompileError("Expected definition here.", tokens.after);
	const first = tokens.next();
	if (first.type === TokenType.IDENT) {
		const name = first.data;
		if (tokens.peek()?.type === TokenType.OPEN_ANGLE) {
			const amnt = parseTypeList(tokens);
			return new Type(name, amnt);
		} else return new Type(name, 0);
	} else if (first.type === TokenType.EXTENSION) {
		if (tokens.length === 0) throw new CompileError("Expected pattern here.", tokens.after);
		const pattern = parsePattern(tokens);
		if (tokens.length === 0) throw new CompileError("Expected arrow here.", tokens.after);
		const a = tokens.next();
		if (a.type !== TokenType.ARROW) throw new UnexpectedToken("Unexpected token. Expected arrow.", a);
		if (tokens.length === 0) throw new CompileError("Expected expression here.", tokens.after);
		const expression = parseExpression(tokens);
		return new CastDef(pattern,expression);
	} else throw new UnexpectedToken("Unexpected token. Expected identifier (type name).", first);
}

function parseTypeList(tokens) {
	if (tokens.length === 0) throw new CompileError("Expected < here.", tokens.after);
	const first = tokens.next();
	if (first.type !== TokenType.OPEN_ANGLE) throw new UnexpectedToken("Unexpected token. Expected sub-type list.", first);
	
	if (tokens.length === 0) throw new CompileError("Expected sub-type or > here.", tokens.after);
	const second = tokens.next();
	
	if (second.type === TokenType.CLOSE_ANGLE) return 0;
	else if (second.type === TokenType.IDENT) {
		let numTypes = 1;
		while (true) {
			if (tokens.length === 0) throw new CompileError("Expected , or > here.", tokens.after);
			const cur = tokens.next();
			if (cur.type === TokenType.COMMA) {
				if (tokens.length === 0) throw new CompileError("Expected a sub-type here.", tokens.after);
				const l = tokens.next();
				if (l.type !== TokenType.IDENT) throw new UnexpectedError("Unexpected token. Expected a sub-type name.", l);
				numTypes++;
			} else if (cur.type === TokenType.CLOSE_ANGLE) {
				break;
			} else throw new UnexpectedToken("Unexpected token. Expected sub-type or > here.", cur);
		}
		return numTypes;
	} else throw new UnexpectedToken("Unexpected token. Expected , or > here.", second);
}

function parsePattern(tokens) {
	if (tokens.length === 0) throw new CompileError("Expected pattern here.", tokens.after);
	const first = tokens.next();
	if (first.type !== TokenType.IDENT) throw new UnexpectedToken("Unexpected token. Expected variable or type destructure.", first);
	const name = first.data;
	if (tokens.length > 0 && tokens.peek().type === TokenType.OPEN_ANGLE) {
		tokens.next();
		if (tokens.length === 0) throw new CompileError("Expected variable, destructure, or > here.", tokens.after);
		if (tokens.peek().type === TokenType.CLOSE_ANGLE) {
			tokens.next();
			return new Deconstruct(name, []);
		} else {
			const inner = [parsePattern(tokens)];
			while (true) {
				if (tokens.length === 0) throw new CompileError("Expected , or > here.", tokens.after);
				const cur = tokens.next();
				if (cur.type === TokenType.COMMA) {
					if (tokens.length === 0) throw new CompileError("Expected a pattern here.", tokens.after);
					inner.push(parsePattern(tokens));
				} else if (cur.type === TokenType.CLOSE_ANGLE) {
					break;
				} else throw new UnexpectedToken("Unexpected token. Expected , or > here.", cur);
			}
			return new Deconstruct(name, inner);
		}
	} else {
		return new Variable(name);
	}
}

function parseExpression(tokens) {
	if (tokens.length === 0) throw new CompileError("Expected expression here.", tokens.after);
	const first = tokens.next();
	if (first.type !== TokenType.IDENT) throw new UnexpectedToken("Unexpected token. Expected variable or type construction.", first);
	const name = first.data;
	let obj;
	if (tokens.length > 0 && tokens.peek().type === TokenType.OPEN_ANGLE) {
		tokens.next();
		if (tokens.length === 0) throw new CompileError("Expected variable, construction, or > here.", tokens.after);
		if (tokens.peek().type === TokenType.CLOSE_ANGLE) {
			tokens.next();
			obj = new Constructor(name, []);
		} else {
			const inner = [parseExpression(tokens)];
			while (true) {
				if (tokens.length === 0) throw new CompileError("Expected , or > here.", tokens.after);
				const cur = tokens.next();
				if (cur.type === TokenType.COMMA) {
					if (tokens.length === 0) throw new CompileError("Expected a variable or construction here.", tokens.after);
					inner.push(parseExpression(tokens));
				} else if (cur.type === TokenType.CLOSE_ANGLE) {
					break;
				} else throw new UnexpectedToken("Unexpected token. Expected , or > here.", cur);
			}
			obj = new Constructor(name, inner);
		}
	} else {
		obj = new Variable(name);
	}
	while (tokens.length > 0 && tokens.peek().type === TokenType.ARROW) {
		tokens.next();
		if (tokens.length === 0) throw new CompileError("Expected type here.", tokens.after);
		const type = tokens.next();
		if (type.type !== TokenType.IDENT) throw new UnexpectedToken("Unexpected token. Expected type here.", type);
		obj = new Cast(obj, type.data);
	}
	return obj;
}

class Value {
	constructor(type, subvalues) {
		this.type = type;
		this.subvalues = subvalues; // List<&Value>
	}
	toString() {
		return this.type + "<" + this.subvalues.map(n => n.toString()).join(", ") + ">";	
	}
}

function runProgram(code, input) {
	clearConsole();
	try {
		const prog = parseProgram(tokenize(code));
		const bitstringIn = input.split('')
			.map(c => c.charCodeAt(0).toString(2))
			.map(n => n.padStart(Math.ceil(n.length/8)*8, '0').split(''))
			.flat().reverse();
		let inp = new Value("IO.null", []);
		for (const bit of bitstringIn) {
			if (bit === '0') inp = new Value("IO.0", [inp]);
			else inp = new Value("IO.1", [inp]);
		}
		let out = evalExpr(prog, new Cast(new Cast(new Value("IO", [inp]), "Main"), "IO"), {}).subvalues[0];
		let outputBuffer = "";
		while (out.type === "IO.1" || out.type === "IO.0") {
			if (out.type === "IO.1") outputBuffer += '1';
			else outputBuffer += '0';
			out = out.subvalues[0];
			if (outputBuffer.length >= 8) {
				const num = parseInt(outputBuffer, 2);
				outputBuffer = "";
				printMsg(String.fromCharCode(num));
			}
		}
	} catch(e) {
		printMsg(e + "");
	}
}

function evalExpr(prog, expr, vars) {
	//console.log(expr.toString());
	if (expr instanceof Value) {
		return expr;	
	} else if (expr instanceof Variable) {
		return vars[expr.name];
	} else if (expr instanceof Constructor) {
		return new Value(expr.type, expr.innerExpressions.map(n => evalExpr(prog, n, vars)));
	} else if (expr instanceof Cast) {
		const val = evalExpr(prog, expr.op, vars);
		let cs;
		if (prog.specific_casts[val.type]?.[expr.type])	cs = prog.specific_casts[val.type][expr.type];
		else if (prog.to_casts[expr.type]) cs = prog.to_casts[expr.type];
		else if (prog.from_casts[val.type]) cs = prog.from_casts[val.type];
		else throw new RuntimeError("Fatal: No cast found.");
		for (let c of cs) {
			const bindings = {};
			//console.log("Checking pattern: " + c.pattern.toString())
			const match = c.pattern.matches(val, bindings);
			if (match) {
				/////console.log("Matched! " + val.toString());
				//console.log(bindings);
				return evalExpr(prog, c.expression, bindings);
			}
		}
		throw new RuntimeError("Fatal: No cast found.");
	} else throw new RuntimeError("Fatal: Invalid operation attempted: " + expr);
}


var consoleBuffer = "";
var textBox;
var initialCode;

addEventListener('load', function() {
    textBox = document.getElementById("console");
	initialCode = document.getElementById("codebox").innerHTML;
});

function printMsg(m) {
	consoleBuffer += m;
	textBox.innerHTML = consoleBuffer.replaceAll("\n", "<br>");
}

function clearConsole() {
	consoleBuffer = "";
	textBox.innerHTML = "";
}

function runButton() {
    runProgram(document.getElementById("codebox").value, document.getElementById("inputbox").value)
}


window.addEventListener("beforeunload", function (e) {
    if (document.getElementById("codebox").value === initialCode) return;
    var confirmationMessage = 'Map data will be erased. Really leave?';
    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});