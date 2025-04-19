import vectors from "./vectors.js";

function strokeArrow(ctx, startPosition, direction) {
    const endPosition = {
        x: startPosition.x + direction.x,
        y: startPosition.y + direction.y
    };
    
    const dirUnit = vectors.unit(direction);
    const leftArrow = vectors.rotate(dirUnit, -135);
    const rightArrow = vectors.rotate(dirUnit, 135);
    
    ctx.beginPath();
    ctx.moveTo(startPosition.x, startPosition.y);
    ctx.lineTo(endPosition.x, endPosition.y);
    ctx.lineTo(endPosition.x + leftArrow.x * 10, endPosition.y + leftArrow.y * 10);
    ctx.moveTo(endPosition.x, endPosition.y);
    ctx.lineTo(endPosition.x + rightArrow.x * 10, endPosition.y + rightArrow.y * 10);
    ctx.stroke();
};

function fillCircle(ctx, position, radius) {
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();
};

function strokeCircle(ctx, position, radius) {
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.stroke();
};

function fillRect(ctx, position, width, height) {
    ctx.fillRect(position.x, position.y, width, height);
};

function strokeRect(ctx, position, width, height) {
    ctx.strokeRect(position.x, position.y, width, height);
};

function strokeShape(ctx, position, orientation, shape) {
    let cornerRotated = vectors.rotate(shape[0], orientation);

    ctx.beginPath();
    ctx.moveTo(position.x + cornerRotated.x, position.y + cornerRotated.y);
    
    for (let i = 1; i < shape.length; i++) {
        cornerRotated = vectors.rotate(shape[i], orientation);
        ctx.lineTo(position.x + cornerRotated.x, position.y + cornerRotated.y);
    };
    
    ctx.closePath();
    ctx.stroke();
};

function fillShape(ctx, position, orientation, shape) {
    let cornerRotated = vectors.rotate(shape[0], orientation);
    
    ctx.beginPath();
    ctx.moveTo(position.x + cornerRotated.x, position.y + cornerRotated.y);
    
    for (let i = 1; i < shape.length; i++) {
        cornerRotated = vectors.rotate(shape[i], orientation);
        ctx.lineTo(position.x + cornerRotated.x, position.y + cornerRotated.y);
    };
    
    ctx.closePath();
    ctx.fill();
};

export default { strokeArrow, fillCircle, strokeCircle, fillRect, strokeRect, strokeShape, fillShape };