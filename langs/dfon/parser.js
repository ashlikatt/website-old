class TokenIterator {
    constructor(tokens) {
        this.tokens = tokens;
        this.currentIndex = 0;
    }

    /**
     * @returns {Token}
     */
    peek(n = 0) {
        return this.tokens[this.currentIndex + n]
    }

    /**
     * @returns {Token}
     */
    next() {
        const char = this.peek()
        this.currentIndex++
        return char
    }

    /**
     * @returns {Token}
     */
    requireNext(type, override = undefined) {
        let n = this.next();
        if (n.type != type) {
            n.err(`Expected ${override ?? ReverseTokenMap[type]} but found ${ReverseTokenMap[n.type]}`)
        }
        return n;
    }

    /**
     * @returns {boolean}
     */
    peekIs(type, n = 0) {
        if (this.hasNext(n)) return this.peek(n).type === type;
        else return false
    }

    /**
     * @returns {boolean}
     */
    peekIsNot(type, n = 0) {
        if (this.hasNext(n)) return this.peek(n).type !== type;
        else return false
    }

    /**
     * @returns {boolean}
     */
    hasNext(n = 0) {
        return this.currentIndex + n < this.tokens.length
    }
}

class MacroBody {
    constructor(parameters, dfValue) {
        this.parameters = parameters;
        this.dfValue = dfValue;
    }
}

class DFObjectNode { constructor(n, m, loc) { this.keys = n; this.vals = m; this.loc = loc; } } // {a: 2, b: 3}
class DFListNode { constructor(n, loc) { this.data = n; this.loc = loc; } } // [2, 3]
class DFStringNode { constructor(n, loc) { this.data = n; this.loc = loc; } } // "string"
class DFTextNode { constructor(n, loc) { this.data = n; this.loc = loc; } } // T"<#FFFFFF>text"
class DFNumberNode { constructor(n, loc) { this.data = n; this.loc = loc; } } // 1.0, 0xFF, etc
class DFLocationNode { constructor(x, y, z, P, Y, loc) { this.x=x;this.y=y;this.z=z;this.pitch=P;this.yaw=Y; this.loc = loc; } } // (255, 255, 255, 0, 0)
class DFVectorNode { constructor(x, y, z, loc) { this.x=x;this.y=y;this.z=z; this.loc = loc; } } // <1, 0, 0>
class MacroDefNode { constructor(name, args, value, loc) { this.name=name; this.args=args; this.value=value; this.loc = loc; } }
class MacroCallNode { constructor(name, args, loc) { this.name=name; this.args=args; this.loc = loc; } }
class VarRefNode { constructor(name, loc) { this.name=name; this.loc = loc; } }
class DFSoundNode { constructor(n, loc) { this.data = n; this.loc = loc; } } // unimplemented
class DFParticleNode { constructor(n, loc) { this.data = n; this.loc = loc; } } // unimplemented
class DFPotionNode { constructor(n, loc) { this.data = n; this.loc = loc; } } // unimplemented
// No Game Value should be used! Ever!

function parse(list) {
    let iter = new TokenIterator(list)
    let context = parseContext(iter)
    let mainObject = parseObject(iter)

    return parseAST(mainObject, context, {});
}

/**
 * Parses macros
 * @param {TokenIterator} iter 
 */
function parseContext(iter) {
    let context = {}

    // While macros are left
    while (iter.hasNext() && iter.peek().type === TokenType.MACRO) {
        iter.next() // Skip "macro"
        let macroName = iter.requireNext(TokenType.IDENTIFIER, "macro name")
        let params = []

        iter.requireNext(TokenType.OPEN_PAREN, "macro parameter list (open paren)")
        while (iter.hasNext() && iter.peek().type !== TokenType.CLOSE_PAREN) {
            let paramName = iter.requireNext(TokenType.IDENTIFIER, "parameter name (identifier)");

            if (params.includes(paramName.data)) {
                paramName.err("Duplicate macro parameter '" + paramName.data + "'.")
            }

            params.push(paramName.data)
            
            if (iter.peekIs(TokenType.COMMA)) {
                iter.next()
            } else break
        }
        iter.requireNext(TokenType.CLOSE_PAREN, "end of macro parameter list (close paren)")
        iter.requireNext(TokenType.EQUALS, "macro body (equals)")
        let val = parseValue(iter);
        
        context[macroName.data] = new MacroDefNode(macroName.data, params, val, macroName.loc())
    }

    return context;
}

