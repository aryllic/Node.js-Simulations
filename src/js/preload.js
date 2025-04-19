window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
});

window.addEventListener("dragover", (event) => {
    event.preventDefault();
});

window.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
});

document.addEventListener("keydown", (event) => {
    if (event.key == "F12" || (event.ctrlKey && event.shiftKey && event.key == "I")) {
        //event.preventDefault();
        return;
    };
    
    if (event.key == "Escape" && !window.location.href.endsWith("index.html")) {
        event.preventDefault();
        window.location.href = "index.html";
    };
});
