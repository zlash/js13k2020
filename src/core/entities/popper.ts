import { InputStatus, InputB, InputA, percBassBuffer } from "../entrypoint";
import { EntityPopper } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4 } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";
import { playAudio } from "../audio/audio";


export interface Popper extends VPos {
    type: typeof EntityPopper;
    state: number;
    angle: number;
    clock: number;
}

const popperRad = 0.4;
const raiseDuration = 0.7;

export const createPopper = (ingame: Ingame, x: number, y: number, z: number): Popper => {
    const popper = initVPos({
        type: EntityPopper,
        state: 0,
        angle: 1,
        clock: 0,
    }, x, y, z);
    return popper;
}

export const updatePopper = (popper: Popper, input: InputStatus, dt: number, ingame: Ingame) => {
    const { ball } = ingame;
    const { state, pos, clock } = popper;

    const sat = circleCircleSat(ball.pos, playerBallRad, pos, popperRad);

    [
        () => {// 0: Open
            popper.angle = 1;
            popper.clock = 0;
        },
        () => {// 1: Falling
            if (popper.angle <= 0) {
                popper.state = 2;
            } else {
                popper.angle = 1 - onePointSpline(0.7, 0.35, clock + 0.5);
            }
        },
        () => {// 2: Closed
            popper.angle = 0;
            if (clock >= 3) {
                popper.clock = 0;
                popper.state = 3;
            }
        },
        () => {// 3: Falling
            if (popper.angle >= 1) {
                popper.state = 0;
            } else {
                popper.angle = clock;
            }
        },
    ]
    [state]();

    popper.clock += dt * 0.001 / raiseDuration;

    if (ball.pos[1] - ball.prevPos[1] < 0 && sat) {
        ingame.score += 400;
        if (popper.state == 0) {
            playAudio(percBassBuffer, 2700, 0.04);
            playAudio(percBassBuffer, 2700 / 2, 0.04);
            vPosExpulsion(ball, sat, 0.65);
        }
        popper.state = 1;
    }
};
