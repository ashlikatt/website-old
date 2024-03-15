class DFObject { constructor(n) { this.data = n } } // {a: 2, b: 3}
class DFList { constructor(n) { this.data = n } } // [2, 3]
class DFString { constructor(n) { this.data = n } } // "string"
class DFText { constructor(n) { this.data = n } } // T"<#FFFFFF>text"
class DFNumber { constructor(n) { this.data = n } } // 1.0, 0xFF, etc
class DFLocation { constructor(x, y, z, P, Y) { this.x=x;this.y=y;this.z=z;this.pitch=P;this.yaw=Y; } } // (255, 255, 255, 0, 0)
class DFVector { constructor(x, y, z) { this.x=x;this.y=y;this.z=z; } } // <1, 0, 0>

const locStack = []

function parseAST(node, macros, vars) {
    locStack.length = 0 // Clear array
    return parseTreeToAST(node, macros, vars)
}

function parseTreeToAST(node, macros, vars) {
    locStack.push(node.loc)

    if (node instanceof DFVectorNode) {
        let x = parseTreeToAST(node.x, macros, vars)
        let y = parseTreeToAST(node.y, macros, vars)
        let z = parseTreeToAST(node.z, macros, vars)

        if (!(x instanceof DFNumber)) throwASTError("Expected number here, found " + getNodeName(x) + ".")
        if (!(y instanceof DFNumber)) throwASTError("Expected number here, found " + getNodeName(y) + ".")
        if (!(z instanceof DFNumber)) throwASTError("Expected number here, found " + getNodeName(z) + ".")

        locStack.pop()
        return new DFVector(x.data, y.data, z.data)

    } else if (node instanceof DFLocationNode) {
        let x = parseTreeToAST(node.x, macros, vars)
        let y = parseTreeToAST(node.y, macros, vars)
        let z = parseTreeToAST(node.z, macros, vars)
        let pitch = node.pitch != 0 ? parseTreeToAST(node.pitch, macros, vars) : new DFNumber(0)
        let yaw = node.yaw != 0 ? parseTreeToAST(node.yaw, macros, vars) : new DFNumber(0)

        if (!(x instanceof DFNumber)) throwASTError("Expected number here, found " + getNodeName(x) + ".")
        if (!(y instanceof DFNumber)) throwASTError("Expected number here, found " + getNodeName(y) + ".")
        if (!(z instanceof DFNumber)) throwASTError("Expected number here, found " + getNodeName(z) + ".")
        if (!(pitch instanceof DFNumber)) throwASTError(node.pitch.loc, "Expected number here, found " + getNodeName(pitch) + ".")
        if (!(yaw instanceof DFNumber)) throwASTError(node.yaw.loc, "Expected number here, found " + getNodeName(yaw) + ".")

        locStack.pop()
        return new DFLocation(x.data, y.data, z.data, pitch.data, yaw.data)

    } else if (node instanceof DFNumberNode) {
        locStack.pop()
        return new DFNumber(node.data)

    } else if (node instanceof DFStringNode) {
        locStack.pop()
        return new DFString(node.data)

    } else if (node instanceof DFTextNode) {
        locStack.pop()
        return new DFText(node.data)

    } else if (node instanceof DFListNode) {
        let listData = []

        node.data.forEach(x => {
            listData.push(parseTreeToAST(x, macros, vars))
        })

        locStack.pop()
        return new DFList(listData)

    } else if (node instanceof DFObjectNode) {
        let objData = {}

        for (let i = 0; i < node.keys.length; i++) {
            const nodeKey = node.keys[i]

            let keyVal;
            if (nodeKey instanceof VarRefNode && vars[nodeKey.name] == undefined) {
                keyVal = nodeKey.name
            } else {
                let key = parseTreeToAST(nodeKey, macros, vars)

                if (!(key instanceof DFString)) {
                    throwASTError("Only strings can be dictionary keys.")
                }

                keyVal = key.data;
            }
         
            objData[keyVal] = parseTreeToAST(node.vals[i], macros, vars)
        }

        locStack.pop()
        return new DFObject(objData)

    } else if (node instanceof MacroCallNode) {
        let mac = macros[node.name];
        if (mac == undefined) throwASTError("Unknown macro " + node.name + " here.")
        
        if (node.args.length !== mac.args.length) {
            throwASTError("Incorrect number of arguments for macro " + node.name)
        }

        let args = {}
        for (let i = 0; i < node.args.length; i++) {
            args[mac.args[i]] = parseTreeToAST(node.args[i], macros, vars);
        }

        let out = parseTreeToAST(mac.value, macros, args)
        locStack.pop();
        return out;

    } else if (node instanceof VarRefNode) {
        let val = vars[node.name];

        if (val == undefined) throwASTError("Unknown variable " + node.name + " here.")

        let out = val
        locStack.pop()
        return out
    }

    throwASTError("Unexpected parse tree node encountered. Contact ashli.")
}

function throwASTError(supplement) {
    let str = supplement

    for (let loc of locStack) {
        str = str + `\nAt: line ${loc.line}, column ${loc.column}`
    }

    throw new CompileError(str, (locStack[0] ?? { sourceIndex: 0 }).sourceIndex)
}

function getNodeName(node) {
    if (node instanceof DFObject) return "object";
    else if (node instanceof DFList) return "list";
    else if (node instanceof DFString) return "string";
    else if (node instanceof DFText) return "text";
    else if (node instanceof DFNumber) return "number";
    else if (node instanceof DFLocation) return "location";
    else if (node instanceof DFVector) return "vector";
}