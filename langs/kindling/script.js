const changePosition = e => e.style.left = Math.floor(Math.random() * 90 + 5)+"%";

addEventListener('load', () => {
    for (const ember of document.getElementsByClassName("ember")) {
        changePosition(ember)
        ember.addEventListener("animationiteration", changePosition);
    }
})
