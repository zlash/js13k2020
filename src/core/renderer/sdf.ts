import {
    v3, v3Sub, v3Abs, v3Length,
    v3MaxScalar, v3Normalize, v3Add,
    v3Mul, v3Div, m4AxisAngleRotation,
    m4, m4v3Multiply, m4AxisAngleRotationCosSin,
    v3Cross, v3Dot, m4Multiply, v3Clamp, v3Round, v3MulV, v3Mod,
} from "../vector3";
import { min, max, abs, clamp, sign, ceil, SQRT1_2, PI_4, floor, PI } from "../mathUtils";
import {
    v2Sub, v2Add, v2Div, v2MulV,
    v2DivV, v2Abs, v2Dot, v2NegDot,
    v2Mul, v2, v2Length, v2Max,
    v2MaxScalar,
    v2Normalize,
} from "../vector";
import { forCallback, getLocalStorageObj, setLocalStorageObj, newFloat32Array, splitCondensedString } from "../utils";
import { spritesQualityRes, sdfMaxDepth, sdfMaxSteps, sdfDistanceThreshold, DEBUG } from "../constants";


export interface SdfPixelData {
    w: number;
    h: number;
    data: Float32Array;
    materialData: Uint8Array;
}

export interface BoundedSdf {
    pixelData: SdfPixelData;
    extents: number[];
    solidQuad: number[];
}

export const positionalParametersCodes = "$#";

export type sdfFunc = (p: v3, ...rest: any[]) => number;


export const sdfBox = (p: v3, rad: v3) => {
    const q = v3Sub(v3Abs(p, [] as any as v3), rad);
    return v3Length(v3MaxScalar(q, 0.0, [])) + min(max(q[0], max(q[1], q[2])), 0.0);
}

export const sdfPlane = (p: v3, n: v3) => {
    return v3Dot(p, n);
}

export const sdfSphere = (p: v3, rad: number) => {
    return v3Length(p) - rad;
}

export const sdfCone = (p: v3, angleX: number, angleY: number, height: number) => {
    const q = v2Length([p[0], p[2]]);
    return max(v2Dot([angleX, angleY], [q, p[1]]), -height - p[1]);
}


export const sdfCylinder = (p: v3, rad: number, len: number) => {
    const d = v2Sub(v2Abs([v2Length([p[0], p[2]]), p[1]]), [len, rad]);
    return min(max(d[0], d[1]), 0) + v2Length(v2Max(d, [0, 0]));
}

export const sdfTorus = (p: v3, rad: v2) => {
    const q = [v2Length([p[0], p[2]]) - rad[0], p[1]];
    return v2Length(q) - rad[1];
}
const sdfExtrude = (p: v3, sdf2d: (p2: v2) => number, h: number) => {
    const d = sdf2d(p as any as v2);
    const w = [d, abs(p[2]) - h];
    return min(max(w[0], w[1]), 0) + v2Length(v2MaxScalar(w, 0));
}

// new pos, scale, offset
type SdfTransform = [v3, number, number];
type SdfFunc = (_p: v3) => number;
type SdfFuncWithParams = (_p: v3, params: any[]) => number;

export const sdfSymmetry = (_p: v3, sdf: SdfFunc, symX?: boolean, symY?: boolean, symZ?: boolean) => {
    const tPos = [
        symX ? abs(_p[0]) : _p[0],
        symY ? abs(_p[1]) : _p[1],
        symZ ? abs(_p[2]) : _p[2],
    ];
    return sdf(tPos);
}

export const sdfFlip = (pos: v3, params: any[]) => {
    return params[3](v3MulV(params, pos, []));
}

export const sdfScale = (pos: v3, params: any[]) => {
    return params[1](v3Div(pos, params[0], [])) * params[0];
}

export const sdfTranslate = (pos: v3, params: any[]) => {
    const tPos = v3Sub(pos, params, []);
    return params[3](tPos);
}


export const sdfMatrix = (pos: v3, matrix: m4, sdf: SdfFunc) => {
    return sdf(m4v3Multiply(matrix, pos, []));
}

export const sdfElongate = (pos: v3, params: any[]) => {
    const q = v3Sub(pos, v3Clamp(pos, v3Mul(params, -1, []), params, []), []);
    return params[3](q);
}

