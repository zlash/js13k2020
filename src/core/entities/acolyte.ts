import { InputStatus, InputB, InputA } from "../entrypoint";
import { EntityAcolyte } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4, cos, sin } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";


const nAcolytes = 8;
const acolyteRad = 0.25;

const turnDuration = 4;
const circleRad = 1.75;

export interface Acolyte extends VPos {
    type: typeof EntityAcolyte;
    acolytes?: (v2 | 0)[];
    clock: number;
    alive: number;
}

const generateNewlyBornAcolytes = () => {
    return new Array(nAcolytes).fill(0).map(x => [0,0]);
}

export const createAcolyte = (ingame: Ingame, x: number, y: number, z: number): Acolyte => {
    const acolyte = initVPos({
        type: EntityAcolyte,
        clock: -1.5,
        alive: 0,
    }, x, y, z);
    return acolyte;
}

export const updateAcolyte = (acolyte: Acolyte, input: InputStatus, dt: number, ingame: Ingame) => {

    const { ball } = ingame;
    const { acolytes } = acolyte;


    acolytes && acolytes.forEach((a, idx) => {
        if (a) {
            const pos = TWO_PI * (acolyte.clock + idx / nAcolytes);
            a[0] = -(pos > 0 ? cos(pos - PI_2) : pos);
            a[1] = pos > 0 ? sin(pos + PI_2) : 1;
            v2Add(v2Mul(a, circleRad), acolyte.pos);

            const sat = circleCircleSat(ball.pos, playerBallRad, a, acolyteRad);

            if (sat) {
                vPosExpulsion(ball, sat, 0.65);
                acolytes[idx] = 0;
            }
        }
    })

    if (acolyte.alive) {
        if (!acolytes || acolytes.every(x => !x)) {
            acolyte.acolytes = generateNewlyBornAcolytes();
            acolyte.clock = -1.5;
        }
    }


    acolyte.clock += dt * 0.001 / turnDuration;
};
