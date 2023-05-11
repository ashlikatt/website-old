class RuntimeError extends Error {
	constructor(s) {
		super("Runtime Error: " + s)
	}
}
class CompileError extends Error {
	constructor(s, v) {
		super("Compile Error: " + s + "\n At: line " + v.y + ", column " + v.x);
	}
}
class UnexpectedTokenError extends Error {
	constructor(text, token) {
		super("Unexpected token " + (token.type === TokenType.IDENTIFIER ? token.data : token.type) + ". Expected: " + text + ".\n At: line " + token.y + ", column " + token.x);
	}
}

const TokenType = {
    OPEN_ARRAY: 0,
    CLOSE_ARRAY: 1,
    OPEN_BLOCK: 2,
    CLOSE_BLOCK: 3,
    SEMICOLON: 4,
    EQUALS: 5,
    CONST_EQUALS: 6,
    RETURN: 7,
    FOR: 8,
    IDENTIFIER: 9
}
class Token {
    constructor(type, x, y, data) {
        this.type = type;
        this.data = data;
        this.x = x;
        this.y = y;
    }
    get after() {
        if (this.type === TokenType.CONST_EQUALS || this.type === TokenType.RETURN || this.type === TokenType.FOR) {
            return { x: this.x + 2, y : this.y };
        } else if (this.type === TokenType.IDENTIFIER) {
            return { x: this.x + this.data.length, y: this.y };
        } else {
            return { x: this.x + 1, y: this.y };
        }
    }
}
class TokenIterator {
    constructor() {
        this.inner = [];
        let nextVal = { x: 0, y: 1 }
    }
    push(v) {
        this.inner.push(v);
    }
    next() {
        const s = this.inner.shift();
        this.nextVal = s.after;
        return s;
    }
    peek(n = 0) {
        return this.inner[n];
    }
    get length() {
        return this.inner.length;
    }
    get x() {
        return this.nextVal.x;
    }
    get y() {
        return this.nextVal.y;
    }
}
function tokenize(str) {
    const out = new TokenIterator();
    let i = 0;
    let x = 0;
    let y = 1;
    while (i < str.length) {
        const char = str[i];
        if (char === '/' && str[i+1] === '/') { // Comments
            while (i < str.length && str[i] !== '\n') 
                i++;
            x = 0;
            continue;
        }
        else if (char === '[') out.push(new Token(TokenType.OPEN_ARRAY, x, y));
        else if (char === ']') out.push(new Token(TokenType.CLOSE_ARRAY, x, y));
        else if (char === '{') out.push(new Token(TokenType.OPEN_BLOCK, x, y));
        else if (char === '}') out.push(new Token(TokenType.CLOSE_BLOCK, x, y));
        else if (char === ';') out.push(new Token(TokenType.SEMICOLON, x, y));
        else if (identChar(char)) {
            let ident = "";
            while (i < str.length && identChar(str[i])) {
                ident += str[i++];
                x++;
            }
            if (ident === "=") out.push(new Token(TokenType.EQUALS, x, y)); 
            else if (ident === ":=") out.push(new Token(TokenType.CONST_EQUALS, x, y));
            else if (ident === "=>") out.push(new Token(TokenType.FOR, x, y));
            else if (ident === "->") out.push(new Token(TokenType.RETURN, x, y));
            else out.push(new Token(TokenType.IDENTIFIER, x, y, ident));
            continue; // Puts us one char after identifier; no need for the i++ later on.
        } else if (char === '\n' || char === '\r') {
            y ++;
            x = -1;
        }
        x++;
        i++;
    }
    return out;
}
function identChar(c) {
    return c!=='['&&c!==']'&&c!=='{'&&c!=='}'&&c!==';'&&!isWhitespace(c);
}
function isWhitespace(c) {
    return c === ' ' || c === '\n' || c === '\r';
}

class Func {
	constructor(x, y, name, param, code) {
		this.name = name;
		this.param = param;
		this.statement = code;
		this.x = x;
		this.y = y;
	}
}

class Codeblock {
	constructor(x, y, statements) {
		this.statements = statements;
		this.x = x;
		this.y = y;
	}
}

class Return {
	constructor(x, y, expression) {
		this.expression = expression;
		this.x = x;
		this.y = y;
	}
}

