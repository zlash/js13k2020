import { InputStatus, InputB, InputA } from "../entrypoint";
import { EntityRaiseBumper, EntityAcolyte } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4 } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";
import { Acolyte } from "./acolyte";


export interface RaiseBumper extends VPos {
    type: typeof EntityRaiseBumper;
    h: number;
    state: number;
    clock: number;
    hitsCounter: number;
    acolytes: Acolyte | 0;

}

const maxHitsCounter = 10;
const raiseBumperRad = 1;
const raiseDuration = 0.25;

export const createRaiseBumper = (ingame: Ingame, x: number, y: number, z: number, state: number): RaiseBumper => {
    const raiseBumper = initVPos({
        type: EntityRaiseBumper,
        h: 0,
        clock: 0,
        hitsCounter: maxHitsCounter,
        acolytes: state == 2 ? (ingame.createEntity(EntityAcolyte, x, y, z) as Acolyte) : (0 as 0),
        state,
    }, x, y, z);
    return raiseBumper;
}

export const updateRaiseBumper = (raiseBumper: RaiseBumper, input: InputStatus, dt: number, ingame: Ingame) => {
    const { ball } = ingame;
    const { state, pos } = raiseBumper;

    const sat = circleCircleSat(ball.pos, playerBallRad, pos, raiseBumperRad);
    [
        () => {// 0: Closed 
            raiseBumper.h = 0;
            raiseBumper.clock = 0;
        },
        () => {// 1: Rising 
            if (raiseBumper.h >= 0.5) {
                raiseBumper.state = 2;
            } else {
                raiseBumper.h = 0.5 * onePointSpline(0.75, 0.9, raiseBumper.clock);
            }
        },
        () => {// 2: Risen 
            raiseBumper.h = 0.5;
            raiseBumper.clock = 0;
        },
        () => {// 3: Closing 
            if (raiseBumper.h <= 0) {
                raiseBumper.state = 0;
            } else {
                raiseBumper.h = 0.5 * (1 - onePointSpline(0.75, 0.9, raiseBumper.clock));
            }
        },
        () => {// 4: Full height and hittable
            raiseBumper.h = raiseBumper.hitsCounter / maxHitsCounter;
            if (raiseBumper.acolytes) {
                raiseBumper.acolytes.alive = raiseBumper.h;
            }
        }
    ]
    [state]();

    raiseBumper.clock += dt * 0.001 / raiseDuration;

    if (sat && state >= 1) {
        if (raiseBumper.hitsCounter > 0) {
            vPosExpulsion(ball, sat, 0.65);

            if (raiseBumper.clock > 0.5 && state == 4) {
                raiseBumper.clock = 0;
                raiseBumper.hitsCounter--;
            }
        }
    }

};
