class CompileError extends Error {
    constructor(message, position) {
        super(message)
        this.position = position
    }
}

class StringIterator {
    /**
     * Iterates a string
     * @param {string} str 
     */
    constructor(str) {
        this.str = str;
        this.currentIndex = 0;
        this.column = 1;
        this.line = 1;
    }

    peek(n = 0) {
        return this.str.charAt(this.currentIndex + n)
    }

    next() {
        const char = this.peek()
        if (char === '\n') {
            this.line++
            this.column = 1
        } else {
            this.column += 1
        }
        this.currentIndex++
        return char
    }

    hasNext() {
        return this.currentIndex < this.str.length
    }

    err(supplement, position = this) {
        throw new CompileError(supplement + `\nAt: line ${position.line}, column ${position.column}`, position.currentIndex)
    }

    position() {
        return { line: this.line, column: this.column, currentIndex: this.currentIndex }
    }
}

const TokenType = {
    "OPEN_BRACE": 0,
    "CLOSE_BRACE": 1,
    "OPEN_BRACKET": 2,
    "CLOSE_BRACKET": 3,
    "COMMA": 4,
    "NUMBER": 5,
    "STRING": 6,
    "TEXT": 7,
    "IDENTIFIER": 8,
    "COLON": 9,
    "OPEN_PAREN": 10,
    "CLOSE_PAREN": 11,
    "OPEN_ANGLE": 12,
    "CLOSE_ANGLE": 13,
}

const ReverseTokenMap = [
    "OPEN_BRACE",
    "CLOSE_BRACE",
    "OPEN_BRACKET",
    "CLOSE_BRACKET",
    "COMMA",
    "NUMBER",
    "STRING",
    "TEXT",
    "IDENTIFIER",
    "COLON",
    "OPEN_PAREN",
    "CLOSE_PAREN",
    "OPEN_ANGLE",
    "CLOSE_ANGLE",
]

class Token {
    constructor(type, data = undefined) {
        this.type = type;
        this.data = data;
        this.column = undefined;
        this.line = undefined;
        this.sourceIndex = undefined;
    }

    toString() {
        return ReverseTokenMap[this.type] + (this.data === undefined ? "" : (" = " + this.data))
    }

    context(iter) {
        this.column = iter.column;
        this.line = iter.line;
        this.sourceIndex = iter.currentIndex;
        return this;
    }

    err(supplement) {
        throw new CompileError(supplement + `\nAt: line ${this.line}, column ${this.column}`, this.sourceIndex)
    }
}

const SINGLE_CHAR_TOKENS = {
    "{": TokenType.OPEN_BRACE,
    "}": TokenType.CLOSE_BRACE,
    "[": TokenType.OPEN_BRACKET,
    "]": TokenType.CLOSE_BRACKET,
    "(": TokenType.OPEN_PAREN,
    ")": TokenType.CLOSE_PAREN,
    ",": TokenType.COMMA,
    ":": TokenType.COLON,
    "<": TokenType.OPEN_ANGLE,
    ">": TokenType.CLOSE_ANGLE
}

/**
 * Returns a list of tokens
 * @param {string} source 
 * @returns {Token[]}
 */
