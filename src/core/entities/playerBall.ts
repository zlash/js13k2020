import { InputStatus, InputB, InputA, InputRight, InputLeft, InputUp, InputDown, mouseStatus, kickBuffer } from "../entrypoint";
import { EntityPlayerBall } from "./entities";
import { playerBallRad, fixedFramerate, climbHeight } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4 } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul, v2Sub, v2Normalize } from "../vector";
import { playAudio } from "../audio/audio";


export interface PlayerBall extends VPos {
    type: typeof EntityPlayerBall;
    pinballLock: number;
    inputLock: number;
}

export const createPlayerBall = (ingame: Ingame, x: number, y: number, z: number): PlayerBall => {
    const playerBall = initVPos({
        type: EntityPlayerBall,
        pinballLock: 0,
        inputLock: 0,
    }, x, y, z);
    ingame.physicsWorld.addElement(playerBall);
    return playerBall;
}

export const updatePlayerBall = (ball: PlayerBall, input: InputStatus, dt: number, ingame: Ingame) => {
    const { map, targets } = ingame;
    const { physicalDataAtPoint, circularCollision } = map;
    const a = 0.021 * fixedFramerate;

    // Pinball Gravity!
    if (ball.pinballLock) {
        if (ball.pos[2] - ball.prevPos[2] >= -0.1) {
            ball.a[1] = 0.035 * fixedFramerate;
        }
        v3Copy(ingame.cameraDst, targets["p"]);
    } else {
        v3Copy(ingame.cameraDst, ball.pos);
    }

    // Real gravity
    ball.a[2] = -0.05 * fixedFramerate;

    // Friction
    const friction = 0.028; //0.03
    v2Add(ball.prevPos, v2Mul(v2Sub(ball.pos, ball.prevPos, [] as any), friction));


    if (input[InputA]) {
        console.log(ball.pos);
    }

    if (!ball.inputLock) {
        if (mouseStatus.buttons[0]) {
            const mouseDir = v2Normalize(v2Rotate([mouseStatus.pos[0], mouseStatus.pos[1] * 1.4], -PI_4, []));
            v2Add(ball.a, v2Mul(mouseDir, a));
        }
    }


    if (!ball.inputLock) {
        // Input
        if (input[InputRight]) {
            ball.a[0] += a;
            // ball.a[1] -= a;
        }
        if (input[InputLeft]) {
            ball.a[0] -= a;
            //ball.a[1] += a;
        }
        if (input[InputUp]) {
            //ball.a[0] -= a;
            ball.a[1] -= a;
        }
        if (input[InputDown]) {
            //ball.a[0] += a;
            ball.a[1] += a;
        }
    }

    // Tiles Interaction

    const tileData = physicalDataAtPoint(ball.pos);

    if (tileData) {
        if (tileData.normal) {
            v2Add(ball.a, v2Mul(tileData.normal, a * 0.7, [] as any));
        }

        const expulsion = circularCollision(ball.pos, playerBallRad, true);
        if (expulsion) {
            vPosExpulsion(ball, expulsion);
        }

        const df = tileData.height - ball.pos[2];

        if (df > 0) {
            if (df < climbHeight) {
                ball.pos[2] += df;
                const fallD=ball.prevPos[2] - ball.pos[2]
                if (fallD > 0.02) {
                    playAudio(kickBuffer, Math.random() * 600, fallD);
                }
                ball.prevPos[2] = ball.pos[2];

            }
        }
    }



};
