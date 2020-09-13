import { InputStatus, InputB, InputA, entrypointMode, titleScreenText } from "../entrypoint";
import { EntityPinballDoor, EntityRaiseBumpersSet } from "./entities";
import { playerBallRad, fixedFramerate } from "../constants";
import { Ingame } from "../ingame";
import { clamp, wrap, atan2, TWO_PI, PI, PI_2, PI_4, max } from "../mathUtils";
import { gravityImpulse, exponentialImpulseOut, exponentialImpulse, onePointSpline } from "../tweens";
import { v3Add, v3Sub, v3, v3Length, v3Normalize, v3Mul, v3Copy } from "../vector3";
import { initVPos, VPos, circleCircleSat, polyCircleSat, vPosExpulsion, offsetScalePoly } from "../physics";
import { v2Add, v2Rotate, v2, v2Mul } from "../vector";
import { RaiseBumpersSet } from "./raiseBumpersSet";
import { setText } from "../renderer/webgl";


export interface PinballDoor extends VPos {
    type: typeof EntityPinballDoor;
    initialPos: v3;
    bumperSet: RaiseBumpersSet;
    hitDebounce: number;
    hits: number;
}

const hitDebounceSeconds = 0.2;

export const createPinballDoor = (ingame: Ingame, x: number, y: number, z: number): PinballDoor => {
    const pinballDoor = initVPos({
        type: EntityPinballDoor,
        initialPos: [x, y, z],
        bumperSet: ingame.createEntity(EntityRaiseBumpersSet, x, y + 4, z) as RaiseBumpersSet,
        hitDebounce: 0,
        hits: 0,
    }, x, y, z);

    return pinballDoor;
}

export const updatePinballDoor = (pinballDoor: PinballDoor, input: InputStatus, dt: number, ingame: Ingame) => {
    const { ball } = ingame;
    const { pos, initialPos } = pinballDoor;

    const curPolygon = offsetScalePoly([
        [-2, -0.1],
        [-2, 0.2],
        [2, 0.2],
        [2, -0.1],
    ], pos, [1, 1]);

    const satResult = polyCircleSat(curPolygon, ball.pos, playerBallRad);
    let yOffset = 0;

    if (pinballDoor.hitDebounce > 0) {
        pinballDoor.hitDebounce = max(0, pinballDoor.hitDebounce - dt * 0.001 / hitDebounceSeconds);
        yOffset = 1;
    }

    if (satResult) {
        vPosExpulsion(ball, satResult, 0.8);
        if (pinballDoor.hitDebounce == 0) {

            if (pinballDoor.hits <= 6) {
                pinballDoor.hitDebounce = 1;
                pinballDoor.hits++;


                if (pinballDoor.hits == 1) {
                    pinballDoor.bumperSet.state = 1;
                }
                if (pinballDoor.hits == 2) {
                    pinballDoor.bumperSet.state = 3;
                }
                //if (pinballDoor.hits == 6) {
                //    pinballDoor.bumperSet.state = 3;
               // }
            } else {
                if (pinballDoor.bumperSet.isDead) {
                    setText(titleScreenText, "You Won!", 1);
                    ingame.topUI.remove();
                    ingame.dialogUI.remove();
                    entrypointMode.val = 2;
                }
            }
        }
    }

    if(pinballDoor.bumperSet.isDead) {
        yOffset=10;
    }

    pos[2] = initialPos[2] + yOffset;


};
