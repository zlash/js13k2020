import { InputStatus, InputB, InputA } from "../entrypoint";
import { EntityTrapDoors } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4, max } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline, crazyBounce } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion, offsetScalePoly, vPosSetVelocity } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";


export interface TrapDoors extends VPos {
    type: typeof EntityTrapDoors;
    clock: number;
    t: number;
    state: number;
}

export const createTrapDoors = (ingame: Ingame, x: number, y: number, z: number): TrapDoors => {
    const trapDoors = initVPos({
        type: EntityTrapDoors,
        clock: 0,
        t: 0,
        state: 0,
    }, x, y, z);

    ingame.onReset.push(() => {
        trapDoors.clock =
            trapDoors.t =
            trapDoors.state = 0;
    });

    return trapDoors;
}

export const updateTrapDoors = (trapDoors: TrapDoors, input: InputStatus, dt: number, ingame: Ingame) => {

    const { ball } = ingame;
    const { pos } = trapDoors;

    const curPolygon = offsetScalePoly([
        [-1, -2],
        [-1, 2],
        [1, 2],
        [1, -2],
    ], pos, [1, 1]);

    const satResult = polyCircleSat(curPolygon, ball.pos, playerBallRad);

    if (satResult) {
        if (trapDoors.state < 2) {
            ball.pos[2] = pos[2] + 1;
        }

        if (trapDoors.state == 0 && ball.pos[0] > pos[0]) {
            trapDoors.state = 1;
            vPosSetVelocity(ball, 0);
            ball.inputLock = 1;
            ingame.textSequenceId = 9;
            ingame.textClock = 0;
        }
    }

    if (trapDoors.state == 1) {
        trapDoors.clock += 0.0005 * dt;
        trapDoors.t = max(0, crazyBounce(trapDoors.clock % 1) - 0.25);
        if (trapDoors.clock >= 1) {
            trapDoors.t = 0.7;
            trapDoors.state = 2;
            ball.a[0] = 0.8 * dt;
            //ball.a[1] = -6.5 * dt;
            v3Copy(ingame.cameraDst, ingame.targets["p"]);
            ball.pinballLock = 1;
        }
    }



};
