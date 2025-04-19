import renderingutils from "./modules/renderingutils.js";
import vectors from "./modules/vectors.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

var dt = 0;
var running = false;
var animationFrameId = null;

const selectors = ["mouseForceRadius", "targetDensity", "pressureMultiplier", "nearPressureMultiplier", "viscosityStrength", "gravityMultiplier", "particleSpawnAmount", "mouseForce"];

const mousePos = vectors.zero();
var mouse1Down = false;
var mouse2Down = false;
var mouseForce = 50;
var mouseForceRadius = 10;

const g = -9.81;
const collisionDamping = 0.7;
const smoothingRadius = 30;

var gravityMultiplier = 1;
var particleSpawnAmount = 10;
var targetDensity = 2.75;
var pressureMultiplier = 10;
var nearPressureMultiplier = 5;
var viscosityStrength = 0.1;

const particleAmount = 1000;
const particleCells = new Map();
const particles = [];

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

function smoothingKernel2(radius, dist) {
    if (dist > radius) { return 0; };

    const v = radius - dist;
	return (v ** 2) * (6 / (Math.PI * Math.pow(smoothingRadius, 4)));
};

function smoothingKernel2Derivative(radius, dist) {
    if (dist > radius) { return 0; };

    const v = radius - dist;
	return -v * (12 / (Math.pow(smoothingRadius, 4) * Math.PI));
};

function smoothingKernel3(radius, dist) {
    if (dist > radius) { return 0; };

    const v = radius - dist;
	return (v ** 3) * (10 / (Math.PI * Math.pow(smoothingRadius, 5)));
};

function smoothingKernel3Derivative(radius, dist) {
    if (dist > radius) { return 0; };

    const v = radius - dist;
	return -v * v * (30 / (Math.pow(smoothingRadius, 5) * Math.PI));
};

function smoothingKernelPoly6(radius, dist) {
    if (dist > radius) { return 0; };

    const v = (radius ** 2) - (dist ** 2);
	return (v ** 3) * (4 / (Math.PI * Math.pow(smoothingRadius, 8)));
};

function calculateDensity(densityParticle) {
    let density = 0;
    let nearDensity = 0;

    getSurroundingCells(getCellCoordinates(densityParticle.position)).forEach((cell) => {
        cell.particles.forEach((particle) => {
            const vd = vectors.subtract(particle.predictedPosition, densityParticle.predictedPosition);
            const dist = vectors.magnitude(vd);
            const influence = smoothingKernel2(smoothingRadius, dist);
            const nearInfluence = smoothingKernel3(smoothingRadius, dist);

            density += particle.mass * influence;
            nearDensity += particle.mass * nearInfluence;
        });
    });

    return [density, nearDensity];
};

function densityToPressure(density) {
    return (density - targetDensity) * pressureMultiplier;
};

function densityToNearPressure(nearDensity) {
	return nearDensity * nearPressureMultiplier;
};

function calculatePressureForce(forceParticle) {
    let pressureForce = vectors.zero();

    getSurroundingCells(getCellCoordinates(forceParticle.position)).forEach((cell) => {
        cell.particles.forEach((particle) => {
            if (forceParticle == particle) { return; };

            const particleVector = vectors.subtract(forceParticle.predictedPosition, particle.predictedPosition);
            const dist = vectors.magnitude(particleVector);
            const dir = dist != 0 ? vectors.unit(particleVector) : vectors.randomUnit();
            const densitySlope = smoothingKernel2Derivative(smoothingRadius, dist);
            const nearDensitySlope = smoothingKernel3Derivative(smoothingRadius, dist);
            const density = particle.density;
            const pressure = (densityToPressure(density) + densityToPressure(forceParticle.density)) / 2;
            const nearDensity = particle.nearDensity;
            const nearPressure = (densityToNearPressure(nearDensity) + densityToNearPressure(forceParticle.nearDensity)) / 2;

            pressureForce = vectors.add(pressureForce, vectors.multiply(dir, pressure * densitySlope * particle.mass / density));
            pressureForce = vectors.add(pressureForce, vectors.multiply(dir, nearPressure * nearDensitySlope * particle.mass / nearDensity));
        });
    });

    return pressureForce;
};

function calculateViscosityForce(forceParticle) {
    let viscosityForce = vectors.zero();

    getSurroundingCells(getCellCoordinates(forceParticle.position)).forEach((cell) => {
        cell.particles.forEach((particle) => {
            if (forceParticle == particle) { return; };

            const particleVector = vectors.subtract(particle.predictedPosition, forceParticle.predictedPosition);
            const dist = vectors.magnitude(particleVector);
            const influence = smoothingKernelPoly6(smoothingRadius, dist);

            viscosityForce = vectors.add(viscosityForce, vectors.multiply(vectors.subtract(particle.velocity, forceParticle.velocity), influence));
        });
    });

    return viscosityForce;
};

function getCellCoordinates(position) {
    return {
        x: Math.floor(position.x / smoothingRadius),
        y: Math.floor(position.y / smoothingRadius),
    };
};