class ForEach {
	constructor(x, y, name, expression, code) {
		this.name = name;
		this.expression = expression;
		this.codeblock = code;
		this.x = x;
		this.y = y;
	}
}

class Assignment {
	constructor(x, y, name, val) {
		this.name = name;
		this.value = val;
		this.x = x;
		this.y = y;
	}
}

class ConstAssignment {
	constructor(x, y, name, val) {
		this.name = name;
		this.value = val;
		this.x = x;
		this.y = y;
	}
}

class VarReference {
	constructor(x, y, name) {
		this.name = name;
		this.x = x;
		this.y = y;
	}
}

class ArrayLiteral {
	constructor(x, y, arr) {
		this.arr = arr;
		this.x = x;
		this.y = y;
	}
}

class FunctionCall {
	constructor(x, y, name, val) {
		this.name = name;
		this.expression = val;
		this.x = x;
		this.y = y;
	}
}

function parse(tokens) {
	const decs = [];
	while (tokens.length > 0) {
		const dec = parseDeclaration(tokens);
		decs.push(dec);
	}
	return decs;
}

function parseExpression(tokens) {
	if (tokens.length < 1) throw new CompileError("Expected expression, found none.", tokens);
	const m = tokens.next();
	if (m.type === TokenType.IDENTIFIER) {
		if (tokens.length >= 1 && (tokens.peek().type === TokenType.IDENTIFIER || tokens.peek().type === TokenType.OPEN_ARRAY)) {
			const v = parseExpression(tokens);
			return new FunctionCall(m.x, m.y, m.data, v);
		} else {
			return new VarReference(m.x, m.y, m.data);
		}
	} else if (m.type === TokenType.OPEN_ARRAY) {
		const arr = [];
		if (tokens.length < 1) throw new CompileError("Unclosed array.", tokens);
		if (tokens.peek().type !== TokenType.CLOSE_ARRAY) {
			arr.push(parseExpression(tokens));
			while (tokens.length > 0 && tokens.peek().type !== TokenType.CLOSE_ARRAY) {
				parseSemi(tokens);
				arr.push(parseExpression(tokens));
			}
			if (tokens.length === 0) throw new CompileError("Unclosed array.", tokens);
		}
		tokens.next();
		return new ArrayLiteral(m.x, m.y, arr);
	} else throw new CompileError("Unexpected expression. Expected variable, function call, or array literal.", m);
}

function parseStatement(tokens) {
	if (tokens.length < 1) throw new CompileError("Expected statement, found none.", tokens);
	if (tokens.length >= 2 && tokens.peek(0).type === TokenType.IDENTIFIER) {
		if (tokens.peek(1).type === TokenType.IDENTIFIER || tokens.peek(1).type === TokenType.OPEN_ARRAY) {
			const e = parseExpression(tokens);
			parseSemi(tokens);
			return e;
		}
	}
	const first = tokens.next();
	if (first.type === TokenType.IDENTIFIER) { // Identifier, could be followed by =, :=, or =>
		if (tokens.length < 1) throw new CompileError("Expected =, :=, or =>, found none.", first.after);
		const second = tokens.next();
		if (second.type === TokenType.EQUALS) { // Assignment
			if (tokens.length < 1) throw new CompileError("Expected expression, found none.", second.after);
			const expr = parseExpression(tokens);
			parseSemi(tokens);
			return new Assignment(first.x, first.y, first.data, expr);
		} else if (second.type === TokenType.CONST_EQUALS) { // For loop or const assignment
			if (tokens.length < 1) throw new CompileError("Expected expression, found none.", second.after);
			const expr = parseExpression(tokens);
			if (tokens.length < 1) throw new CompileError("Expected => or ;, found none.", tokens);
			const third = tokens.next();
			if (third.type === TokenType.SEMICOLON) {
				return new ConstAssignment(first.x, first.y, first.data, expr);
			} else if (third.type === TokenType.FOR) {
				const code = parseStatement(tokens);
				return new ForEach(first.x, first.y, first.data, expr, code);
			} else throw new CompileError("Unexpected token, expected => or ;.", third);
		} else throw new CompileError("Unexpected token, expected = or :=.", second);
	} else if (first.type === TokenType.RETURN) {
		if (tokens.length < 1) throw new CompileError("Expected expression, found none.", first.after);
		const expr = parseExpression(tokens);
		parseSemi(tokens);
		return new Return(first.x, first.y, expr);
	} else if (first.type === TokenType.OPEN_BLOCK) {
		const statements = [];
		while (tokens.length > 0 && tokens.peek().type !== TokenType.CLOSE_BLOCK) {
			statements.push(parseStatement(tokens));
		}
		if (tokens.length === 0)
			throw new CompileError("Unclosed codeblock.", tokens);
		tokens.next();
		return new Codeblock(first.x, first.y, statements);
	} else throw new CompileError("Unexpected token, expected statement.", first)
}