/**
 * @param {TokenIterator} iter 
 */
function parseObject(iter) {
    let pos = iter.requireNext(TokenType.OPEN_BRACE)

    let obj = new DFObjectNode([], [], pos.loc());

    while (iter.hasNext() && iter.peek().type !== TokenType.CLOSE_BRACE) {
        obj.keys.push(parseValue(iter))

        iter.requireNext(TokenType.COLON)

        obj.vals.push(parseValue(iter))

        if (iter.peekIs(TokenType.COMMA)) {
            iter.next()
        } else break
    }

    iter.requireNext(TokenType.CLOSE_BRACE, "end of object (close brace) or comma")
    return obj;
}

/**
 * @param {TokenIterator} iter 
 */
function parseList(iter) {
    let pos = iter.requireNext(TokenType.OPEN_BRACKET)
    let list = new DFListNode([], pos.loc());

    while (iter.hasNext() && iter.peek().type !== TokenType.CLOSE_BRACKET) {
        list.data.push(parseValue(iter))
        
        if (iter.peekIs(TokenType.COMMA)) {
            iter.next()
        } else break
    }

    iter.requireNext(TokenType.CLOSE_BRACKET, "end of list (close bracket) or comma")
    return list;
}

/**
 * @param {TokenIterator} iter 
 */
function parseLocation(iter) {
    let startToken = iter.requireNext(TokenType.OPEN_PAREN)
    const x = parseValue(iter)
    iter.requireNext(TokenType.COMMA)
    const y = parseValue(iter)
    iter.requireNext(TokenType.COMMA)
    const z = parseValue(iter)

    let pitch = 0;
    let yaw = 0;

    if (iter.peekIs(TokenType.COMMA) && iter.peekIsNot(TokenType.CLOSE_PAREN, 1)) {
        iter.next();
        pitch = parseValue(iter)
        iter.requireNext(TokenType.COMMA)
        yaw = parseValue(iter)
    }

    if (iter.peek().type === TokenType.COMMA) iter.next();

    iter.requireNext(TokenType.CLOSE_PAREN, "end of location (close parenthesis)")

    return new DFLocationNode(x, y, z, pitch, yaw, startToken.loc())
}

/**
 * @param {TokenIterator} iter 
 */
function parseVector(iter) {
    let startToken = iter.requireNext(TokenType.OPEN_ANGLE)
    const x = parseValue(iter)
    iter.requireNext(TokenType.COMMA)
    const y = parseValue(iter)
    iter.requireNext(TokenType.COMMA)
    const z = parseValue(iter)


    if (iter.peek().type === TokenType.COMMA) iter.next();
    iter.requireNext(TokenType.CLOSE_ANGLE, "end of vector (close angle bracket)")

    return new DFVectorNode(x, y, z, startToken.loc())
}

/**
 * @param {TokenIterator} iter 
 */
function parseValue(iter) {
    let peeked = iter.peek().type

    if (peeked === TokenType.OPEN_BRACE) {
        return parseObject(iter)
    } else if (peeked === TokenType.OPEN_BRACKET) {
        return parseList(iter)
    } else if (peeked === TokenType.OPEN_PAREN) {
        return parseLocation(iter)
    } else if (peeked === TokenType.OPEN_ANGLE) {
        return parseVector(iter)
    } else if (peeked === TokenType.STRING) {
        let tok = iter.next();
        return new DFStringNode(tok.data, tok.loc())
    } else if (peeked === TokenType.TEXT) {
        let tok = iter.next();
        return new DFTextNode(tok.data, tok.loc())
    } else if (peeked === TokenType.NUMBER) {
        let tok = iter.next();
        return new DFNumberNode(tok.data, tok.loc())
    } else if (peeked === TokenType.IDENTIFIER) {
        let tok = iter.next();
        let ident = tok.data;

        if (iter.peek().type === TokenType.OPEN_PAREN) {
            iter.next();
            let args = []
    
            while (iter.hasNext() && iter.peek().type !== TokenType.CLOSE_PAREN) {
                args.push(parseValue(iter))

                if (iter.peekIs(TokenType.COMMA)) {
                    iter.next()
                } else break
            }
    
            iter.requireNext(TokenType.CLOSE_PAREN, "end of macro call arguments (close paren)")
    
            return new MacroCallNode(ident, args, tok.loc());
        } else {
            return new VarRefNode(ident, tok.loc());
        }
    } else {
        iter.peek().err("expected value, found " + ReverseTokenMap[peeked])
    }
}