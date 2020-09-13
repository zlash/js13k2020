import { v2, v2New, v2Floor, v2Length, v2Sub, v2Mul, v2Normalize, v2Add } from './vector';
import { forCallback, newFloat32Array, splitCondensedString } from './utils';
import { floor, min } from './mathUtils';
import { climbHeight } from './constants';
import { v3 } from './vector3';
import { polyCircleSat } from './physics';

/*
    Map: nx <- n height (0=empty), x tile 
    0: normal floor 
    1-4 nesw slopes
    5-8  ne, se ,sw ,nw
*/

const tileNormals = [
    ,
    [0, 1], //1-4
    [-1, 0],
    [0, -1],
    [1, 0],
];

interface TilePhysicalData {
    height: number;
    normal: v2;
    tileId: number;
    iPos: v2;
}

export const mapHeightOffset = 30;

// [ size, tiles ,entities]
export interface Map {
    size: v2;
    tiles: Float32Array;
    entities: any[];

    getTileSlot(pos: v2, n: number): number;
    getTileHeight(pos: v2, iPos: v2): number;

    physicalDataAtPoint(pos: v2): TilePhysicalData | undefined;
    circularCollision(pos: v2, rad: number, isSphere?: boolean): v2 | undefined;
}


const normalFromTileId = (tileId: number,pos:v2) => {
    /*if (tileId == 5 && y > x) {
        return 1 - y + x;
    }
    if (tileId == 6 && 1 - y > x) {
        return y + x;
    }
    if (tileId == 7 && 1 - y > 1 - x) {
        return y + 1 - x;
    }
    if (tileId == 8 && y > 1 - x) {
        return 1 - y + 1 - x;
    }*/
    return tileNormals[tileId] as v2
};

export const mapFromRpn = (rpnString: string, w: number, h: number, dst: Float32Array) => {
    const stack: any[] = [];
    const entities: any = [];

    const sPop = () => stack.pop();
    const getNParams = (n: number) => {
        const ret: any[] = [];
        forCallback(n, () => ret.push(sPop()));
        return ret;
    }

    const modifyMap = ([x, y, z, elements]: [number, number, number, any[]]) => {
        const [code, params] = elements;
        const codeFunctions = {
            "e": () => {
                params[1][0] += x;
                params[1][1] += y;
                params[1][2] += z;
                entities.push(params);
            },
            "i": () => {
                modifyMap([x + params[0], y + params[1], z + params[2], params[3]]);
            },
            "c": () => {
                params.forEach((e: any) => modifyMap([x, y, z, e]));
            },
            "T": () => {
                for (let yi = 0; yi < params[1]; yi++) {
                    for (let xi = 0; xi < params[0]; xi++) {
                        const nextVal = params[2][yi * params[0] + xi];
                        if (nextVal !== "_") {
                            const fx = xi + x;
                            const fy = yi + y;
                            dst[(fy * w + fx) * 2] = params[2][yi * params[0] + xi];
                        }
                    }
                }
            },
            "R": () => {
                x += params[0];
                y += params[1];
                for (let yi = 0; yi < params[3]; yi++) {
                    for (let xi = 0; xi < params[2]; xi++) {
                        const fx = xi + x;
                        const fy = yi + y;
                        dst[(fy * w + fx) * 2] = params[4];
                        dst[(fy * w + fx) * 2 + 1] = params[5] + z;
                    }
                }
            }
        };

        codeFunctions[code as keyof typeof codeFunctions]();
    }

    for (let element of splitCondensedString(rpnString).map(x => {
        const f = parseFloat(x);
        return f != f ? x : f;
    })) {
        const elementFunctions = {
            "e": () => stack.push([element, [sPop(), getNParams(sPop())]]),
            "i": () => stack.push([element, getNParams(4)]),
            "c": () => stack.push([element, getNParams(sPop())]),
            "R": () => stack.push([element, getNParams(6)]),
            "T": () => {
                const w = sPop();
                const h = sPop();
                stack.push([element, [w, h, getNParams(w * h)]]);
            }
        };

        const func = elementFunctions[element as keyof typeof elementFunctions];

        func ? func() : stack.push(element);
    }


    modifyMap([0, 0, mapHeightOffset, stack[0]]);
    return [dst, entities];
}


