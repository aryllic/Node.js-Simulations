const sourceLinks = document.querySelectorAll(".source-link");

sourceLinks.forEach((link) => {
    if (link.innerText.length > 50) {
        link.innerText = link.innerText.substring(0, 50).trim() + "...";
    };
});