import { v2, v2New, v2Sub, v2Mul, v2Add, v2Div, v2Rotate90, v2Normalize, v2Dot, v2RotateMin90, v2Length, v2ATan2, v2Reflect } from "./vector";
import { v3, v3New, v3Add, v3Sub, v3Mul, v3Normalize } from "./vector3";
import { min, max, abs, PI_4, clamp } from "./mathUtils";
import { playAudio } from "./audio/audio";
import { kickBuffer } from "./entrypoint";

export interface VPos {
    pos: v3;
    prevPos: v3;
    a: v3;
}

export type Poly = v2[];

export const circleCircleSat = (cA: v2, rA: number, cB: v2, rB: number): v2 | undefined => {
    const ab = v2Sub(cA, cB, []);
    const diff = v2Length(ab) - rA - rB;
    if (diff <= 0) {
        return v2Mul(v2Normalize(ab), -diff);
    }
}


export const offsetScalePoly = (polygon: number[][], offset: v3, scale: v2) => {
    return polygon.map(x => {
        return [
            offset[0] + scale[0] * x[0],
            offset[1] + scale[1] * x[1],
            offset[2],
        ];
    });
}

export const vPosVelocity = (vPos: VPos) => {
    return v2Sub(vPos.pos, vPos.prevPos, []);
};

export const vPosVelocityLength = (vPos: VPos) => {
    return v2Length(vPosVelocity(vPos));
};

export const vPosSetVelocity = (vPos: VPos, newVelocity: number) => {
    const vel = vPosVelocity(vPos);
    v2Sub(vPos.pos, v2Mul(v2Normalize(vel), newVelocity), vPos.prevPos);
}

export const vPosExpulsion = (vPos: VPos, expulsion: v2, prevDirScale?: number): void => {
    const dir = v2Sub(vPos.prevPos, vPos.pos, []);
    const lengthDir = v2Length(dir);

    const nDir = v2Div(dir, lengthDir, []);

    const nExpulsion = v2Normalize(expulsion, []);

    // non stick clausule
    if (v2Dot(nDir, nExpulsion) <= 0) {
        return;
    }

    const baseKickTrigger = 0.05;

    if (lengthDir > baseKickTrigger) {
        const gain = min(1, (lengthDir - baseKickTrigger) / (1 - baseKickTrigger)) * 0.9;
        playAudio(kickBuffer, Math.random()*600, gain);
    }


    const prevDirOffset = v2Mul(v2Reflect(nDir, nExpulsion, []), v2Length(dir) * (prevDirScale || 0.45));

    v2Add(vPos.pos, expulsion, vPos.prevPos);
    v2Add(vPos.prevPos, prevDirOffset, vPos.pos);

}

export const polyCircleSat = (poly: Poly, center: v2, rad: number): v2 | undefined => {
    const polyLength = poly.length;
    const polyCenter = v2Div(poly.reduce((r, x) => v2Add(r, x), [0, 0] as any as v2), polyLength);
    const axes: v2[] = [];

    for (let i = 0; i < polyLength; i++) {
        axes.push(v2Normalize(v2Rotate90(v2Sub(poly[(i + 1) % polyLength], poly[i], [] as any))));
    }

    axes.push(v2Normalize(v2Sub(center, polyCenter, [] as any)));

    const sep = [0, 9999];
    for (let i = 0; i < polyLength + 1; i++) {
        const cp = v2Dot(center, axes[i]);
        const pp = poly.reduce((r, x) => {
            const p = v2Dot(x, axes[i]);
            r[0] = r[0] == undefined ? p : min(r[0], p);
            r[1] = r[1] == undefined ? p : max(r[1], p);
            return r;
        }, [] as number[]);

        const da = pp[1] - cp + rad;
        const db = pp[0] - cp - rad;

        if (da < 0 || db > 0) {
            return undefined;
        }

        const minD = (abs(da) < abs(db)) ? da : db;
        if (abs(minD) < abs(sep[1])) {
            sep[0] = i;
            sep[1] = minD;
        }
    }

    return v2Mul(axes[sep[0]], sep[1]);
}

export const initVPos = <T>(p: T, x: number, y: number, z: number): T & VPos => {
    (p as any).pos = v3New(x, y, z);
    (p as any).prevPos = v3New(x, y, z);
    (p as any).a = v3New(0, 0, 0);
    return p as any;
};

// add, update
export interface PhysicsWorld {
    addElement(vp: VPos): void;
    update(dt: number): void
}

export const makePhysicsWorld = (): PhysicsWorld => {
    const elements: VPos[] = [];

    const pw = {
        addElement: (vp: VPos) => {
            elements.push(vp);
        },
        update: (dt: number) => {
            dt /= 100;
            for (let el of elements) {
                const pp = el.prevPos;
                el.prevPos = [...el.pos];
                v3Add(v3Sub(v3Mul(el.pos, 2), pp), v3Mul(el.a, dt * dt));
                el.a[0] = el.a[1] = el.a[2] = 0;
            }
        },
    };

    return pw;
}