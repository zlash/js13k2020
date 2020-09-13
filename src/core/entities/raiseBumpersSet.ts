import { InputStatus, InputB, InputA } from "../entrypoint";
import { EntityRaiseBumpersSet, EntityRaiseBumper } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4, unitWrap } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";
import { RaiseBumper, createRaiseBumper } from "./raiseBumper";
import { forCallback } from "../utils";


export interface RaiseBumpersSet extends VPos {
    type: typeof EntityRaiseBumpersSet;
    bumpers: RaiseBumper[];
    clock: number;
    sidesFlip: number;
    state: number;
    bottomCounter: number;
    isDead: number;
}

export const createRaiseBumpersSet = (ingame: Ingame, x: number, y: number, z: number): RaiseBumpersSet => {
    const raiseBumpersSet = initVPos({
        type: EntityRaiseBumpersSet,
        bumpers: [] as RaiseBumper[],
        clock: 0,
        sidesFlip: 0,
        state: 0,
        bottomCounter: 0,
        isDead: 0,
    }, x, y, z);
    forCallback(3, (idx) => raiseBumpersSet.bumpers[idx] = ingame.createEntity(
        EntityRaiseBumper, ...[
            [x - 2.5, y, z, 0],
            [x + 2.5, y, z, 2],
            [x, y + 3.2, z, 0],
        ][idx]
    ) as any);
    return raiseBumpersSet;
}

export const updateRaiseBumpersSet = (raiseBumpersSet: RaiseBumpersSet, input: InputStatus, dt: number, ingame: Ingame) => {
    const { bumpers, state } = raiseBumpersSet;

    raiseBumpersSet.clock += dt * 0.00025;

    // States
    // 0: all down
    // 1: alternating sides 
    // 2: alternating sides plus bottom
    // 3: chain towers

    if (bumpers[0].hitsCounter == 0 && bumpers[1].hitsCounter == 0) {
        raiseBumpersSet.isDead = 1;
    }

    if (state == 0) {
        bumpers[0].state = bumpers[1].state = bumpers[2].state = 0;
    } else {
        if (raiseBumpersSet.clock >= 1) {
            raiseBumpersSet.clock = 0;
            if (state == 3) {
                bumpers[0].state = bumpers[1].state = 4;
            } else {
                bumpers[0].state = 1 + raiseBumpersSet.sidesFlip * 2;
                raiseBumpersSet.sidesFlip = 1 - raiseBumpersSet.sidesFlip;
                bumpers[1].state = 1 + raiseBumpersSet.sidesFlip * 2;
            }
            raiseBumpersSet.bottomCounter = (raiseBumpersSet.bottomCounter + 1) % 5;
            if (state == 2) {
                if (raiseBumpersSet.bottomCounter == 0) {
                    bumpers[2].state = 1;
                }
                if (raiseBumpersSet.bottomCounter == 2) {
                    bumpers[2].state = 3;
                }

            }
        }
    }


};
