export const PI = Math.PI;
export const PI_2 = PI / 2;
export const TWO_PI = 2 * PI;
export const SQRT1_2 = Math.SQRT1_2;
export const PI_4 = PI / 4;


export const atan2 = Math.atan2;
export const floor = Math.floor;
export const ceil = Math.ceil;
export const sin = Math.sin;
export const cos = Math.cos;
export const exp = Math.exp;
export const sqrt = Math.sqrt;
export const round = Math.round;

export const min = <T>(a: T, b: T) => {
    return b < a ? b : a;
}

export const max = <T>(a: T, b: T) => {
    return b > a ? b : a;
}

export const clamp = <T>(x: T, a: T, b: T) => {
    return max(a, min(b, x));
}

export const sign = (x: number) => {
    return x && x >= 0 ? 1 : -1;
}

export const abs = (x: number) => {
    return x < 0 ? -x : x;
}

export const wrap = (x: number, a: number, b: number) => {
    const w = b - a;
    const xx = x - a;
    return a + ((w + (xx) % w)) % w;
}

export const unitWrap = (x:number) => {
    return wrap(x, 0, 1);
}

export const mix = (a: number, b: number, ratio: number) => {
    return (1 - ratio) * a + ratio * b;
}