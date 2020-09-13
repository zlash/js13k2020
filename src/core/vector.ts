
import { abs, max, sqrt, floor, sin, cos, atan2 } from "./mathUtils";
import { v3, v4 } from "./vector3";

export type v2base = [number, number];
export type v2 = v2base | v3 | v4 | number[];

export const v2New = (x: number, y: number): v2 => {
    return [x, y];
}

export const v2Sub = (a: v2, b: v2, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = a[0] - b[0];
    dst[1] = a[1] - b[1];
    return dst;
}

export const v2Add = (a: v2, b: v2, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = a[0] + b[0];
    dst[1] = a[1] + b[1];
    return dst;
}

export const v2Mul = (a: v2, k: number, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = a[0] * k;
    dst[1] = a[1] * k;
    return dst;
}

export const v2Div = (a: v2, k: number, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = a[0] / k;
    dst[1] = a[1] / k;
    return dst;
}

export const v2DivV = (a: v2, b: v2, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = a[0] / b[0];
    dst[1] = a[1] / b[1];
    return dst;
}

export const v2Reflect = (a: v2, normal: v2, dst?: v2): v2 => {
    return v2Sub(v2Mul(normal, 2 * v2Dot(a, normal), dst), a);
}

export const v2MulV = (a: v2, b: v2, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = a[0] / b[0];
    dst[1] = a[1] / b[1];
    return dst;
}


export const v2Max = (a: v2, b: v2, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = max(a[0], b[0]);
    dst[1] = max(a[1], b[1]);
    return dst;
}

export const v2MaxScalar = (a: v2, k: number, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = max(a[0], k);
    dst[1] = max(a[1], k);
    return dst;
}


export const v2RotateMin90 = (a: v2): v2 => {
    const t = a[0];
    a[0] = a[1];
    a[1] = -t;
    return a;
}

export const v2Rotate90 = (a: v2): v2 => {
    const t = a[0];
    a[0] = -a[1];
    a[1] = t;
    return a;
}
export const v2Length = (a: v2) => {
    return sqrt(a[0] * a[0] + a[1] * a[1]);
}

export const v2Normalize = (a: v2, dst?: v2): v2 => {
    dst = dst || a;
    if (a[0] == 0 && a[1] == 0) {
        dst[0] = dst[1] = 0;
    } else {
        const n = v2Length(a);
        dst[0] = a[0] / n;
        dst[1] = a[1] / n;
    }
    return dst;
}

export const v2ATan2 = (a: v2) => {
    return atan2(a[1], a[0]);
}

export const v2Dot = (a: v2, b: v2) => {
    return a[0] * b[0] + a[1] * b[1];
}

export const v2NegDot = (a: v2, b: v2) => {
    return a[0] * b[0] - a[1] * b[1];
}

export const v2Abs = (a: v2, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = abs(a[0]);
    dst[1] = abs(a[1]);
    return dst;
}

export const v2Floor = (a: v2, dst?: v2): v2 => {
    dst = dst || a;
    dst[0] = floor(a[0]);
    dst[1] = floor(a[1]);
    return dst;
}


export const v2TransformAffine = (v: v2, m: number[], dst?: v2) => {
    dst = dst || v;
    const [x, y] = v;

    dst[0] = x * m[0] + y * m[1] + m[2];
    dst[1] = x * m[3] + y * m[4] + m[5];

    return dst;
}

export const v2Rotate = (v: v2, angle: number, dst?: v2) => {
    return v2TransformAffine(v, [
        cos(angle), -sin(angle), 0,
        sin(angle), cos(angle), 0,
    ], dst);
}