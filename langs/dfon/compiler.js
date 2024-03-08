class SetVarBlock {
    constructor(name, args) {
        this.name = name;
        this.args = args;
    }

    toJSON() {
        return {
            id: "block", 
            block: "set_var", 
            args: {
                items: this.args.map((x, i) => { 
                    return {slot: i, item: x}
                })
            },
            action: this.name
        }
    }
}
// Compresses JSON data
const compress = s => btoa(String.fromCharCode.apply(null, [...new Uint16Array(pako.gzip(s))]))

const beginTemplateBlock = {
    "id": "block",
    "block": "process",
    "args": {
        "items":[
            {"item":{"id":"item","data":{"item":"{Count:1b,DF_NBT:3700,id:\"minecraft:emerald_block\",tag:{Enchantments:[{id:\"minecraft:lure\",lvl:1s}],HideFlags:1,display:{Lore:['{\"bold\":false,\"italic\":false,\"underlined\":false,\"strikethrough\":false,\"obfuscated\":false,\"color\":\"white\",\"extra\":[{\"color\":\"gray\",\"text\":\"Call once on plot startup\"}],\"text\":\"\"}','{\"bold\":false,\"italic\":false,\"underlined\":false,\"strikethrough\":false,\"obfuscated\":false,\"color\":\"white\",\"extra\":[{\"color\":\"gray\",\"text\":\"to load data.\"}],\"text\":\"\"}']}}}"}},"slot":0},
            {"item":{"id":"bl_tag","data":{"option":"False","tag":"Is Hidden","action":"dynamic","block":"process"}},"slot":26}
        ]
    },
    "data": "ConstPlotData"
}

class CompileData {
    constructor() {
        this.blocks = []; // List of blocks to compile to
        this.tempVarID = 0; // Temporary variable index
        this.dictKeyMap = {} // Any time a dictionary has keys, cache the keys variable for possible later use
    }

    /**
     * Returns an object representing an "item" that goes in a chest.
     * It may also add "blocks" to the block pool, which are any pre-requisite codeblocks that need to be run before the value item is usable.
     */
    addValue(value) {
        if (value instanceof DFVector) {
            return {id: "vec", data: { x: value.x, y: value.y, z: value.z}}

        } else if (value instanceof DFLocation) {
            return {id: "loc", data: { isBlock: false, loc: {x: value.x, y: value.y, z: value.z, pitch: value.pitch, yaw: value.yaw}}}

        } else if (value instanceof DFString) {
            return {id: "txt", data: { name: value.data }}

        } else if (value instanceof DFText) {
            return {id: "comp", data: { name: value.data }}

        } else if (value instanceof DFNumber) {
            return {id: "num", data: { name: `${value.data}` }}

        } else if (value instanceof DFList) {
            return this.createList(value.data)

        } else if (value instanceof DFObject) {
            const entries = Object.entries(value.data)
            const tempVar = this.allocateVar()
            if (entries.length < 3) { // Create, Set, Set is the smallest before lists are better
                this.newBlock("CreateDict", [tempVar])
                for (const entry of entries) {
                    this.newBlock("SetDictValue", [tempVar, this.addValue(new DFString(entry[0])), this.addValue(entry[1])])
                }
            } else {
                const keysIdentifier = JSON.stringify(entries.map(x => x[0]))

                if (!this.dictKeyMap.hasOwnProperty(keysIdentifier)) {
                    const keys = entries.map(x => new DFString(x[0]))
                    const keyList = this.createList(keys)
                    this.dictKeyMap[keysIdentifier] = keyList;
                }

                const values = entries.map(x => x[1])
                const valueList = this.createList(values)
                this.newBlock("CreateDict", [tempVar, this.dictKeyMap[keysIdentifier], valueList])
            }
            return tempVar;

        } else {
            console.log(value)
            throw Error("CONTACT ASHLI - COMPILE FAIL INCORRECT DATA ATTEMPTED TO ADD " + value)
        }
    }

    allocateVar() {
        return {id: "var", data: {name: `temp${this.tempVarID++}`, scope: "local"}}
    }

    createList(listOfElements) {
        const elements = listOfElements.map(x => this.addValue(x))
        const tempVar = this.allocateVar()
        const initialElements = elements.slice(0, 26)
        this.newBlock("CreateList", [tempVar, ...initialElements])

        let currentIndex = 26;
        while(currentIndex < elements.length) {
            const nextElements = elements.slice(currentIndex, currentIndex + 26)
            this.newBlock("AppendValue", [tempVar, ...nextElements])
            currentIndex += 26
        }

        return tempVar;
    }

    newBlock(name, args) {
        this.blocks.push(new SetVarBlock(name, args))
    }

    toTemplates(size) {
        const MAX_SIZE_FOR_LINE = size - 2;

        const templates = []
        let currentLineNumber = 0;

        let currentIndex = 0;
        for (let i = 0; i < this.blocks.length; i += MAX_SIZE_FOR_LINE) {
            const lineBlocks = this.blocks.slice(i, i + MAX_SIZE_FOR_LINE)

            let header = currentLineNumber === 0 ? beginTemplateBlock : {
                id: "block", 
                block: "func", 
                args:{items: [{
                    item: {id: "bl_tag", data: {option: "True", tag: "Is Hidden", action: "dynamic", block: "func"}}, slot: 26}
                ]}, 
                data: "ConstPlotData" + currentLineNumber
            };

            const blockList = [header, ...lineBlocks.map(x => x.toJSON())]

            if (i + MAX_SIZE_FOR_LINE < this.blocks.length) {
                blockList.push({id: "block", block: "call_func", args: {items: []}, data: "ConstPlotData" + (currentLineNumber + 1)})
            }

            const lineData = compress(JSON.stringify({ blocks: blockList }))
            templates.push(lineData)
            currentLineNumber++
        }

        return templates
    }
}

/**
 * @param {DFObject} object 
 */
function compileObject(object, size) {
    const data = new CompileData();
    const entries = Object.entries(object.data)
    for (const entry of entries) {
        const value = entry[1];
        if (value instanceof DFList || value instanceof DFObject) {
            const ref = data.addValue(entry[1])
            // Simply hook into the final var creation and change its name and scope
            ref.data.name = entry[0]
            ref.data.scope = "unsaved"
        } else {
            data.newBlock("=", [{id: "var", data: {name: entry[0], scope: "unsaved"}}, data.addValue(entry[1])])
        }
    }

    return data.toTemplates(size)
}
