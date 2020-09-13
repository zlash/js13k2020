import { floor, max, min } from "../mathUtils";
import { forCallback } from "../utils";

let audioCtx: AudioContext;
let compressorNode: DynamicsCompressorNode;

declare const webkitAudioContext: any;

const sampleRate = 48000;


const testString = "0,330,T,-2,3,f,0,330,T,12,330,S,3,-5,f";

interface AudioNodePipe<T> {
    in: T;
    out: T;
}

interface OscNode {
    osc: AudioBufferSourceNode | OscillatorNode;
    gain: GainNode;
    targets: { oscIdx: number; code: number; }[]; // 0: Amplitude, 1: Frequency
}

interface FilterNode {
    filterPipe: AudioNodePipe<BiquadFilterNode>;
    filters: BiquadFilterNode[];
    cutEnvelope?: number[];
}

export const buildInstrumentGraph = (ctx: OfflineAudioContext, code: string, releaseSeconds: number) => {
    const stack: any = [];
    const oscs: OscNode[] = [];
    const filters: FilterNode[] = [];

    const push = (x: any) => {
        stack.push(x);
    };

    const pop = () => stack.pop();

    const popN = (n: number) => {
        const params: any[] = [];
        forCallback(n, i => params.push(pop()));
        return params;
    }

    const popEnvelope = () => {
        console.log("PRE ENVELOPE STACK", stack);
        const pairs = pop();
        return popN(pairs * 2);
    }

    const getCurOsc = () => {
        return oscs.reverse()[0];
    }

    const getCurFilter = () => {
        return filters.reverse()[0];
    }

    const addFilter = (filterType: string, cut: number, q: number) => {
        const filter = ctx.createBiquadFilter();
        filter.type = ({
            "L": "lowpass",
            "H": "highpass",
        } as any)[filterType];
        filter.frequency.value = cut;
        filter.Q.value = q;

        filters.push({ filterPipe: { in: filter, out: filter }, filters: [filter] });
        /*
                const otro = ctx.createBiquadFilter();
                otro.type = "lowpass"
                otro.frequency.value = cut;
                otro.Q.value = q;
        
                filter.connect(otro);
        
                filters.push({ filterPipe: { in: filter, out: otro }, filters: [filter, otro] });
                */
    };

    const addOsc = (waveCode: string, volume: number, detuneSemitones: number) => {
        let osc: (AudioBufferSourceNode | OscillatorNode) = ctx.createOscillator();

        if (waveCode == "N") { // Noise
            osc = ctx.createBufferSource();
            const audioLen = 1 * sampleRate;
            const noiseBuffer = ctx.createBuffer(2, audioLen, sampleRate);

            for (let i = 0; i < 2; i++) {
                const channelData = noiseBuffer.getChannelData(i);
                for (let j = 0; j < channelData.length; j++) {
                    channelData[j] = Math.random() * 2 - 1;
                }
            }
            osc.buffer = noiseBuffer;
        }
        else {
            osc.detune.value = detuneSemitones * 100;
            osc.type = ({
                "S": "sine",
                "T": "triangle",
                "W": "sawtooth",
                "Q": "square",
                "M": "sawtooth",
            } as any)[waveCode];
        }
        const gain = ctx.createGain();
        gain.gain.value = volume;
        osc.connect(gain);
        osc.start();
        oscs.push({
            osc,
            gain,
            targets: [],
        });
    }

    const envelopes: {
        volume?: number[];
    } = {};

    let gain = 1;

    for (let x of code.split(",")) {
        if ("STWQMN".includes(x)) {
            (addOsc as any)(x, ...popN(2));
        } else if ("LH".includes(x)) {
            (addFilter as any)(x, ...popN(2));
        } else {
            const funcs = {
                "a": () => { // Connect output to target amplitude
                    getCurOsc().targets.push({ oscIdx: pop(), code: 0 });
                },
                "f": () => { // Connect output to target frequency
                    getCurOsc().targets.push({ oscIdx: pop(), code: 1 });
                },
                "v": () => { // Volume Envelope
                    envelopes.volume = popEnvelope();
                },
                "c": () => { // Cut Envelope
                    getCurFilter().cutEnvelope = popEnvelope();
                },
                "g": () => gain = pop(),
                "X": () => { // Exponential wave

                },
            } as any;
            funcs[x] ? funcs[x]() : push(parseFloat(x));
        }
    }

    const connectEnvelopeToParam = (param: AudioParam, envelope: number[]) => {

        console.log("ORIGINAL", envelope);
        envelope = [0, 0, ...envelope]; // Add 0,0 "Initial anchor"

        console.log("Original anchored envelope", envelope);
        // Complete or remove sustain
        let sustainI = 0;
        for (; sustainI < envelope.length && envelope[sustainI] >= 0; sustainI += 2);

        // Sustain found
        if (sustainI < envelope.length) {
            const sustain = envelope[sustainI - 1];
            const prevI = sustainI - 2;
            const prevTime = envelope[sustainI - 2];
            const sustainDuration = releaseSeconds - prevTime;
            if (sustainDuration > 0) {
                envelope = [...envelope.slice(0, prevI + 1), sustain,
                prevTime + sustainDuration, sustain,
                envelope[sustainI + 2] + sustainDuration,
                ...envelope.slice(sustainI + 3)];
            } else {
                envelope = [...envelope.slice(0, prevI + 2), ...envelope.slice(sustainI + 2)];
            }
        }

        console.log("Sustain Removed Envelope", envelope);


        // Trim to release
        for (let i = 2; i < envelope.length; i += 2) {
            if (envelope[i] >= releaseSeconds) {
                const t = (releaseSeconds - envelope[i - 2]);
                const k = t / (envelope[i] - envelope[i - 2]);
                const v = k * envelope[i + 1] + (1 - k) * envelope[i - 1];

                const lastI = envelope.length - 2;

                envelope = [
                    ...envelope.slice(0, i),
                    envelope[i - 2] + t, v,
                    envelope[lastI],
                    envelope[lastI + 1]
                ];
                break;
            }
        }

        console.log("Processesd Envelope", envelope);


        for (let i = 0; i < envelope.length - 1; i += 2) {
            const envTime = envelope[i];
            const envValue = envelope[i + 1];
            console.log("RAMP TO", envTime, envValue)
            param.linearRampToValueAtTime(envValue, envTime);
        }
    };


    const envelopeGain = ctx.createGain();

    if (envelopes.volume) {
        connectEnvelopeToParam(envelopeGain.gain, envelopes.volume);
    } else {
        envelopeGain.gain.value = 1;
        envelopeGain.gain.setValueAtTime(0, releaseSeconds);
    }

    for (let o of oscs) {
        if (o.targets.length > 0) {
            for (let t of o.targets) {
                const tOsc = oscs[t.oscIdx];
                o.gain.connect([
                    tOsc.gain.gain,
                    tOsc.osc.detune,
                ][t.code]);
            }
        } else {
            o.gain.connect(envelopeGain);
        }
    }

    console.log("MASTER GAIN", gain);
    const masterGain = ctx.createGain();
    masterGain.gain.value = gain;



    if (filters.length > 0) {
        console.log("F", filters);
        envelopeGain.connect(filters[0].filterPipe.in);
        filters.forEach((x, i) => {
            if (x.cutEnvelope) {
                for (let f of x.filters) {
                    connectEnvelopeToParam(f.frequency, x.cutEnvelope);
                }
            }
            if (i > 0) {
                filters[i - 1].filterPipe.out.connect(x.filterPipe.in);
            }
        });
        filters[filters.length - 1].filterPipe.out.connect(masterGain);
    } else {
        envelopeGain.connect(masterGain);
    }

    return masterGain;
};