export const makeMap = (src: string): Map => {
    const params = src.split(";");
    const w = parseFloat(params[0]);
    const h = parseFloat(params[1]);
    const map = newFloat32Array(w * h * 2).fill(-1);
    const [tiles, entities] = mapFromRpn(params[2], w, h, map);
    const size = [w, h];

    const getTileSlot = (pos: v2, n: number) => tiles[(pos[1] * size[0] + pos[0]) * 2 + n];

    const getTileHeight = (pos: v2, iPos: v2) => {
        return getTileSlot(iPos, 1) + heightmap(getTileSlot(iPos, 0), pos[0] - iPos[0], pos[1] - iPos[1]);
    };

    const physicalDataAtPoint = (pos: v2) => {
        const iPos = v2Floor(pos, []);
        const [tX, tY] = iPos;

        if (tX >= 0 && tY >= 0 && tX < w && tY < h) {
            const tileHeight = getTileSlot(iPos, 1);
            if (tileHeight >= 0) {
                const tileId = getTileSlot([tX, tY], 0);
                return {
                    normal: normalFromTileId(tileId, pos),
                    height: getTileHeight(pos, iPos),
                    tileId,
                    iPos,
                }
            }
        }

    };

    return {
        circularCollision: (pos: v3, rad: number, isSphere?: boolean) => {
            const hits: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

            for (let yi = -1; yi < 2; yi++) {
                for (let xi = -1; xi < 2; xi++) {
                    const offset = v2Mul(v2Normalize([xi, yi]), rad);
                    const currentPoint = v2Add(offset, pos);
                    const tileData = physicalDataAtPoint(currentPoint);
                    if (tileData) {
                        const [tx, ty] = tileData.iPos;
                        let extraHeight = 0;
                        if (isSphere) {
                            extraHeight = min(v2Length(v2Sub(currentPoint, pos)), rad);
                        }
                        const df = tileData.height - pos[2] - extraHeight;
                        if (df > climbHeight) {
                            hits[yi + 1][xi + 1] = 1;
                        }
                    }
                }
            }

            const quadsForSat: any = [];
            const [tx, ty] = v2Floor(pos, []);

            const pushForSat = (xx: number, yy: number, x: number, y: number) => {
                quadsForSat.push([
                    [xx, yy],
                    [xx, yy + y],
                    [xx + x, yy + y],
                    [xx + x, yy],
                ]);
            }

            for (let yi = 0; yi < 3; yi++) {
                for (let xi = 0; xi < 3; xi++) {
                    if (hits[yi][xi]) {
                        let x = 1;
                        while (hits[yi][xi + (x++)]);
                        pushForSat(tx + xi - 1, ty + yi - 1, x - 1, 1);
                    }
                }
            }

            for (let xi = 0; xi < 3; xi++) {
                for (let yi = 0; yi < 3; yi++) {
                    if (hits[yi][xi]) {
                        let y = 1;
                        while (yi + y < 3 && hits[yi + (y++)][xi]);
                        pushForSat(tx + xi - 1, ty + yi - 1, 1, y - 1);
                    }
                }
            }

            let ret: v2 | undefined;
            const posCopy = [...pos];
            for (let s of quadsForSat) {
                const sat = polyCircleSat(s, posCopy, rad);
                if (sat) {
                    ret = v2Add(ret || [0, 0], sat);
                    v2Add(posCopy, ret);
                }
            }

            return ret;

        },
        physicalDataAtPoint,
        getTileSlot,
        getTileHeight,
        size,
        tiles,
        entities,
    };
}



export const heightmap = (tileId: number, x: number, y: number) => {
    if (tileId > 0 && tileId < 5) {
        return [1 - y, x, y, 1 - x][tileId - 1];
    }

    // ne, se ,sw ,nw
    if (tileId == 5 && y > x) {
        return 1 - y + x;
    }
    if (tileId == 6 && 1 - y > x) {
        return y + x;
    }
    if (tileId == 7 && 1 - y > 1 - x) {
        return y + 1 - x;
    }
    if (tileId == 8 && y > 1 - x) {
        return 1 - y + 1 - x;
    }

    return 1;
}