function parseDeclaration(tokens) {
	if (tokens.length < 1) throw new CompileError("Expected identifier, found none.", tokens); 
	const first = tokens.next();
	if (tokens.length < 2) throw new CompileError("Expected identifier or assignment, found none.", tokens); 
	const second = tokens.next();
	if (first.type !== TokenType.IDENTIFIER) 
		throw new CompileError("Unexpected token, expected identifier.", first);

	if (second.type === TokenType.EQUALS) {
		if (tokens.length < 1) throw new CompileError("Expected expression.", tokens);
		const val = parseExpression(tokens);
		parseSemi(tokens);
		return new Assignment(first.x, first.y, first.data, val);
	} else if (second.type === TokenType.CONST_EQUALS) {
		if (tokens.length < 1) throw new CompileError("Expected expression.", tokens);
		const val = parseExpression(tokens);
		parseSemi(tokens);
		return new ConstAssignment(first.x, first.y, first.data, val);
	} else if (second.type === TokenType.IDENTIFIER) {
		const code = parseStatement(tokens);
		return new Func(first.x, first.y, first.data, second.data, code);
	} else {
		throw new CompileError("Expected =, :=, or identifier.", tokens);
	}
}

function parseSemi(tokens) {
	if (tokens.length < 1) throw new CompileError("Expected semicolon.", tokens);
	const n = tokens.next();
	if (n.type !== TokenType.SEMICOLON) throw new CompileError("Unexpected token, expected semicolon.", n);
}

function defaultFunctions() {
	return {
		"io.next": (interpreter, x) => {
			return interpreter.inputBuffer.length > 0 ? interpreter.inputBuffer.shift() : []; 
		},
		"io.bits": (interpreter, x) => {
			return interpreter.inputBuffer;
		},
		"io.out": (interpreter, x) => {
			interpreter.outputBuffer += x.length > 0 ? '1' : '0';
			if (interpreter.outputBuffer.length === 16) {
				const num = parseInt(interpreter.outputBuffer, 2);
				interpreter.outputBuffer = "";
				printMsg(String.fromCharCode(num));
			}
		},
		"io.debug": (interpreter, x) => {
			printMsg(JSON.stringify(x).replaceAll(',',';'));
		}
	};
}

class Context {
	constructor(other) {
		this.vars = {};
		this.constants = {};
		this.outer = other;
	}
	setVar(name, val) {
		if (this.outer && this.outer.hasVar(name)) {
			this.outer.setVar(name, val);
		} else this.vars[name] = val;
	}
	setConst(name, val) {
		if (this.constants[name]) throw new RuntimeError("Attempting to overwrite local constant " + name + ".");
		if (this.hasVar(name)) throw new RuntimeError("Creating constant with same name as var " + name + ".");
		this.constants[name] = val;
	}
	get(name) {
		if (this.vars[name]) return this.vars[name];
		else if (this.constants[name]) return this.constants[name];
		else if (this.outer !== undefined) return this.outer.get(name);
		else throw new RuntimeError(name + " is not a valid variable / constant.");
	}
	hasVar(name) {
		return this.outer?.hasVar(name) || this.vars[name];
	}
	evaluate(expr, interpreter) {
		interpreter.setError(expr);
		if (expr instanceof ArrayLiteral) {
			return expr.arr.map(n => this.evaluate(n, interpreter));
		} else if (expr instanceof FunctionCall) {
			return interpreter.callFunction(expr.name, this.evaluate(expr.expression, interpreter));
		} else if (expr instanceof VarReference) {
			const val = this.get(expr.name);
			if (val === undefined) throw new RuntimeError("Variable/Constant " + expr.name + " is not defined.");
			return val;
		}
		throw new RuntimeError("" + expr + " is not a valid expression.");
	}
}