// extents / spacing
// 0,1,2 extents
// 3, spacind
// 4, SDF
export const sdfFiniteRepetition = (pos: v3, params: any[]) => {
    /* const c = params[3];
     const toClamp = v3Round(v3Div(pos, c, []));
     const clamped = clamp(toClamp, v3Mul(params, -1, []), params);
 
     return params[4](v3Sub(pos, v3Mul(clamped, c), []));*/
    return params[4](v3Sub(v3Mod(v3Add(v3Mul(params, 0.5, []), pos), params), v3Mul(params, 0.5, [])));
}



export const pxToExtent = (res: number, extent: number, offset: number, px: number) => {
    return (2 * (px / (res - 1)) - 1) * extent + offset;
}

const defaultRenderRes = 128;

export const renderSdf = (sdfstr: string, view: m4, invView: m4, depthOnly: number, res: number | undefined, viewExtents: number[], posParam: number[]): SdfPixelData => {
    res = res || defaultRenderRes;
    const imgW = ceil(viewExtents[2] * res * 2);
    const imgH = ceil(viewExtents[3] * res * 2);

    const sdfRpn = splitCondensedString(sdfstr).map(x => {
        const f = parseFloat(x);
        return f != f ? x : f;
    });

    const curMaterial = [0];

    const buildSdfEval = () => {
        let rpnPos = 0;
        const stack: any[] = [];
        const sPush = (x: any) => stack.push(x);
        const sPop = () => stack.pop();

        const sPushSdfFunction = (sdfFunc: SdfFuncWithParams, nPops: number) => {
            const pops = stack.splice(-nPops).reverse();
            sPush((_p: v3) => sdfFunc(_p, pops));
        }

        while (rpnPos < sdfRpn.length) {
            const curVal = sdfRpn[rpnPos];

            const posParamIdx = positionalParametersCodes.indexOf(curVal as string);
            if (posParamIdx >= 0) {
                sPush(posParam?.[posParamIdx] || 0);
            } else {
                const codes: any = {
                    // Material
                    "a": () => sPushSdfFunction(
                        (_p: v3, params: any[]) => {
                            const d = params[1](_p);
                            if (!curMaterial[0] && d < sdfDistanceThreshold) {
                                curMaterial[0] = params[0];
                            }
                            return d;
                        }, 2),

                    // Binary Ops
                    "i": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            max(params[1](_p), params[0](_p))
                        , 2),
                    "b": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            max(params[1](_p), -params[0](_p))
                        , 2),
                    "u": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            min(params[1](_p), params[0](_p))
                        , 2),
                    "o": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            abs(params[1](_p)) - params[0]
                        , 2),
                    "m": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            (params[1](_p) - params[0])
                        , 2),


                    // Transforms 
                    "q": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfSymmetry(_p, params[0], true, false, true)
                        , 1),
                    "r": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfSymmetry(_p, params[0], true, false, false)
                        , 1),
                    "l": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfFlip(_p, params)
                        , 4),

                    "y": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfMatrix(_p, m4AxisAngleRotation([0, 1, 0], params[0], []), params[1])
                        , 2),

                    "x": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfMatrix(_p, m4AxisAngleRotation([1, 0, 0], params[0], []), params[1])
                        , 2),

                    "t": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfTranslate(_p, params)
                        , 4),
                    "s": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfScale(_p, params)
                        , 2),
                    "e": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfElongate(_p, params)
                        , 4),
                    "f": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfFiniteRepetition(_p, params)
                        , 5),

                    // Shapes 
                    "P": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfPlane(_p, v3Normalize(params))
                        , 3),
                    "B": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfBox(_p, params)
                        , 3),
                    "S": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            sdfSphere(_p, params[0])
                        , 1),

                    "C": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            (sdfCylinder as any)(_p, ...params)
                        , 2),
                    "O": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            (sdfCone as any)(_p, ...params)
                        , 3),
                    "U": () => sPushSdfFunction(
                        (_p: v3, params: any[]) =>
                            (sdfTorus as any)(_p, params)
                        , 2),

                    "p": () => sPush(sPop() * PI),
                };
                codes[curVal] ? codes[curVal]() : sPush(curVal);
            }
            rpnPos++;
        }

        return stack[0];
    };

    const sdfEval = buildSdfEval();

    const raymarch = (origin: v3, direction: v3, viewMatrix: m4) => {
        let rayPos = 0.1;
        for (let i = 0; i < sdfMaxSteps && rayPos < sdfMaxDepth * 2; i++) {
            let v = v3Add(v3Mul(direction, rayPos, [] as any), origin);

            const pos = m4v3Multiply(viewMatrix, v);
            const distToSurface = sdfEval(pos as any as v3);

            if (distToSurface < sdfDistanceThreshold) {
                return pos;
            }
            rayPos += distToSurface;
        }
    }

    const sampleNormal = (pos: v3) => {
        const e = [0.5773, -0.5773];
        const eps = 0.0001;
        const ret = [0, 0, 0] as any as v3;

        for (let i = 0; i < 4; i++) {
            const a = [0, 1, 1, 0];
            const x = a[i];
            const y = a[(i + 1) % 4];
            const z = [1, 0, 1, 0][i];
            const curE = [e[x], e[y], e[z]] as any as v3;
            v3Add(ret, v3Mul(curE, sdfEval(
                v3Add(pos, v3Mul(curE, eps, [] as any as v3), [] as any as v3)
            )));
        }

        return v3Normalize(ret);
    };




    const buffer = newFloat32Array(4 * imgW * imgH);
    const materialBuffer = new Uint8Array(3 * imgW * imgH);

    const deleteMeColorize = [Math.floor(Math.random() * 0x100), Math.floor(Math.random() * 0x100), Math.floor(Math.random() * 0x100)];

    //  [move/scale/rotate world]
    // x45 y45 

    const d = v3Normalize([-SQRT1_2, 0.5, -0.5]);
    const axi = v3Cross([0, 0, 1], d);
    const si = v3Length(axi);
    const co = v3Dot([0, 0, 1], d);

    //const view = m4AxisAngleRotationCosSin(v3Div(axi, si), co, si, []);
    //m4Translate(view, [0, 0, -2]);

    for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {

            const origin = [pxToExtent(imgW, viewExtents[2], viewExtents[0], x), pxToExtent(imgH, viewExtents[3], viewExtents[1], (imgH - 1 - y))];

            //const origin = v2Add(v2DivV([x * viewExtents[2], (imgH - 1 - y) * viewExtents[3]], [imgW, imgH] as any), [-viewExtents[0] - viewExtents[2] / 2, -viewExtents[1] - viewExtents[3] / 2]);

            curMaterial[0] = 0;
            const c = raymarch([...origin, sdfMaxDepth] as any, v3Normalize([0, 0, -1] as any), view);

            if (c) {
                const materialId = curMaterial[0];
                const pointInView = m4v3Multiply(invView, c, []);

                let normal = [0, 0, 0];

                if (!depthOnly) {
                    normal = sampleNormal(c as any as v3);
                }

                buffer[((y * imgW + x) * 4) + 0] = (normal[0] + 1) / 2;
                buffer[((y * imgW + x) * 4) + 1] = (normal[1] + 1) / 2;
                buffer[((y * imgW + x) * 4) + 2] = (normal[2] + 1) / 2;
                buffer[((y * imgW + x) * 4) + 3] = ((pointInView[2] / sdfMaxDepth) + 1) / 2;


                materialBuffer[((y * imgW + x) * 3) + 0] = materialId;
                materialBuffer[((y * imgW + x) * 3) + 1] = 0;
                materialBuffer[((y * imgW + x) * 3) + 2] = 0;

            } else {
                /*buffer[((y * imgW + x) * 4) + 0] = 0;
                buffer[((y * imgW + x) * 4) + 1] = 0;
                buffer[((y * imgW + x) * 4) + 2] = 0;*/
                buffer[((y * imgW + x) * 4) + 3] = 0;
            }
        }
    }

    return {
        w: imgW,
        h: imgH,
        data: buffer,
        materialData: materialBuffer,
    };
}

