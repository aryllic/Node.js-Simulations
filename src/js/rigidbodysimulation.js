import renderingutils from "./modules/renderingutils.js";
import vectors from "./modules/vectors.js";
import shapes from "./modules/shapes.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

var dt = 0;
var running = false;
var animationFrameId = null;

const selectors = ["mouseForceRadius", "gravityMultiplier", "mouseForce"];

const mousePos = vectors.zero();
var mouse1Down = false;
var mouse2Down = false;
var mouseForce = 20;
var mouseForceRadius = 10;

const g = -9.81;
var gravityMultiplier = 1;

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

function bodyCornerToWorld(body, corner) {
    const rotated = vectors.rotate(corner, body.orientation);
    const translated = vectors.subtract(body.position, rotated);

    return translated;
};

function bodyWorldCorners(body) {
    return body.shape.map(corner => bodyCornerToWorld(body, corner));
};

function bodyAxes(points) {
    const axes = [];

    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const edge = vectors.subtract(p2, p1);
        const normal = vectors.unit(vectors.normal(edge));

        axes.push(normal);
    };

    return axes;
};

function projectShape(points, axis) {
    const dots = points.map(p => vectors.dot(p, axis));
    
    return { min: Math.min(...dots), max: Math.max(...dots) };
};

function isOverlapping(proj1, proj2) {
    return !(proj1.max < proj2.min || proj2.max < proj1.min);
};

function bodiesColliding(bodyA, bodyB) {
    const pointsA = bodyWorldCorners(bodyA);
    const pointsB = bodyWorldCorners(bodyB);

    const axes = [...bodyAxes(pointsA), ...bodyAxes(pointsB)];

    for (const axis of axes) {
        const projA = projectShape(pointsA, axis);
        const projB = projectShape(pointsB, axis);

        if (!isOverlapping(projA, projB)) {
            return false;
        };
    };

    return true;
};

function bodyUpdateCollisions(body) {
    if (body.position.x < 0) {
        body.position.x = 0;
        body.velocity.x *= -1;
    };
    if (body.position.x > canvas.clientWidth) {
        body.position.x = canvas.clientWidth;
        body.velocity.x *= -1;
    };
    if (body.position.y < 0) {
        body.position.y = 0;
        body.velocity.y *= -1;
    };
    if (body.position.y > canvas.clientHeight) {
        body.position.y = canvas.clientHeight;
        body.velocity.y *= -1;
    };

    bodies.forEach((otherBody) => {
        if (body == otherBody) return;

        const colliding = bodiesColliding(body, otherBody);

        if (colliding) {
            const pointsA = bodyWorldCorners(body);
            const pointsB = bodyWorldCorners(otherBody);

            const axes = [...bodyAxes(pointsA), ...bodyAxes(pointsB)];

            let minOverlap = Infinity;
            let minAxis = null;

            for (const axis of axes) {
                const projA = projectShape(pointsA, axis);
                const projB = projectShape(pointsB, axis);

                const overlap = Math.min(projA.max - projB.min, projB.max - projA.min);

                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    minAxis = axis;
                };
            };

            const correctionVector = vectors.multiply(minAxis, minOverlap / 2);
            body.position = vectors.add(body.position, correctionVector);
            otherBody.position = vectors.subtract(otherBody.position, correctionVector);
        };
    });
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

function createBody(position, orientation, mass, friction, anchored, shape) {
    const body = {
        position: position,
        orientation: orientation,
        velocity: {x: 5, y: 0},
        angularVelocity: 0,
        mass: mass,
        friction: friction,
        anchored: anchored,
        shape: shape,
    };

    return body;
};

function simulationStep() { //TODO: SWITCH TO FOR LOOPS
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    bodies.forEach((body) => {
        if (body.anchored) return;

        body.velocity.y += g * gravityMultiplier * dt;

        bodyUpdateCollisions(body);
        bodyUpdateMouseForce(body);

        body.position = vectors.add(body.position, vectors.multiply(body.velocity, dt * 100));
        body.orientation += body.angularVelocity * dt;
        body.orientation = body.orientation % 360;

        ctx.strokeStyle = "green";
        renderingutils.strokeArrow(ctx, {x: body.position.x, y: canvas.clientHeight - body.position.y}, {x: body.velocity.x * 10, y: -body.velocity.y * 10});
    });

    bodies.forEach((body) => {
        ctx.strokeStyle = "red";
        renderingutils.strokeArrow(ctx, {x: body.position.x, y: canvas.clientHeight - body.position.y}, vectors.rotate({x: 0, y: -50}, body.orientation));

        //ctx.strokeStyle = velocityToColor(body.velocity);
        ctx.strokeStyle = "white";
        renderingutils.strokeShape(ctx, {x: body.position.x, y: canvas.clientHeight - body.position.y}, body.orientation, body.shape);
    });

    ctx.strokeStyle = "cyan";
    renderingutils.strokeCircle(ctx, {x: mousePos.x, y: canvas.clientHeight - mousePos.y}, mouseForceRadius);

    ctx.strokeStyle = "green";
    ctx.strokeRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.strokeText(`FPS: ${Math.round(1 / dt)}`, 2, 10);
    ctx.strokeText(`g: ${g}`, 2, 20);

    ctx.strokeText(`${selectors[0] == "gravityMultiplier" ? "> " : ""}Gravity Multiplier: ${gravityMultiplier}`, 2, 40);
    ctx.strokeText(`${selectors[0] == "mouseForce" ? "> " : ""}Mouse Force: ${mouseForce}`, 2, 50);
    ctx.strokeText(`${selectors[0] == "mouseForceRadius" ? "> " : ""}Mouse Radius: ${mouseForceRadius}`, 2, 60);
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

bodies.push(createBody({x: 100, y: 100}, 0, 10, 0.1, false, shapes.circle));

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
            bodies.push(createBody({x: event.clientX, y: canvas.clientHeight - event.clientY}, 0, 10, 100, false, shapes.square));

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
        case "gravityMultiplier":
            gravityMultiplier = Math.min(Math.max(gravityMultiplier + direction * 0.1, -2), 2);
            break;
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
