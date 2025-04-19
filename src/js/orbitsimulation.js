import renderingutils from "./modules/renderingutils.js";
import vectors from "./modules/vectors.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

var dt = 0;
var running = false;
var animationFrameId = null;

const selectors = ["mouseForceRadius", "mouseForce"];

const mousePos = vectors.zero();
var mouse1Down = false;
var mouse2Down = false;
var mouseForce = 10;
var mouseForceRadius = 10;

const bodies = [];

function updateCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

function updateMousePos(event) {
    mousePos.x = event.clientX - canvas.offsetLeft;
    mousePos.y = canvas.clientHeight - (event.clientY - canvas.offsetTop);
};

function velocityToColor(v) {
    const magnitude = vectors.magnitude(v);
    const r = Math.min(Math.max(magnitude / 5, 0), 1);
    const g = 0;
    const b = Math.min(Math.max(1 - (magnitude / 5), 0), 1);

    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
};

function bodyUpdateMouseForce(body) {
    if (!mouse1Down && !mouse2Down) { return; };

    const d = vectors.subtract(mousePos, body.position);
    const dist = vectors.magnitude(d);

    if (dist < mouseForceRadius) {
        const f = vectors.multiply(vectors.divide(d, dist), mouseForce);

        if (mouse2Down) {
            f.x *= -1;
            f.y *= -1;
        };

        body.velocity = vectors.add(body.velocity, vectors.multiply(f, dt));
    };
};

function createBody(position, impulse, radius, mass) {
    const body = {
        position: position,
        velocity: impulse,
        radius: radius,
        mass: mass,
        path: [],
    };

    return body;
};

function simulationStep() { //TODO: SWITCH TO FOR LOOPS
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    bodies.forEach((body) => {
        bodies.forEach((otherBody) => {
            if (body == otherBody) { return; }

            const bodyVector = vectors.subtract(otherBody.position, body.position);
            const dist = vectors.magnitude(bodyVector);
            const dir = vectors.unit(bodyVector);
            const force = (body.mass * otherBody.mass) / (dist ** 2);
            const f = vectors.multiply(dir, force);

            body.velocity = vectors.add(body.velocity, vectors.multiply(f, dt / body.mass));
            
            ctx.strokeStyle = "green";
            renderingutils.strokeArrow(ctx, {x: body.position.x, y: canvas.clientHeight - body.position.y}, {x: f.x, y: -f.y});
        });

        ctx.strokeStyle = "green";
        renderingutils.strokeArrow(ctx, {x: body.position.x, y: canvas.clientHeight - body.position.y}, {x: body.velocity.x * 100, y: -body.velocity.y * 100});

        body.position = vectors.add(body.position, vectors.multiply(body.velocity, dt * 100));
        bodyUpdateMouseForce(body);

        let lastPoint = body.path[body.path.length - 1];

        if (!lastPoint || vectors.magnitude(vectors.subtract(lastPoint, body.position)) > 10) {
            body.path.push({x: body.position.x, y: body.position.y});
            lastPoint = body.path[body.path.length - 1];
        };

        if (body.path.length > 100) {
            body.path.shift();
        };

        for (let i = 1; i < body.path.length; i++) {
            const point = body.path[i];
            const prevPoint = body.path[i - 1];

            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, canvas.clientHeight - prevPoint.y);
            ctx.lineTo(point.x, canvas.clientHeight - point.y);
            ctx.stroke();
        };

        ctx.beginPath();
        ctx.moveTo(lastPoint.x, canvas.clientHeight - lastPoint.y);
        ctx.lineTo(body.position.x, canvas.clientHeight - body.position.y);
        ctx.stroke();

        ctx.fillStyle = velocityToColor(body.velocity);
        renderingutils.fillCircle(ctx, {x: body.position.x, y: canvas.clientHeight - body.position.y}, body.radius);
    });

    ctx.strokeStyle = "cyan";
    renderingutils.strokeCircle(ctx, {x: mousePos.x, y: canvas.clientHeight - mousePos.y}, mouseForceRadius);

    ctx.strokeStyle = "green";
    ctx.strokeRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.strokeText(`FPS: ${Math.round(1 / dt)}`, 2, 10);

    ctx.strokeText(`${selectors[0] == "mouseForce" ? "> " : ""}Mouse Force: ${mouseForce}`, 2, 30);
    ctx.strokeText(`${selectors[0] == "mouseForceRadius" ? "> " : ""}Mouse Radius: ${mouseForceRadius}`, 2, 40);
};

function startSimulation() {
    if (running) return;
    running = true;

    let lastTick = performance.now();

    function loop(now) {
        if (!running) return;

        dt = Math.min((now - lastTick) / 1000, 1 / 60);
        lastTick = now;
        simulationStep();
        animationFrameId = requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
};

function pauseSimulation() {
    if (!running) return;
    running = false;
    dt = 1 / 120;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    };
};

function toggleSimulation() {
    if (running) {
        pauseSimulation();
    } else {
        startSimulation();
    };
};

bodies.push(createBody({x: 100, y: 100}, {x: 0.5, y: 0.25}, 10, 100000));
bodies.push(createBody({x: 100, y: 350}, {x: 2.5, y: 0.25}, 5, 100));

/*bodies.push(createBody({x: 960, y: 540}, {x: 0, y: 0}, 10, 100000));
bodies.push(createBody({x: 960, y: 540 + 250}, {x: 2, y: 0}, 5, 100));*/

window.addEventListener("DOMContentLoaded", updateCanvasSize);
window.addEventListener("resize", updateCanvasSize);
document.addEventListener("mousemove", updateMousePos);
document.addEventListener("mouseenter", updateMousePos);

document.addEventListener("keydown", function(event) {
    switch (event.key) {
        case "ArrowDown":
            selectors.push(selectors.shift());
            break;
        case "ArrowUp":
            selectors.unshift(selectors.pop());
            break;
        case " ":
            toggleSimulation();
            break;
        case "ArrowRight":
            if (!animationFrameId) {
                simulationStep();
            };

            break;
        default:
            return;
    };
});

document.addEventListener("mousedown", (event) => {
    switch (event.button) {
        case 0:
            mouse1Down = true;
            break;
        case 2:
            mouse2Down = true;
            break;
        case 1:
            bodies.push(createBody({x: event.clientX, y: canvas.clientHeight - event.clientY}, {x: 0, y: 0}, 5, 100));

            break;
        default:
            return;
    };
});

document.addEventListener("mouseup", (event) => {
    switch (event.button) {
        case 0:
            mouse1Down = false;
            break;
        case 2:
            mouse2Down = false;
            break;
        default:
            return;
    };
});

document.addEventListener("wheel", (event) => {
    let direction = Math.sign(event.wheelDeltaY);

    if (event.ctrlKey) {
        direction *= 10;
    };

    switch (selectors[0]) {
        case "mouseForce":
            mouseForce = Math.min(Math.max(mouseForce + direction * 1, 10), 50);
            break;
        case "mouseForceRadius":
            mouseForceRadius = Math.min(Math.max(mouseForceRadius + direction * 10, 10), 1000);
            break;
        default:
            return;
    };
});

startSimulation();
