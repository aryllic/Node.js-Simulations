function zero() {
    return {x: 0, y: 0};
};

function normal(v) {
    return {x: -v.y, y: v.x};
};

function magnitude(v) {
    return Math.sqrt((v.x ** 2) + (v.y ** 2));
};

function unit(v) {
    const mag = magnitude(v);

    if (mag == 0) {
        return {x: 0, y: 0};
    };

    return {x: v.x / mag, y: v.y / mag};
};

function randomUnit() {
    const angle = Math.floor(Math.random() * 360);
    const rad = angle * (Math.PI / 180);

    return {x: Math.cos(rad), y: Math.sin(rad)};
};

function dot(v1, v2) {
    return (v1.x * v2.x) + (v1.y * v2.y);
};

function unitAngle(v) {
    return Math.atan2(v.y, v.x);
};

function rotate(v, angle) {
    const rad = angle * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
        x: (v.x * cos) - (v.y * sin),
        y: (v.x * sin) + (v.y * cos)
    };
};

function add(v1, v2) {
    return {x: v1.x + v2.x, y: v1.y + v2.y};
};

function subtract(v1, v2) {
    return {x: v1.x - v2.x, y: v1.y - v2.y};
};

function multiply(v, scalar) {
    return {x: v.x * scalar, y: v.y * scalar};
};

function divide(v, scalar) {
    return {x: v.x / scalar, y: v.y / scalar};
};

export default { zero, normal, magnitude, unit, randomUnit, dot, unitAngle, rotate, add, subtract, multiply, divide };