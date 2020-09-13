import { Map } from "./map";
import { makePhysicsWorld, initVPos, VPos, Poly, polyCircleSat, circleCircleSat, PhysicsWorld, vPosExpulsion } from "./physics";
import { Renderer, InputStatus, InputRight, InputLeft, InputUp, InputDown, InputB, InputA, titleScreenText, entrypointMode } from "./entrypoint";
import { v2, v2Sub, v2Mul, v2Add, v2Normalize, v2TransformAffine, v2Length, v2Floor } from "./vector";
import { v3, v3Sub, v3Mul, v3Copy } from "./vector3";
import { emptyArray } from "./utils";
import { Entity, entitiesUpdate, entitiesCreate, EntityPlunger, EntityPlayerBall } from "./entities/entities";
import { fixedFramerate, playerBallRad, climbHeight } from "./constants";
import { floor, cos, TWO_PI, sin, abs } from "./mathUtils";
import { PlayerBall } from "./entities/playerBall";
import { addText, setText } from "./renderer/webgl";

export interface Ingame {
    update(input: InputStatus, dt: number): void;
    createEntity(type: number, ...params: any[]): Entity;
    ball: PlayerBall;
    map: Map;
    entities: Entity[];
    physicsWorld: PhysicsWorld;
    cameraDst: v3;
    targets: { [k: string]: v3 };
    onReset: (() => void)[];
    score: number;
    resetBallPos: v3;
    topUI: HTMLDivElement;
    dialogUI: HTMLDivElement;
    clock: number;
    textSequenceId: number;
    textClock: number;
    lives: number;
    renderedFrames: number;
}


export const textSequences = [
    0,
    "They took my sisters and brothers… My family…",
    "… Mercilessly seized to be shoved into war foundries…",
    "… to be melted to form his army and weapons",
    "I will save my people...<br>They want the metal from my body but…",
    "They will<br><big>NOT FOUND</big><br>me!", //5 
    0,
    "CHECKPOINT!", //7
    0,
    "Time to storm his castle!", //9
    0,
];

const ingameLogic = (dt: number, ingame: Ingame, input: InputStatus) => {
    const { ball } = ingame;


    // Trigger reset
    if (ball.pos[2] < -15) {
        ball.pos[0] = ball.prevPos[0] = ingame.resetBallPos[0];
        ball.pos[1] = ball.prevPos[1] = ingame.resetBallPos[1];
        ball.pos[2] = ball.prevPos[2] = ingame.resetBallPos[2];
        ball.pinballLock = 0;
        ball.inputLock = 0;
        ingame.lives--;
        if (ingame.lives <= 0) {
            setText(titleScreenText, "YOU<br>ARE<br>DEAD", 1);
            ingame.topUI.remove();
            ingame.dialogUI.remove();
            entrypointMode.val = 2;
            return;
        }
        ingame.onReset.map(x => x());
    }

    // Entities 
    for (let e of ingame.entities) {
        entitiesUpdate[e.type](e, input, dt, ingame);
    }

    ingame.clock += dt;
    ingame.textClock += dt * 0.000175;

}

export const makeIngame = (map: Map, renderer: Renderer): Ingame => {
    const physicsWorld = makePhysicsWorld();

    let remainDt = 0;
    const [renderIngame] = renderer;

    const entities: Entity[] = [];

    const ingame = {
        update(input: InputStatus, dt: number) {
            remainDt += dt;
            while (remainDt >= fixedFramerate) {
                ingameLogic(fixedFramerate, ingame, input);
                physicsWorld.update(fixedFramerate);
                remainDt -= fixedFramerate;
            }

            ingame.renderedFrames++;
            const minutes = `${Math.floor(ingame.clock / 60000)}`.padStart(2, `0`);
            const seconds = `${Math.floor(ingame.clock / 1000) % 60}`.padStart(2, `0`);
            const cents = `${Math.floor(ingame.clock) % 1000}`.padStart(3, `0`);


            if (ingame.renderedFrames % 5 == 0) {
                setText(ingame.topUI, `${"🔴".repeat(ingame.lives)}\nScore: ${`${ingame.score}`.padStart(8, "0")}\nTime: ${minutes}:${seconds}:${cents}`);
                if (textSequences[ingame.textSequenceId]) {
                    if (ingame.textClock < 1) {
                        setText(ingame.dialogUI, textSequences[ingame.textSequenceId] as string, 1);
                    } else {
                        ingame.textClock = 0;
                        ingame.textSequenceId++;
                    }
                } else {
                    setText(ingame.dialogUI, "");
                }
            }

            renderIngame(dt, ingame, remainDt / fixedFramerate);
        },
        createEntity(type: number, ...params: any[]) {
            const entity = (entitiesCreate[type] as any)(ingame, ...params);
            entities.push(entity);
            return entity;
        },
        ball: null as any,
        map,
        entities,
        physicsWorld,
        score: 0,
        cameraDst: [0, 0, 0],
        targets: {},
        onReset: [],
        resetBallPos: [] as v3,
        topUI: addText(3, 3, 1.2, 0),
        dialogUI: addText(50, 34, 1, 1),
        clock: 0,
        textSequenceId: 1,
        textClock: 0,
        lives: 5,
        renderedFrames: 0,
    };

    for (let e of map.entities) {
        if (e[0] < 0) {
            (ingame as Ingame).targets[e[1][3] as string] = [...e[1]];
        } else {
            ingame.createEntity(e[0], ...e[1]);
        }
    }

    ingame.resetBallPos = (ingame as Ingame).targets["b"];

    ingame.ball = ingame.createEntity(EntityPlayerBall, ...(ingame as Ingame).targets["b"]);


    return ingame;
}