const initialExtent = 25;

export const getSdfBounds = (sdfstr: string, view: m4, invView: m4, posParam: number[]) => {

    const tightenBounds = (res: number, extents: number[]) => {

        // Calculate wanted resolution to counter renderSdf resolution calculation
        const maxExtent = max(extents[2], extents[3]);
        const targetResolution = res = 1 + 1 / (maxExtent * 2);


        const { w, h, data } = renderSdf(sdfstr, view, invView, 1, targetResolution, extents, posParam);
        const minMax = [[2 * initialExtent, -2 * initialExtent], [2 * initialExtent, -2 * initialExtent]];


        let noHit = 1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3]) {
                    minMax[0][0] = min(minMax[0][0], pxToExtent(w, extents[2], extents[0], x - 1));
                    minMax[0][1] = max(minMax[0][1], pxToExtent(w, extents[2], extents[0], x + 1));
                    minMax[1][0] = min(minMax[1][0], pxToExtent(h, extents[3], extents[1], (h - 1 - y) - 1));
                    minMax[1][1] = max(minMax[1][1], pxToExtent(h, extents[3], extents[1], (h - 1 - y) + 1));
                    noHit = 0;
                }
            }
        }

        if (noHit) {
            return extents;
        }


        return [
            (minMax[0][0] + minMax[0][1]) / 2, (minMax[1][0] + minMax[1][1]) / 2,
            (minMax[0][1] - minMax[0][0]) / 2, (minMax[1][1] - minMax[1][0]) / 2,
        ];
    };

    let extents = [0, 0, initialExtent, initialExtent];


    [6, 15].forEach(x => {
        extents = tightenBounds(x, [...extents]);
    });


    return extents;
}

