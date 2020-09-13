import { InputStatus, InputB, InputA, percBassBuffer } from "../entrypoint";
import { EntityCoins } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4, cos, sin, floor } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";
import { playAudio } from "../audio/audio";

const coinRad = 0.3;
const deathHeight = 3;

interface IndividualCoin {
    pos: v3,
    death: number,
}

export interface Coins extends VPos {
    type: typeof EntityCoins;
    radOrLineX?: number;
    lineY?: number;
    lineZ?: number;
    coinsCollection: (IndividualCoin | 0)[];
}

export const createCoins = (ingame: Ingame, x: number, y: number, z: number, radOrLineX?: number, lineY?: number, lineZ?: number): Coins => {

    let nCoins;

    if (lineY! >= 0) {
        // Do length
        nCoins = floor(v3Length([radOrLineX!, lineY!, lineZ!]) * 1.6);
    } else if (radOrLineX!) {
        // Do circumf
        nCoins = floor(TWO_PI * 1.2 * radOrLineX!);
    } else {
        nCoins = 1;
    }

    const coins = initVPos({
        type: EntityCoins,
        coinsCollection: new Array(nCoins).fill(0).map(x => ({ death: -1, pos: [0, 0] })),
        radOrLineX,
        lineY,
        lineZ,
    }, x, y, z + 1);
    return coins;
}

export const updateCoins = (coins: Coins, input: InputStatus, dt: number, ingame: Ingame) => {
    const { coinsCollection, pos } = coins;
    coinsCollection.forEach((c, idx) => {
        if (c) {
            const coinK = idx / (coinsCollection.length - 1);
            if (coins.lineY! >= 0) {
                v3Add(pos, v3Mul([coins.radOrLineX!, coins.lineY!, coins.lineZ!], coinK), c.pos);
            } else if (coins.radOrLineX) {
                const sx = coins.radOrLineX * sin(TWO_PI * coinK);
                const cx = coins.radOrLineX * cos(TWO_PI * coinK);
                v3Add(pos, [cx, sx, 0], c.pos);
            } else {
                v3Copy(c.pos, pos);
            }

            if (c.death >= 0) {
                c.death += dt * 0.0018;
                c.pos[2] += onePointSpline(0.1, 0.7, c.death) * deathHeight;
                if (c.death >= 1) {
                    coinsCollection[idx] = 0;
                }
            } else {
                const sat = circleCircleSat(ingame.ball.pos, playerBallRad, c.pos, coinRad);

                if (sat) {
                    ingame.score += 100;
                    playAudio(percBassBuffer, 2700, 0.04);
                    playAudio(percBassBuffer, 2700/2, 0.04);
                    c.death = 0;
                }
            }
        }
    });
};