//
// Simpler samples for simpler times 
//  [
//      ...[Wave, Detune, Q, Cut, [GainEnvelope], [LowpassEnvelope]]
//  ]

interface InstrumentData {
    wavetype: number;
    detune: number;
    freq?: number;
    Q?: number;
    lowCut: number;
    gainEnvelope: any[];
    lowEnvelope?: any[];
}


export const WaveTypeNoise = -1;

export const renderToBuffer = (instrumentData: InstrumentData[], durationSeconds: number) => {
  /*  const ctx = new OfflineAudioContext(2, floor(durationSeconds * sampleRate), sampleRate);

    for (let inst of instrumentData) {

        let src: (AudioBufferSourceNode | OscillatorNode) = ctx.createOscillator();

        if (inst.wavetype < 0) { // Noise
            src = ctx.createBufferSource();
            const audioLen = 1 * sampleRate;
            const noiseBuffer = ctx.createBuffer(2, audioLen, sampleRate);

            for (let i = 0; i < 2; i++) {
                const channelData = noiseBuffer.getChannelData(i);
                for (let j = 0; j < channelData.length; j++) {
                    channelData[j] = Math.random() * 2 - 1;
                }
            }
            src.buffer = noiseBuffer;
        }
        else {
            src.detune.value = inst.detune;
            src.type = ([
                "sine",
                "sawtooth",
                "triangle",
                //"T": "triangle",
                //"W": "sawtooth",
                //"Q": "square",
                //"M": "sawtooth",
            ] as any)[inst.wavetype];
            src.frequency.value = inst.freq!;
        }

        const gain = ctx.createGain();
        gain.gain.value = 0;
        for (let e of inst.gainEnvelope) {
            gain.gain.linearRampToValueAtTime(e[1], e[0]);
        }

        if (inst.lowCut > 0) {
            const filter = ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = inst.lowCut;

            for (let e of inst.lowEnvelope!) {
                filter.frequency.linearRampToValueAtTime(e[1] * inst.lowCut, e[0]);
            }
            filter.Q.value = inst.Q!;
            src.connect(filter);
            filter.connect(gain);
        } else {
            src.connect(gain);
        }

        src.start();
        gain.connect(ctx.destination);

    }


    

    return ctx.startRendering();*/
}

export const initAudio = () => {
  /*  audioCtx = new (window.AudioContext || webkitAudioContext);
    compressorNode = audioCtx.createDynamicsCompressor();
    compressorNode.connect(audioCtx.destination);*/
}

export const playAudio = (buffer: AudioBuffer, detuneCents: number, gain?: number) => {
/*
    if (!audioCtx) {
        initAudio();
    }

    const bufSrc = audioCtx.createBufferSource();
    bufSrc.buffer = buffer;
    bufSrc.detune.value = detuneCents;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = gain || 0.75;

    bufSrc.connect(gainNode);
    gainNode.connect(compressorNode);
    bufSrc.start();*/
}