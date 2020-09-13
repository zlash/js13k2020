import { makeMap } from "../core/map";
import { makeIngame, Ingame, textSequences } from "../core/ingame";
import { firstStage } from "../assets/maps/firstStage";
import { initAudio, playAudio, renderToBuffer } from "./audio/audio";
import { kick, percBass } from "./audio/instruments";
import { v2 } from "./vector";
import { mainDiv, addText, setText } from "./renderer/webgl";
import { DEBUG } from "./constants";

let ingame: Ingame;

// ingame, 
export type Renderer = [(dt: number, ingame: Ingame, restUnit: number) => void];

export type InputStatus = boolean[];

export let kickBuffer: AudioBuffer;
export let percBassBuffer: AudioBuffer;

export let someNote: AudioBuffer;


export const InputUp = 1;
export const InputRight = 2;
export const InputDown = 3;
export const InputLeft = 4;
export const InputB = 5;
export const InputA = 6;

interface MouseStatus {
    buttons: [number, number, number];
    pos: v2;
}

export const mouseStatus = {
    buttons: [0, 0, 0],
    pos: [0, 0]
} as MouseStatus;


export let titleScreenText: HTMLDivElement;
export let entrypointMode = { val: 0 };

export const init = async (protoRenderer: Renderer) => {

    const input: InputStatus = [];
    let start: number;

    /*

    "They took my sisters and brothers... My family..."
"All those souls marching into their foundries..."
"..to be melted into his army and weapons"
"Everyday their liberation seems harder, but..."
"They will NOT FOUND me!" 
    
    console.warn("CHECKPOINT!");
    console.warn("I must break that door if I want to enter the castle...");
    console.warn("He has taken most of my sisters and brothers. My family...");
    console.warn("All these souls being recasted into his own army and weapons...");
    console.warn("Everyday it's harder, everyday their liberation seems harder, but...");
    console.warn("THEY CAN NOT FOUND ME");
    */

    const DELETEME = {} as any;

    const keyHandler = (event: KeyboardEvent, value: boolean) => {
        if (!event.repeat) {

            if (DELETEME[event.code] === value) {
                console.log("DOUBLE PRESS!");
            }
            DELETEME[event.code] = value;

            const codes: any = {
                "ArrowDown": InputDown,
                "ArrowUp": InputUp,
                "ArrowLeft": InputLeft,
                "ArrowRight": InputRight,

                "KeyZ": InputB,
                "KeyX": InputA,
            };

            input[codes[event.code] || 0] = value;
        }
        event.preventDefault();
    }

    window.addEventListener('keydown', (event: KeyboardEvent) => {
        keyHandler(event, true);
    }, true);

    window.addEventListener('keyup', (event: KeyboardEvent) => {
        keyHandler(event, false);
    }, true);


    window.addEventListener('mousedown', (event: MouseEvent) => {
        mouseStatus.buttons[event.button] = 1;
    });
    window.addEventListener('mouseup', (event: MouseEvent) => {
        mouseStatus.buttons[event.button] = 0;
    });
    window.addEventListener('mousemove', (event: MouseEvent) => {
        const bRect = mainDiv.getBoundingClientRect();
        mouseStatus.pos[0] = event.clientX - (bRect.x + bRect.width / 2);
        mouseStatus.pos[1] = event.clientY - (bRect.y + bRect.height / 2);
    });


    kickBuffer = await renderToBuffer([
        {
            wavetype: -1,
            detune: 0,
            Q: 5,
            lowCut: 1000,
            lowEnvelope: [[0, 1], [0.3, 0.5]],
            gainEnvelope: [[0, 1], [0.3, 0]],
        }
    ], 3);

    percBassBuffer = await renderToBuffer([{
        wavetype: 2,
        freq: 440,
        detune: 0,
        Q: 60,
        lowCut: 3000,
        lowEnvelope: [[0, 0], [0.1, 0.2]],
        gainEnvelope: [[0, 1], [0.3, 0]],
    }], 2);

    someNote = await renderToBuffer([{
        wavetype: 1,
        freq: 440,
        detune: 1200,
        Q: 25,
        lowCut: 2000,
        lowEnvelope: [[0, 0], [0.6, 1]],
        gainEnvelope: [[0, 0], [0.05, 0.6], [0.3, 0.6], [0.4, 0.3], [0.8, 0]],
    }, {
        wavetype: 2,
        freq: 440,
        detune: 500,
        lowCut: 0,
        gainEnvelope: [[0, 0], [0.05, 0.8], [0.3, 0.8], [0.6, 0]],
    }], 5);

    let ingame: Ingame;

    titleScreenText = addText(50, 50, 4, 1);
    setText(titleScreenText, textSequences[5] as any, 1);

    let prevButton: number;
    let debounce = 0;

    const rafCallback = (timestamp: number) => {
        if (start === undefined) {
            start = timestamp;
        }
        const dt = timestamp - start;
        start = timestamp;

        const click = !mouseStatus.buttons[0] && prevButton;
        prevButton = mouseStatus.buttons[0];

        debounce -= dt;

        if (click && debounce < 0) {
            if (entrypointMode.val == 0) {//TitleScreen

                ingame = makeIngame(makeMap(firstStage), protoRenderer);
                entrypointMode.val = 1;
                setText(titleScreenText, "", 1);

            }
            if (entrypointMode.val == 2) {//Died or Won

                setText(titleScreenText, textSequences[5] as any, 1);
                entrypointMode.val = 0;
                debounce = 1;
            }
        }

        if (entrypointMode.val == 1) {//Ingame
            ingame.update(input, dt);
        } else {
            (protoRenderer[0] as any)();
        }
        //ingameUpdate(input, dt);
        window.requestAnimationFrame(rafCallback);
    };


    window.requestAnimationFrame(rafCallback);
};

if (DEBUG) {
    (window as any)["createAndPlay"] = async (instdata: any, dur: any) => {
        playAudio(await renderToBuffer(instdata, dur), 0);
    }
}


