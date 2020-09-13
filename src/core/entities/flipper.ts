import { InputStatus, InputB, InputA, kickBuffer, mouseStatus, InputLeft, InputRight } from "../entrypoint";
import { EntityFlipper } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame, makeIngame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4, abs } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat } from "../physics";
import { v2Add, v2Rotate, v2Length } from "../vector";
import { playAudio } from "../audio/audio";

export interface Flipper extends VPos {
    type: typeof EntityFlipper;
    polygon: any;
    anchor: v3;
    side: number;
    hitLock: number;
}

const xWidth = 2;
const yRad = 0.22;
const tipPointX = 0.9;
const tipPointY = 0.5;
const polygon = [
    [0, -yRad],
    [xWidth * tipPointX, -yRad * tipPointY],
    [xWidth * tipPointX, yRad * tipPointY],
    [0, yRad],
]

export const createFlipper = (ingame: Ingame, x: number, y: number, z: number, side: number): Flipper => {
    const flipper = initVPos({
        anchor: [x, y, z],
        type: EntityFlipper,
        polygon: [],
        hitLock: 0,
        side,
    }, 0, 0, 0);
    ingame.physicsWorld.addElement(flipper);
    return flipper;
}

export const updateFlipper = (flipper: Flipper, input: InputStatus, dt: number, ingame: Ingame) => {
    const { ball } = ingame;
    const { side } = flipper;

    const sideMul = side ? -1 : 1;

    let flipperAcceleration = -0.01 * fixedFramerate;
    flipper.pos[0] = clamp(flipper.pos[0], 0, 1);

    if (flipper.pos[0] - flipper.prevPos[0] > 0 && !flipper.hitLock) {
        playAudio(kickBuffer, 2000, 0.035);
        flipper.hitLock = 1;
    }

    if (flipper.pos[0] - flipper.prevPos[0] < 0 && flipper.hitLock) {
        flipper.hitLock = 0;
    }

    if (input[side ? InputA : InputB] || input[side ? InputRight : InputLeft] || mouseStatus.buttons[0]) {
        flipperAcceleration = 0.6 * fixedFramerate; //3
        if (ball.pinballLock) {
            ball.a[0] = 0.02;
        }
    }

    flipper.a[0] = flipperAcceleration;


    const curPolygon = polygon.map(x => {
        const vTransf = v2Rotate(x, -flipper.pos[0] * PI_2 + PI_4, []);
        return [
            vTransf[0] * sideMul + flipper.anchor[0],
            vTransf[1] + flipper.anchor[1],
            flipper.anchor[2],
        ];
    });

    flipper.polygon = curPolygon;

    const satResult = polyCircleSat(curPolygon, ball.pos, playerBallRad);
    if (satResult) {
        //If there is a bug, it's better to have a random push than a lose
        satResult[1] = -abs(satResult[1]);
        v2Add(ball.pos, satResult);
    }
};