export const findSolidQuad = (px: SdfPixelData) => {
    let pos = [
        floor(px.w / 2),
        floor(px.h / 2),
        floor(px.w / 2),
        floor(px.h / 2),
    ];
    const wnesLocks = [0, 0, 0, 0];

    const quadHit = (pos: number[]) => {
        if (pos[0] < 0 || pos[1] < 0 || pos[2] > px.w || pos[3] > px.h) {
            return 1;
        }

        for (let y = pos[1]; y < pos[3]; y++) {
            for (let x = pos[0]; x < pos[2]; x++) {
                if (!px.data[(y * px.w + x) * 4]) {
                    return 1;
                }
            }
        }

        return 0;
    };

    let keepOn = 1;
    while (keepOn) {
        keepOn = 0;
        for (let i = 0; i < 4; i++) {
            if (!wnesLocks[i]) {
                keepOn = 1;
                const posToTry = [...pos];
                posToTry[i] += i < 2 ? -1 : 1;
                if (quadHit(posToTry)) {
                    wnesLocks[i] = 1;
                } else {
                    pos = posToTry;
                }
            }
        }
    }

    return pos;
}

export const renderSdfSprite = (sdfstr: string, view: m4, invView: m4, depthOnly: number, posParam: number[]): BoundedSdf => {

    const render = () => {
        const extents = getSdfBounds(sdfstr, view, invView, posParam);
        const pixelData = renderSdf(sdfstr, view, invView, depthOnly, spritesQualityRes / 4, extents, posParam);

        const solidQuad = findSolidQuad(pixelData);

        return { pixelData, extents, solidQuad };
    };

    if (0) {
        const sdfKey = sdfstr + view.join(",") + posParam.join(",");
        let renderedSdfSprite = getLocalStorageObj(sdfKey);

        if (!renderedSdfSprite) {
            renderedSdfSprite = render();
            setLocalStorageObj(sdfKey, renderedSdfSprite);
        }

        return renderedSdfSprite;
    } else {
        return render();
    }
}

type InterpolatorCallback = (normalizedFrameNumbers: number[], frameNumber: number[]) => number;

export const renderSdfSpriteAnim = async (sdfstr: string, view: m4, invView: m4, depthOnly: number, framesPerDimension: number[], interpolators: (InterpolatorCallback | undefined)[]) => {
    const spritePromises: Promise<BoundedSdf>[] = [];
    let totalCount = 0;
    let currentCount = 0;

    const nestedLoops = (compoundIndex: number[]) => {
        forCallback(framesPerDimension[compoundIndex.length], (i) => {
            const newCompoundIndex = [...compoundIndex, i];
            if (compoundIndex.length === framesPerDimension.length - 1) {
                const normalizedFrameIndices = newCompoundIndex.map((nc, nci) => nc / (framesPerDimension[nci] - 1));
                const promise = new Promise<BoundedSdf>((resolve) => {
                    setTimeout(() => {
                        totalCount++;
                        const spr = renderSdfSprite(sdfstr, view, invView, depthOnly, newCompoundIndex.map((x, idx) => (
                            (interpolators[idx] && (interpolators[idx] as any)(normalizedFrameIndices, newCompoundIndex)) || 0
                        )));
                        currentCount++;
                        console.log(`Loaded ${currentCount} / ${totalCount}`);
                        resolve(spr);
                    }, 0);
                });
                spritePromises.push(promise);
            } else {
                nestedLoops(newCompoundIndex);
            }
        });
    };

    nestedLoops([]);

    return [await Promise.all(spritePromises), framesPerDimension];
}
