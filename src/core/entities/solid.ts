import { InputStatus, InputB, InputA } from "../entrypoint";
import { EntitySolid } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame, makeIngame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4 } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion, offsetScalePoly } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";

export const SolidPinballSide: 0 = 0;
export type SolidId = typeof SolidPinballSide;

export interface Solid extends VPos {
    type: typeof EntitySolid;
    id: SolidId;
    flip: v2;
}

export const solidPolygons = [
    [
        [0, 0],
        [-4, -4],
        [-4, 2],
        [0, 2],
    ],
];


export const createSolid = (ingame: Ingame, x: number, y: number, z: number, id: SolidId, flipX: number, flipY: number): Solid => {
    const solid = initVPos({
        type: EntitySolid,
        id,
        flip: [flipX || 1, flipY || 1],
    }, x, y, z);
    return solid;
}

export const updateSolid = (solid: Solid, input: InputStatus, dt: number, ingame: Ingame) => {
    const { ball } = ingame;

    const curPolygon = offsetScalePoly(solidPolygons[solid.id],solid.pos,solid.flip);

    const satResult = polyCircleSat(curPolygon, ball.pos, playerBallRad);
    if (satResult) {
        vPosExpulsion(ball, satResult,0.85);
    }


};