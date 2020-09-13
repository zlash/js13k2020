---
to: src/core/entities/<%= name %>.ts
---
import { InputStatus, InputB, InputA } from "../entrypoint";
import { Entity<%= Name %> } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4 } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";


export interface <%= Name %> extends VPos {
    type: typeof Entity<%= Name %>;
}

export const create<%= Name %> = (ingame: Ingame, x: number, y: number, z: number): <%= Name %> => {
    const <%= name %> = initVPos({
        type: Entity<%= Name %>,
    }, x, y, z);
    return <%= name %>;
}

export const update<%= Name %> = (<%= name %>: <%= Name %>, input: InputStatus, dt: number, ingame: Ingame) => {

};
