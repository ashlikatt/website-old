var number = 0;
var elem;

addEventListener('load', function() {
    elem = document.getElementById('numbers');
    if (elem) {
        elem.innerHTML = ""
        for (let i = 0; i < 2014; i++) newNumber();
        this.setInterval(newNumber, 10)
    }
});

function newNumber() {
    if (number === 2014) {
        const a = document.createElement("a")
        a.setAttribute("href", "/images")
        a.innerHTML = number++
        elem.append(a)
        elem.append(" ")
    } else {
        elem.append(`${number++} `)
    }
}