class Interpreter {
	constructor(code) {
		this.code = code;
		this.functions = {};
		this.defaultFunctions = defaultFunctions();
		this.context = new Context(undefined);
		this.errorX = 0;
		this.errorY = 0;
		this.inputBuffer = [];
		this.outputBuffer = "";
	}
	
	build() {
		const ex = parse(tokenize(this.code));
		this.functions = {};
		this.defaultFunctions = defaultFunctions();
		this.context = new Context(undefined);
		this.errorX = 0;
		this.errorY = 0;
		this.inputBuffer = [];
		this.outputBuffer = "";
		for (const b of ex) {
			if (b instanceof Assignment) {
				this.context.setVar(b.name, this.context.evaluate(b.value, this));
			} else if (b instanceof ConstAssignment) {
				this.context.setConst(b.name, this.context.evaluate(b.value, this));
			} else if (b instanceof Func) {
				if(this.functions[b.name]) throw new CompileError("Duplicate function " + b.name, b);
				if(this.defaultFunctions[b.name]) throw new CompileError("Cannot overwrite std function " + b.name, b);
				this.functions[b.name] = b;
			}
		}
	}
	
	setError(e) {
		this.errorX = e.x;
		this.errorY = e.y;
	}
	
	interpret(input = "") {
		this.inputBuffer = input.split('')
			.map(c => c.charCodeAt(0).toString(2))
			.map(n => n.padStart(Math.ceil(n.length/16)*16, '0').split(''))
			.flat()
			.map(n => n === "0" ? [] : [[]]);
		this.outputBuffer = "";
		if (this.functions["main"]) {
			this.setError(this.functions["main"]);
			const out = this.callFunction("main", input);
		} else {
			printMsg("(No main function)");
		}
	}
	
	callFunction(name, val) {
		if (!this.functions[name]) {
			if (this.defaultFunctions[name]) {
				const out = this.defaultFunctions[name](this, val);
				return out !== undefined ? out : [];
			} else throw new RuntimeError("Function " + name + " does not exist.");
		} 
		const f = this.functions[name];
		const c = new Context(this.context);
		c.setConst(f.param, val);
		const out = this.evalCode(f.statement, c);
		return out !== undefined ? out : [];
	}
	
	evalCode(statement, context) {
		this.setError(statement);
		if (statement instanceof Codeblock) {
			for (const code of statement.statements) {
				this.setError(code);
				const o = this.evalCode(code, context);
				if (o !== undefined) return o;
			}
		} else if (statement instanceof Assignment) {
			context.setVar(statement.name, context.evaluate(statement.value, this));
		} else if (statement instanceof ConstAssignment) {
			context.setConst(statement.name, context.evaluate(statement.value, this));
		} else if (statement instanceof ForEach) {
			for (const n of context.evaluate(statement.expression, this)) {
				this.setError(statement);
				let nc = new Context(context);
				nc.setConst(statement.name, n);
				this.setError(statement.codeblock);
				const out = this.evalCode(statement.codeblock, nc);
				if (out !== undefined) return out;
			}
		} else if (statement instanceof Return) {
			return context.evaluate(statement.expression, this);
		} else if (statement instanceof FunctionCall) {
			this.callFunction(statement.name, context.evaluate(statement.expression, this));
		}
	}
}

function runForeach(str, input) {
	const i = new Interpreter(str);
	clearConsole();
	try {
		i.build();
		i.interpret(input);
	} catch(e) {
		if (e instanceof CompileError || e instanceof UnexpectedTokenError) {
			printMsg(e + "");
		} else if (e instanceof RuntimeError) {
			printMsg(e + "\n At: line " + i.errorY + ", column " + i.errorX + ".");
		} else throw e;
	}
}

var consoleBuffer = "";
var textBox;
var initialCode;

addEventListener('load', function() {
    textBox = document.getElementById("console");
	initialCode = document.getElementById("codebox").value;
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
    runForeach(document.getElementById("codebox").value, document.getElementById("inputbox").value)
}


window.addEventListener("beforeunload", function (e) {
    if (document.getElementById("codebox").value === initialCode) return;
    var confirmationMessage = 'Map data will be erased. Really leave?';
    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});