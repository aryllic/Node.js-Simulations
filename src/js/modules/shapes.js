const shapes = {
    square: [
        {x: 50, y: -50},
        {x: 50, y: 50},
        {x: -50, y: 50},
        {x: -50, y: -50}
    ],
    rectangle: [
        {x: 50, y: -25},
        {x: 50, y: 25},
        {x: -50, y: 25},
        {x: -50, y: -25}
    ],
    circle: [
        {x: 0, y: -50},
        {x: 35, y: -35},
        {x: 50, y: 0},
        {x: 35, y: 35},
        {x: 0, y: 50},
        {x: -35, y: 35},
        {x: -50, y: 0},
        {x: -35, y: -35}
    ],
    triangle: [
        {x: 0, y: -50},
        {x: 50, y: 50},
        {x: -50, y: 50}
    ],
    pentagon: [
        {x: 0, y: -50},
        {x: 47, y: -15},
        {x: 29, y: 40},
        {x: -29, y: 40},
        {x: -47, y: -15}
    ],
    hexagon: [
        {x: 0, y: -50},
        {x: 43, y: -25},
        {x: 43, y: 25},
        {x: 0, y: 50},
        {x: -43, y: 25},
        {x: -43, y: -25}
    ],
    c: [
        {x: -25, y: -50},
        {x: -25, y: 50},
        {x: 25, y: 50},
        {x: 25, y: 25},
        {x: 0, y: 25},
        {x: 0, y: -25},
        {x: 25, y: -25},
        {x: 25, y: -50}
    ],
    l: [
        {x: -25, y: -50},
        {x: -25, y: 50},
        {x: 25, y: 50},
        {x: 25, y: 25},
        {x: 0, y: 25},
        {x: 0, y: -50}
    ],
    customCircle: function(sides, radius) {
        const angle = (2 * Math.PI) / sides;
        const shape = [];

        for (let i = 0; i < sides; i++) {
            shape.push({
                x: Math.sin(angle * i) * radius,
                y: -Math.cos(angle * i) * radius
            });
        };

        return shape;
    }
};

export default shapes;