/**
 * Called when the user clicks the Run button
 */
function runButton() {
    const templates = compile(document.getElementById("codebox").value)

    if (templates === undefined) {
        return;
    }

    for (let template of templates) {
        const templateData = JSON.stringify({
            author: "Generated",
            name: "DFON",
            version: 1,
            code: template
        });
        
        const nbt = `{PublicBukkitValues:{"hypercube:codetemplatedata":'${templateData}'}}`
        const command = "/give @p ender_chest" + nbt; // There is realistically no risk of these commands exceeding the char cap in command blocks

        printMsg(command + "\n")
    }

}

/**
 * Called when the user clicks the recode button
 */
async function recodeButton() {
    const templates = compile(document.getElementById("codebox").value)

    if (templates === undefined) {
        return;
    }

    const ws = new WebSocket("ws://localhost:31371");

    ws.addEventListener('open', async _ => {
        let i = 0;
        for (let template of templates) {
            i++;
    
            const templateData = JSON.stringify({
                author: "Generated",
                name: "DFON",
                version: 1,
                code: template
            });
        
            const packet = JSON.stringify({
                source: "Ashli's Site",
                type: "nbt",
                data: `{id:"minecraft:ender_chest",Count:1,tag:{PublicBukkitValues:{"hypercube:codetemplatedata":'${templateData}'}}}`
            });
            
    
            printMsg(`Sending ${i} of ${templates.length}\n`)
            ws.send(packet);
            
            await new Promise(r => setTimeout(r, 100));
        }
        printMsg("Done!\n")

        ws.close()
    })

}

// Compiles DFON and returns a list of compressed template data
function compile(code) {
    clearConsole();
    try {
        return compileObject(parse(tokenize(code)), getSize());
    } catch (e) {
        if (e instanceof CompileError) {
            printMsg("Failed to compile: \n")
            printMsg(e.message)
            const codebox = document.getElementById('codebox');
            codebox.focus()
            codebox.selectionStart = codebox.selectionEnd = e.position

        } else {
            printMsg("Internal error, contact Ashli: \n")
            printMsg(e.message)
            throw e;
        }
    }
}

function getSize() {
    const option = document.querySelector('input[name="plotSize"]:checked').value;
    return {
        "basicPlot": 25,
        "largePlot": 50,
        "massivePlot": 150
    }[option] ?? 25;
}

var initialCode;

const autoComplete = {
    "{": "}",
    "[": "]",
    "<": ">",
    "(": ")",
}

// This converts tabs into spaces among other things https://stackoverflow.com/questions/6637341/use-tab-to-indent-in-textarea
addEventListener("load", function (e) {
    initialCode = document.getElementById("codebox").value

    document.getElementById('codebox').addEventListener('keydown', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;

        // Tab indents four spaces
        if (e.key == 'Tab') {
            e.preventDefault();
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end)
      
            this.selectionStart = this.selectionEnd = start + 4;
            return  
        }
        
        // Autocomplete brackets
        if (autoComplete[e.key] !== undefined) {
            const complete = autoComplete[e.key]

            e.preventDefault();
            if (this.selectionStart === this.selectionEnd) {
                this.value = this.value.substring(0, start) + e.key + complete + this.value.substring(end)
                this.selectionStart = this.selectionEnd = start + 1;
            } else {
                this.value = this.value.substring(0, start) + e.key + this.value.substring(start, end) + complete + this.value.substring(end)
                this.selectionStart = start + 1;
                this.selectionEnd = end + 1;
            }
            return
        }

        // Enter
        if (e.key == "Enter" && this.selectionStart === this.selectionEnd) {
            const before = this.value.substring(0, start)
            
            const trimmed = before.trimEnd()
            const finalChar = trimmed.charAt(trimmed.length - 1)

            e.preventDefault();
            const after = this.value.substring(end)
            const lines = before.split("\n")
            const finalLine = lines[lines.length - 1]

            if (finalChar === '{' || finalChar === '[' || finalChar === '(' || finalChar === '<') {
                const indentAmount = finalLine.length - finalLine.trimLeft().length + 4

                this.value = before + "\n" + " ".repeat(indentAmount) + "\n" + " ".repeat(indentAmount - 4) + after
                this.selectionStart = this.selectionEnd = start + 1 + indentAmount
            } else {
                const indentAmount = finalLine.length - finalLine.trimLeft().length

                this.value = before + "\n" + " ".repeat(indentAmount) + after
                this.selectionStart = this.selectionEnd = start + 1 + indentAmount
            }

            

            return
        }
    });
})

// Confirm leaving page
addEventListener("beforeunload", function (e) {
    if (document.getElementById("codebox").value === initialCode) return;
    var confirmationMessage = 'DFON code will be erased. Really leave?';
    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});

// Download file when Ctrl+S is run
addEventListener("keydown", function (e) {
	if (e.ctrlKey && e.key === 's') {
		e.preventDefault();
		download("code.dfon", document.getElementById("codebox").value);
	}
});

// Download file helper
function download(filename, text) {
	let e = document.createElement('a');
	e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	e.setAttribute('download', filename);
	e.style.display = 'none';
	document.body.appendChild(e);
	e.click();
	document.body.removeChild(e);
}

var consoleBuffer = "";

function printMsg(m) {
	consoleBuffer += m;
	document.getElementById('console').innerHTML = consoleBuffer.replaceAll("\n", "<br>");
}

function clearConsole() {
	consoleBuffer = "";
	document.getElementById('console').innerHTML = "";
}