function tokenize(source) {
    let tokens = []
    const iter = new StringIterator(source);

    while (iter.hasNext()) {
        // Ignore whitespace
        if (iter.peek() === ' ' || iter.peek() === '\t' || iter.peek() === '\n') {
            iter.next()
            continue
        }

        // Single line comment
        if (iter.peek() === '/' && iter.peek(1) === '/') {
            console.log("beginning comment")
            while (iter.hasNext() && iter.peek() !== '\n') {
                iter.next();
            }

            continue
        }

        // Multiline comments
        if (iter.peek() === '/' && iter.peek(1) === '*') {
            const commentStartPosition = iter.position()
            iter.next()
            iter.next()
            let validExit = false
            while (iter.hasNext()) {
                if (iter.hasNext(1) && iter.peek() === '*' && iter.peek(1) === '/') {
                    validExit = true
                    break
                }
                iter.next()
            }

            if (!validExit) {
                iter.err("Expected */ to end block comment", commentStartPosition)
            }

            continue
        }

        // Parse out single tokens
        if (SINGLE_CHAR_TOKENS[iter.peek()] !== undefined) {
            const tokenPosition = iter.position();
            tokens.push(new Token(SINGLE_CHAR_TOKENS[iter.next()]).context(tokenPosition))
            continue
        }

        // Parse strings
        if (iter.peek() === '"' || iter.peek() === "'") {
            const pos = iter.position()
            const delim = iter.peek()
            iter.next()
            tokens.push(new Token(TokenType.STRING, parseUntilDelimiter(iter, delim, pos)).context(pos))
            continue
        } 
        
        // Parse text
        if ((iter.peek() === 't' || iter.peek() === "T") && (iter.peek(1) === '"' || iter.peek(1) === "'")) {
            const pos = iter.position()
            iter.next()
            const delim = iter.peek()
            iter.next()
            tokens.push(new Token(TokenType.TEXT, parseUntilDelimiter(iter, delim, pos)).context(pos))
            continue
        } 

        // Parse identifiers
        if (iter.peek() === '_' || isAlphabetic(iter.peek())) {
            const tokenPosition = iter.position();
            let identifier = ""

            while (iter.hasNext() && (iter.peek() === '_' || isAlphabetic(iter.peek()))) {
                identifier += iter.next()
            }

            tokens.push(new Token(TokenType.IDENTIFIER, identifier).context(tokenPosition))
            continue
        } 
        
        // Parse - sign if one exists in preparation for numbers
        let sign = 1
        let signPosition = undefined
        if (iter.peek() === '-') {
            signPosition = iter.position()
            iter.next()
            sign = -1   
        }

        // Parse numbers that aren't base 10 (0 followed by a letter)
        if (iter.peek() === '0' && isAlphabetic(iter.peek(1))) {
            const numberPosition = signPosition ?? iter.position()
            iter.next() // Skip 0
            const baseChar = iter.next().toLowerCase();
            let base;

            if (baseChar === 'b') {
                base = "01".split('')
            } else if (baseChar === 'o') {
                base = "01234567".split('')
            } else if (baseChar === 'x') {
                base = "0123456789ABCDEF".split('')
            } else {
                iter.err(`Invalid base '${baseChar}'. Valid are 'b', 'o', and 'x'.`, numberPosition)
            }

            let hasCharacters = false;
            let value = 0;

            while (iter.hasNext()) {
                if (isAlphanumeric(iter.peek())) {
                    const nextChar = iter.next();
                    const digitIndex = base.indexOf(nextChar.toUpperCase())
                    if (digitIndex > -1) {
                        hasCharacters = true;
                        value *= base.length
                        value += digitIndex
                    } else {
                        iter.err(`Character ${nextChar} is not a valid digit for base ${base.length}.`, numberPosition)
                    }
                } else if (iter.peek() === '.') {
                    iter.err("Non-base10 numbers do not support decimals.", numberPosition)
                } else if (iter.peek() === '_') {
                    iter.next()
                } else {
                    break
                }
            }

            if (!hasCharacters) {
                iter.err(`Expected base-${base.length} number.`, numberPosition)
            }

            tokens.push(new Token(TokenType.NUMBER, sign * value).context(numberPosition))
            continue
        }

        // Parse the rest of the numbers
        if (iter.peek() == '.' || isNumeric(iter.peek())) {
            const numberPosition = signPosition ?? iter.position()
            const base = "0123456789".split('')
            let value = 0;
            let hasCharacters = false;

            if (isNumeric(iter.peek())) {
                while (iter.hasNext()) {
                    if (isAlphanumeric(iter.peek())) {
                        const nextChar = iter.next();
                        if (isNumeric(nextChar)) {
                            const digitIndex = base.indexOf(nextChar.toUpperCase())
                            hasCharacters = true;
                            value *= base.length
                            value += digitIndex
                        } else {
                            iter.err(`Character ${nextChar} is not a valid numerical digit.`, numberPosition)
                        }
                    } else if (iter.peek() === '_') {
                        iter.next()
                    } else {
                        break
                    }
                }
            }

            if (iter.peek() === '.') {
                iter.next()
                let position = 0.1
                hasCharacters = false

                while (iter.hasNext()) {
                    if (isAlphanumeric(iter.peek())) {
                        const nextChar = iter.next();
                        if (isNumeric(nextChar)) {
                            const digitIndex = base.indexOf(nextChar.toUpperCase())
                            hasCharacters = true;
                            value += digitIndex * position
                            position *= 0.1
                        } else {
                            iter.err(`Character ${nextChar} is not a valid digit.`, numberPosition)
                        }
                    } else if (iter.peek() === '_') {
                        iter.next()
                    } else {
                        break
                    }
                }

                if (!hasCharacters) {
                    iter.err("Decimal must contain digits.", numberPosition)
                }
            } else if (!hasCharacters) {
                iter.err("Number must contain digits.", numberPosition)
            }

            tokens.push(new Token(TokenType.NUMBER, sign * value).context(numberPosition))
            continue
        }

        if (sign === -1) {
            iter.err('Expected number after minus sign.', signPosition)
        }

        iter.err(`Unexpected character ${iter.peek()}`)
    }

    return tokens 
}

/**
 * Iterates through chars until a delimiter is reached
 * @param {StringIterator} iter 
 * @param {string} delimiterChar 
 */
function parseUntilDelimiter(iter, delimiterChar, pos) {
    let tokenValue = "";
    let escaped = false;
    let endedProperly = false;

    while (iter.hasNext()) {
        const strChar = iter.peek()

        if (escaped) {
            escaped = false;
            if      (strChar === "n") tokenValue += '\n'
            else if (strChar === "t") tokenValue += '\t'
            else if (strChar === "r") tokenValue += '\r'
            else if (strChar === "b") tokenValue += '\b'
            else if (strChar === "\\") tokenValue += '\\'
            else if (strChar === delimiterChar) tokenValue += delimiterChar
            else if (strChar === "\n") {
                iter.next()
                tokenValue += "\n"
            }
            else iter.err(`Invalid escape character '${strChar}'.`, pos)
        } else {
            if (strChar === "\\") {
                escaped = true
            } else if (strChar === "\n") {
                iter.err(`Newlines not allowed in strings or text. Escape the newline or use '\\n'.`, pos)
            } else if (strChar === delimiterChar) {
                endedProperly = true
                iter.next()
                break
            } else {
                tokenValue += strChar
            }
        }

        iter.next()
    }

    if (!endedProperly) {
        iter.err(`Unexpected end of string/text.`, pos)
    }

    return tokenValue
}

function isAlphabetic(char) {
    const code = char.charCodeAt(0)
    return (code > 64 && code < 91) || (code > 96 && code < 123)
}

function isAlphanumeric(char) {
    const code = char.charCodeAt(0)
    return (code > 64 && code < 91) || (code > 96 && code < 123) || (code > 47 && code < 58)
}

function isNumeric(char) {
    const code = char.charCodeAt(0)
    return (code > 47 && code < 58)
}