function getSurroundingCells(coordinates) {
    const cells = [];

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const cell = particleCells.get(`${coordinates.x + i},${coordinates.y + j}`);

            if (cell) {
                cells.push(cell);
            };
        };
    };

    return cells;
};

function createParticleCell(position) {
    const cell = {
        particles: [],
        coordinates: getCellCoordinates(position),
    };

    return cell;
};

function particleUpdateBounds(particle) {
    if (particle.position.x - particle.radius / 2 < 0) {
        particle.position.x = 0 + particle.radius / 2;
        particle.velocity.x *= -1 * collisionDamping;
    };

    if (particle.position.x + particle.radius / 2 > canvas.clientWidth) {
        particle.position.x = canvas.clientWidth - particle.radius / 2;
        particle.velocity.x *= -1 * collisionDamping;
    };

    if (particle.position.y - particle.radius / 2 < 0) {
        particle.position.y = 0 + particle.radius / 2;
        particle.velocity.y *= -1 * collisionDamping;
    };

    if (particle.position.y + particle.radius / 2 > canvas.clientHeight) {
        particle.position.y = canvas.clientHeight - particle.radius / 2;
        particle.velocity.y *= -1 * collisionDamping;
    };
};

function particleUpdateMouseForce(particle) {
    if (!mouse1Down && !mouse2Down) { return; };

    const d = vectors.subtract(mousePos, particle.position);
    const dist = vectors.magnitude(d);

    if (dist < mouseForceRadius) {
        const f = vectors.multiply(vectors.divide(d, dist), mouseForce);

        if (mouse2Down) {
            f.x *= -1;
            f.y *= -1;
        };

        particle.velocity = vectors.add(particle.velocity, vectors.multiply(f, dt));
    };
};

function createParticle(position) {
    const particle = {
        cellCoordinates: getCellCoordinates(position),
        position: position,
        predictedPosition: position,
        velocity: vectors.zero(),
        radius: 5,
        mass: 1,
        density: 0,
        nearDensity: 0,
    };

    return particle;
};

