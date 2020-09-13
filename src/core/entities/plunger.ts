import { InputStatus } from "../entrypoint";
import { EntityPlunger } from "./entities";
import { Ingame } from "../ingame";
import { clamp, floor } from "../mathUtils";
import { exponentialImpulse } from "../tweens";
import { v3Add, v3 } from "../vector3";
import { circleCircleSat } from "../physics";

export interface Plunger {
    type: typeof EntityPlunger;
    pos: v3;
    plunger: number;
    state: number;
    frame: number;
    rotated: number;
}

export const createPlunger = (ingame: Ingame, x: number, y: number, z: number, rotated?: number): Plunger => {
    return {
        type: EntityPlunger,
        pos: [x, y, z],
        plunger: 0,
        state: 0,
        frame: 0,
        rotated: rotated || 0,
    };
}

export const updatePlunger = (plunger: Plunger, input: InputStatus, dt: number, ingame: Ingame) => {
    const rotDir = plunger.rotated ? -1 : 1;
    switch (plunger.state) {
        case 0:
            const cs = circleCircleSat(ingame.ball.pos, 0.4, v3Add(plunger.pos, [0, rotDir, 0], []), 0.4);
            if (cs) {
                plunger.state = 1;
            }
            break;
        case 1:
            plunger.plunger += dt * 0.01;
            if (plunger.plunger >= 1) {
                plunger.plunger = 1;
                plunger.state = 2;
                v3Add(ingame.ball.a, [0, 2 * dt * rotDir, 0]);
            }
            plunger.frame = floor(exponentialImpulse(plunger.plunger, 1) * 7.99);
            break;
        case 2:
            plunger.plunger -= dt * 0.003;
            if (plunger.plunger <= 0) {
                plunger.plunger = 0;
                plunger.state = 0;
            }
            plunger.frame = floor(plunger.plunger * 7.99);
            break;
    }

};