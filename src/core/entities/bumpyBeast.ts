import { InputStatus } from "../entrypoint";
import { EntityBumpyBeast } from "./entities";
import { playerBallRad } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat } from "../physics";
import { } from "../map";

export interface BumpyBeast extends VPos {
    type: typeof EntityBumpyBeast;
    pos: v3;
    chargeDirection: v3;
    state: number;
    angle: number;
    timer: number;
    z: number;

}

export const createBumpyBeast = (ingame: Ingame, x: number, y: number, z: number): BumpyBeast => {
    return initVPos({
        type: EntityBumpyBeast,
        chargeDirection: [0, 0, 0],
        state: 0,
        angle: 0,
        timer: 0,
        z: 0,
    }, x, y, z);
}

export const updateBumpyBeast = (bumpyBeast: BumpyBeast, input: InputStatus, dt: number, ingame: Ingame) => {
    const { state, pos, } = bumpyBeast;
    const direction = v3Sub(ingame.ball.pos, pos, []);
    const dirLength = v3Length(direction);
    const aimingDuration = 1;
    const jumps = 3;
    const attackDistance = 4.5;
    const chargeSeconds = 2;
    dt /= 1000;
    switch (state) {
        case 0: // Idle
            if (dirLength < attackDistance) {
                bumpyBeast.timer = 0;
                bumpyBeast.state = 1;
                bumpyBeast.z = pos[2];
            }
            break;
        case 1: // Aiming
            bumpyBeast.timer += dt;
            if (bumpyBeast.timer >= aimingDuration) {
                bumpyBeast.timer = 0;
                bumpyBeast.state = 2;
                bumpyBeast.pos[2] = bumpyBeast.z;
                v3Normalize(direction, bumpyBeast.chargeDirection);
                v3Copy(bumpyBeast.prevPos, bumpyBeast.pos);
            }
            bumpyBeast.pos[2] = bumpyBeast.z + gravityImpulse((bumpyBeast.timer * jumps / aimingDuration) % 1);
            break;
        case 2: // Charging
            bumpyBeast.timer += dt;

            const cs = circleCircleSat(ingame.ball.pos, playerBallRad, bumpyBeast.pos, 0.55);
            if (cs) {
                bumpyBeast.state = 0;
                v3Add(ingame.ball.a, v3Mul(bumpyBeast.chargeDirection, 12, []));
            }


            if (bumpyBeast.timer >= chargeSeconds) {
                bumpyBeast.state = 0;
                break;
            }
            const impulseT = bumpyBeast.timer / chargeSeconds;
            v3Add(
                bumpyBeast.prevPos,
                v3Mul(bumpyBeast.chargeDirection,
                    onePointSpline(0.2, 0.9, impulseT) * (attackDistance + 1), []),
                bumpyBeast.pos);
            break;
    }

    const dirForAngle = state === 2 ? bumpyBeast.chargeDirection : direction;

    //Auto height
    const tileData = ingame.map.physicalDataAtPoint(bumpyBeast.pos);
    if (tileData) {
        bumpyBeast.pos[2] = bumpyBeast.prevPos[2] = tileData.height;
    }

    bumpyBeast.angle = wrap(atan2(dirForAngle[1], dirForAngle[0]), 0, TWO_PI) / TWO_PI;
    if (bumpyBeast.angle < 0 || bumpyBeast.angle >= 1) {
        console.log(bumpyBeast.angle);
    }
    //    bumpyBeast.angle = ((2 * Math.PI + (Math.atan2(dirForAngle[1], dirForAngle[0]) - (1 + 1 / 32) * (Math.PI / 2))) % (2 * Math.PI)) / (2 * Math.PI);
};