function simulationStep() { //TODO: SWITCH TO FOR LOOPS
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    particles.forEach((particle) => {
        particle.velocity.y += g * gravityMultiplier * dt;
        particle.predictedPosition = vectors.add(particle.position, vectors.multiply(particle.velocity, (1 / 120) * 100));
    });

    particles.forEach((particle) => {
        const [density, nearDensity] = calculateDensity(particle);
        
        particle.density = density;
        particle.nearDensity = nearDensity;
    });

    particles.forEach((particle) => {
        const pressureForce = calculatePressureForce(particle);
        const pressureAcceleration = vectors.divide(pressureForce, particle.density);
        
        particle.velocity = vectors.add(particle.velocity, vectors.multiply(pressureAcceleration, dt));

        /*ctx.strokeStyle = "green";
        renderingutils.strokeArrow(ctx, {x: particle.position.x, y: canvas.clientHeight - particle.position.y}, {x: pressureAcceleration.x, y: -pressureAcceleration.y});*/
    });

    particles.forEach((particle) => {
        const viscosityForce = calculateViscosityForce(particle);
        
        particle.velocity = vectors.add(particle.velocity, vectors.multiply(viscosityForce, viscosityStrength * dt));
    });

    particles.forEach((particle) => {
        particle.position = vectors.add(particle.position, vectors.multiply(particle.velocity, dt * 100));
        particleUpdateBounds(particle);
        particleUpdateMouseForce(particle);
    });

    particles.forEach((particle) => {
        const cellCoordinates = getCellCoordinates(particle.position);
        
        if (particle.cellCoordinates != cellCoordinates) {
            const oldCell = particleCells.get(`${particle.cellCoordinates.x},${particle.cellCoordinates.y}`);

            if (oldCell) {
                const index = oldCell.particles.indexOf(particle);

                if (index > -1) {
                    oldCell.particles.splice(index, 1);
                };
            };
            
            const cell = particleCells.get(`${cellCoordinates.x},${cellCoordinates.y}`);

            if (cell) {
                cell.particles.push(particle);
            } else {
                const newCell = createParticleCell(particle.position);
                newCell.particles.push(particle);
                particleCells.set(`${cellCoordinates.x},${cellCoordinates.y}`, newCell);
            };

            particle.cellCoordinates = cellCoordinates;
        };
    });

    /*particleCells.forEach((cell) => {
        ctx.strokeStyle = "red";
        ctx.strokeRect(cell.coordinates.x * smoothingRadius, canvas.clientHeight - cell.coordinates.y * smoothingRadius, smoothingRadius, -smoothingRadius);
        ctx.strokeStyle = "green";
        ctx.strokeText(`${cell.particles.length}`, cell.coordinates.x * smoothingRadius + 2, canvas.clientHeight - cell.coordinates.y * smoothingRadius - 3);
        ctx.strokeText(`${cell.coordinates.x},${cell.coordinates.y}`, cell.coordinates.x * smoothingRadius + 2, canvas.clientHeight - cell.coordinates.y * smoothingRadius - 13);
    });*/
    
    particles.forEach((particle) => {
        /*ctx.strokeStyle = "green";
        ctx.strokeText(`D: ${particle.density}`, particle.position.x + 10, canvas.clientHeight - particle.position.y + 4);
        ctx.strokeText(`P: ${densityToPressure(particle.density)}`, particle.position.x + 10, canvas.clientHeight - particle.position.y + 14);*/

        ctx.fillStyle = velocityToColor(particle.velocity);
        renderingutils.fillCircle(ctx, {x: particle.position.x, y: canvas.clientHeight - particle.position.y}, particle.radius);
    });

    ctx.strokeStyle = "cyan";
    renderingutils.strokeCircle(ctx, {x: mousePos.x, y: canvas.clientHeight - mousePos.y}, mouseForceRadius);

    ctx.strokeStyle = "green";
    ctx.strokeRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.strokeText(`FPS: ${Math.round(1 / dt)}`, 2, 10);
    ctx.strokeText(`g: ${g}`, 2, 20);
    ctx.strokeText(`Collision Damping: ${collisionDamping}`, 2, 30);
    ctx.strokeText(`Smoothing Radius: ${smoothingRadius}`, 2, 40);
    ctx.strokeText(`Initial Particle Amount: ${particleAmount}`, 2, 50);

    ctx.strokeText(`${selectors[0] == "gravityMultiplier" ? "> " : ""}Gravity Multiplier: ${gravityMultiplier}`, 2, 70);
    ctx.strokeText(`${selectors[0] == "particleSpawnAmount" ? "> " : ""}Particle Spawn Amount: ${particleSpawnAmount}`, 2, 80);
    ctx.strokeText(`${selectors[0] == "mouseForce" ? "> " : ""}Mouse Force: ${mouseForce}`, 2, 90);
    ctx.strokeText(`${selectors[0] == "mouseForceRadius" ? "> " : ""}Mouse Radius: ${mouseForceRadius}`, 2, 100);
    ctx.strokeText(`${selectors[0] == "targetDensity" ? "> " : ""}Target Density: ${targetDensity}`, 2, 110);
    ctx.strokeText(`${selectors[0] == "pressureMultiplier" ? "> " : ""}Pressure Multiplier: ${pressureMultiplier}`, 2, 120);
    ctx.strokeText(`${selectors[0] == "nearPressureMultiplier" ? "> " : ""}Near Pressure Multiplier: ${nearPressureMultiplier}`, 2, 130);
    ctx.strokeText(`${selectors[0] == "viscosityStrength" ? "> " : ""}Viscosity Strength: ${viscosityStrength}`, 2, 140);
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

for (let x = 0; x < canvas.clientWidth / smoothingRadius; x++) {
    for (let y = 0; y < canvas.clientHeight / smoothingRadius; y++) {
        const cell = createParticleCell({x: x * smoothingRadius, y: y * smoothingRadius});
        particleCells.set(`${cell.coordinates.x},${cell.coordinates.y}`, cell);
    };
};

for (let i = 0; i < particleAmount; i++) {
    const particle = createParticle({x: Math.random() * canvas.clientWidth, y: Math.random() * canvas.clientHeight});

    particleCells.get(`${particle.cellCoordinates.x},${particle.cellCoordinates.y}`).particles.push(particle);
    particles.push(particle);
};

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
            for (let i = 0; i < particleSpawnAmount; i++) {
                const particle = createParticle({x: event.clientX + i, y: canvas.clientHeight - event.clientY});

                particleCells.get(`${particle.cellCoordinates.x},${particle.cellCoordinates.y}`).particles.push(particle);
                particles.push(particle);
            };

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
        case "particleSpawnAmount":
            particleSpawnAmount = Math.min(Math.max(particleSpawnAmount + direction * 1, 1), 100);
            break;
        case "mouseForce":
            mouseForce = Math.min(Math.max(mouseForce + direction * 10, 50), 500);
            break;
        case "mouseForceRadius":
            mouseForceRadius = Math.min(Math.max(mouseForceRadius + direction * 10, 10), 1000);
            break;
        case "targetDensity":
            targetDensity = Math.min(Math.max(targetDensity + direction * 0.1, 0.1), 10);
            break;
        case "pressureMultiplier":
            pressureMultiplier = Math.min(Math.max(pressureMultiplier + direction * 1, 0), 100);
            break;
        case "nearPressureMultiplier":
            nearPressureMultiplier = Math.min(Math.max(nearPressureMultiplier + direction * 1, 0), 100);
            break;
        case "smoothingRadius":
            smoothingRadius = Math.min(Math.max(smoothingRadius + direction * 10, 10), 1000);
            break;
        case "viscosityStrength":
            viscosityStrength = Math.min(Math.max(viscosityStrength + direction * 0.1, 0), 10);
            break;
        default:
            return;
    };
});

startSimulation();
