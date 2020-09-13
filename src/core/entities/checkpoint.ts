import { InputStatus, InputB, InputA, someNote } from "../entrypoint";
import { EntityCheckpoint } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4, min } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";
import { playAudio } from "../audio/audio";


export interface Checkpoint extends VPos {
    type: typeof EntityCheckpoint;
    t: number;
    clock: number;
    initialZ: number;
    on: number;
}

export const createCheckpoint = (ingame: Ingame, x: number, y: number, z: number): Checkpoint => {
    const checkpoint = initVPos({
        type: EntityCheckpoint,
        t: 0,
        initialZ: z,
        clock: 0,
        on: 0,
    }, x, y, z);
    return checkpoint;
}

export const updateCheckpoint = (checkpoint: Checkpoint, input: InputStatus, dt: number, ingame: Ingame) => {
    if (checkpoint.on) {
        checkpoint.clock += dt * 0.0009;
        checkpoint.t = (checkpoint.clock) % 0.95;
        checkpoint.pos[2] = checkpoint.initialZ + min(2.5, checkpoint.clock * 0.5);
    } else {
        const satResult = circleCircleSat(checkpoint.pos, 1, ingame.ball.pos, playerBallRad);
        if (satResult) {
            checkpoint.on = 1;
            v3Add(checkpoint.pos, [0, 0, 15], ingame.resetBallPos);
            ingame.textSequenceId = 7;
            ingame.textClock = 0;
            playAudio(someNote, 0, 0.4);
            playAudio(someNote, 1200, 0.4);
        }
    }
};
