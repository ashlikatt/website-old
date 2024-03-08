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

class DFObject { constructor(n) { this.data = n } } // {a: 2, b: 3}
class DFList { constructor(n) { this.data = n } } // [2, 3]
class DFString { constructor(n) { this.data = n } } // "string"
class DFText { constructor(n) { this.data = n } } // T"<#FFFFFF>text"
class DFNumber { constructor(n) { this.data = n } } // 1.0, 0xFF, etc
class DFLocation { constructor(x, y, z, P, Y) { this.x=x;this.y=y;this.z=z;this.pitch=P;this.yaw=Y; } } // (255, 255, 255, 0, 0)
class DFVector { constructor(x, y, z) { this.x=x;this.y=y;this.z=z; } } // <1, 0, 0>
class DFSound { constructor(n) { this.data = n } } // unimplemented
class DFParticle { constructor(n) { this.data = n } } // unimplemented
class DFPotion { constructor(n) { this.data = n } } // unimplemented
// No Game Value should be used! Ever!

function parse(list) {
    let iter = new TokenIterator(list)
    let mainObject = parseObject(iter)

    return mainObject;
}

/**
 * @param {TokenIterator} iter 
 */
function parseObject(iter) {
    iter.requireNext(TokenType.OPEN_BRACE)

    let obj = new DFObject({});

    while (iter.hasNext() && iter.peek().type !== TokenType.CLOSE_BRACE) {
        const keyElement = iter.next()

        if (keyElement.type !== TokenType.IDENTIFIER && keyElement.type !== TokenType.STRING) {
            keyElement.err("Object keys can only be identifiers or strings.");
        }

        if (obj.data[keyElement.data] !== undefined) {
            keyElement.err("Duplicate object key '" + keyElement.data + "'.")
        }

        iter.requireNext(TokenType.COLON)

        obj.data[keyElement.data] = parseValue(iter)

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
    iter.requireNext(TokenType.OPEN_BRACKET)
    let list = new DFList([]);

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
    iter.requireNext(TokenType.OPEN_PAREN)
    const x = iter.requireNext(TokenType.NUMBER, "location X value").data
    iter.requireNext(TokenType.COMMA)
    const y = iter.requireNext(TokenType.NUMBER, "location Y value").data
    iter.requireNext(TokenType.COMMA)
    const z = iter.requireNext(TokenType.NUMBER, "location Z value").data

    let pitch = 0;
    let yaw = 0;

    if (iter.peekIs(TokenType.COMMA) && iter.peekIs(TokenType.NUMBER, 1)) {
        iter.next();
        pitch = iter.requireNext(TokenType.NUMBER, "location pitch").data
        iter.requireNext(TokenType.COMMA)
        yaw = iter.requireNext(TokenType.NUMBER, "location yaw").data
    }

    if (iter.peek().type === TokenType.COMMA) iter.next();

    iter.requireNext(TokenType.CLOSE_PAREN, "end of location (close parenthesis)")

    return new DFLocation(x, y, z, pitch, yaw)
}

/**
 * @param {TokenIterator} iter 
 */
function parseVector(iter) {
    iter.requireNext(TokenType.OPEN_ANGLE)
    const x = iter.requireNext(TokenType.NUMBER, "vector X component").data
    iter.requireNext(TokenType.COMMA)
    const y = iter.requireNext(TokenType.NUMBER, "vector Y component").data
    iter.requireNext(TokenType.COMMA)
    const z = iter.requireNext(TokenType.NUMBER, "vector Z component").data


    if (iter.peek().type === TokenType.COMMA) iter.next();
    iter.requireNext(TokenType.CLOSE_ANGLE, "end of vector (close angle bracket)")

    return new DFVector(x, y, z)
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
        return new DFString(iter.next().data)
    } else if (peeked === TokenType.TEXT) {
        return new DFText(iter.next().data)
    } else if (peeked === TokenType.NUMBER) {
        return new DFNumber(iter.next().data)
    }
}