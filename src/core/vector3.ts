
import { abs, max, clamp, sqrt, cos, sin, mix, round } from "./mathUtils";
import { v2 } from "./vector";

export type v3base = [number, number, number];
export type v4base = [number, number, number, number];
export type m4 = number[];

export type v4 = v4base | number[];
export type v3 = v4 | v3base | number[];

export const v3New = (x: number, y: number, z: number): v3 => {
    return [x, y, z];
}

export const v3Sub = (a: v3, b: v3, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = a[0] - b[0];
    dst[1] = a[1] - b[1];
    dst[2] = a[2] - b[2];
    return dst;
}

export const v3Add = (a: v3, b: v3, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = a[0] + b[0];
    dst[1] = a[1] + b[1];
    dst[2] = a[2] + b[2];
    return dst;
}

export const v3Copy = (a: v3, b: v3) => {
    a[0] = b[0];
    a[1] = b[1];
    a[2] = b[2];
}

export const v3Mul = (a: v3, k: number, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = a[0] * k;
    dst[1] = a[1] * k;
    dst[2] = a[2] * k;
    return dst;
}

export const v3MulV = (a: v3, b: v3, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = a[0] * b[0];
    dst[1] = a[1] * b[1];
    dst[2] = a[2] * b[2];
    return dst;
}

export const v3Div = (a: v3, k: number, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = a[0] / k;
    dst[1] = a[1] / k;
    dst[2] = a[2] / k;
    return dst;
}

export const v3Length = (a: v3) => {
    return sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export const v3Normalize = (a: v3, dst?: v3): v3 => {
    dst = dst || a;
    if (a[0] == 0 && a[1] == 0 && a[2] == 0) {
        dst[0] = dst[1] = dst[2] = 0;
    } else {
        const n = v3Length(a);
        dst[0] = a[0] / n;
        dst[1] = a[1] / n;
        dst[2] = a[2] / n;
    }
    return dst;
}

export const v3Abs = (a: v3, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = abs(a[0]);
    dst[1] = abs(a[1]);
    dst[2] = abs(a[2]);
    return dst;
}

export const v3Round = (a: v3, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = round(a[0]);
    dst[1] = round(a[1]);
    dst[2] = round(a[2]);
    return dst;
}


export const v3MaxScalar = (a: v3, k: number, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = max(a[0], k);
    dst[1] = max(a[1], k);
    dst[2] = max(a[2], k);
    return dst;
}

export const v3Clamp = (x: v3, a: v3, b: v3, dst?: v3): v3 => {
    dst = dst || x;
    dst[0] = clamp(x[0], a[0], b[0]);
    dst[1] = clamp(x[1], a[1], b[1]);
    dst[2] = clamp(x[2], a[2], b[2]);
    return dst;
}

export const v3Mod = (x: v3, m: v3, dst?: v3): v3 => {
    dst = dst || x;
    dst[0] = x[0] % m[0];
    dst[1] = x[1] % m[1];
    dst[2] = x[2] % m[2];
    return dst;
}

export const v3Mix = (a: v3, b: v3, ratio: number, dst?: v3): v3 => {
    dst = dst || a;
    dst[0] = mix(a[0], b[0], ratio);
    dst[1] = mix(a[1], b[1], ratio);
    dst[2] = mix(a[2], b[2], ratio);
    return dst;
}

export const v3Dot = (a: v3, b: v3) => {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export const v3Cross = (a: v3, b: v3, dst?: v3): v3 => {
    dst = dst || [...a];
    dst[0] = a[1] * b[2] - a[2] * b[1];
    dst[1] = a[2] * b[0] - a[0] * b[2];
    dst[2] = a[0] * b[1] - a[1] * b[0];
    return dst;
}


export const m4v4Multiply = (mat: m4, v: v4, dst?: v4): v4 => {
    dst = dst || [...v];
    for (let x = 0; x < 4; x++) {
        dst[x] = 0.0;
        for (let i = 0; i < 4; i++) {
            dst[x] += mat[i * 4 + x] * v[i];
        }
    }
    return dst;
}

export const m4v3Multiply = (mat: m4, v: v3, dst?: v4): v4 => {
    const toV4 = [...v, 1] as any;

    return m4v4Multiply(mat, toV4, dst);
}

export const m4TranslateRight = (mat: m4, v: v3, dst?: m4) => {
    dst = dst || mat;
    dst[12] = mat[12] + v[0];
    dst[13] = mat[13] + v[1];
    dst[14] = mat[14] + v[2];
    return dst;
}

export const m4Multiply = (a: m4, b: m4, dst?: m4) => {
    dst = dst || [...a];
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            let idx = x * 4 + y;
            dst[idx] = 0.0;
            for (let i = 0; i < 4; i++) {
                dst[idx] += a[i * 4 + y] * b[x * 4 + i];
            }
        }
    }
    return dst;
}

export const m4AxisAngleRotationCosSin = (axis: v3, ct: number, st: number, result: m4): m4 => {
    const omct = 1.0 - ct;

    result[3] = result[7] = result[11] = result[12] = result[13] = result[14] = 0;
    result[15] = 1;

    result[0] = ct + axis[0] * axis[0] * omct;
    result[1] = axis[0] * axis[1] * omct + axis[2] * st;
    result[2] = axis[0] * axis[2] * omct - axis[1] * st;

    result[4] = axis[0] * axis[1] * omct - axis[2] * st;
    result[5] = ct + axis[1] * axis[1] * omct;
    result[6] = axis[1] * axis[2] * omct + axis[0] * st;

    result[8] = axis[0] * axis[2] * omct + axis[1] * st;
    result[9] = axis[1] * axis[2] * omct - axis[0] * st;
    result[10] = ct + axis[2] * axis[2] * omct;

    return result;
}

export const m4AxisAngleRotation = (axis: v3, angle: number, result: m4) => {
    return m4AxisAngleRotationCosSin(axis, cos(angle), sin(angle), result);
}



