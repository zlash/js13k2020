import { clamp, min, exp } from "./mathUtils";

export const exponentialImpulse = (x: number, compress: number): number => {
    return x * exp(1.0 - (x * compress));
}

export const exponentialImpulseOut = (x: number, compress: number): number => {
    x = 1 - x;
    return 1 - x * exp(1.0 - (x * compress));
}


export const gravityImpulse = (x: number) => {
    return x < 0.5 ? exponentialImpulse(x * 2, 1) : (exponentialImpulse(2 - 2 * x, 1));
}


const coefs = [
    [-1, 2, -1, 0],
    [3, -5, 0, 2],
    [-3, 4, 1, 0],
    [1, -1, 0, 0],
];


export const spline = (waypoints: number[][], t: number) => {
    let k;
    const waypointsLength = waypoints.length;
    for (k = 0; k < waypointsLength - 1 && waypoints[k][0] < t; k++);
    k = k || 1;

    const h = (t - waypoints[k - 1][0]) / (waypoints[k][0] - waypoints[k - 1][0]);

    const result = [0, 0, 0];

    for (let i = 0; i < 4; i++) {
        const kn = clamp(k + i - 2, 0, waypointsLength - 1);
        const co = coefs[i];
        const b = 0.5 * (((co[0] * h + co[1]) * h + co[2]) * h + co[3]);
        for (let j = 0; j < 3; j++) {
            result[j] += b * waypoints[kn][j + 1];
        }
    }
    return result;
}

export const onePointSpline = (x: number, y: number, t: number) => {
    return min(1, spline([
        [0, 0, 0, 0],
        [x, x, y, 0],
        [1, 1, 1, 0],
    ], t)[1]);
}

const bounceOffset = 0.3;

export const crazyBounce = (x: number) => min(1, spline([
    [0, 0, 0, 0],

    [0.2, 0.5, 1 , 0],
    [0.4, 0.4, 1 - bounceOffset, 0],
    [0.6, 0.6, 1 - bounceOffset * 0.2 , 0],
    [0.9, 0.9, 1 - bounceOffset * 0.4, 0],
    [1, 1, 1, 0],
], x)[1]);
