import fs from "fs";
import process from "process";

const firstToCap = (str: string) => {
    return str[0].toUpperCase() + str.substring(1);
}

const betterSplit = (str: string, sep: string, limit: number, trim = true) => {
    const ret = str.split(sep);
    if (limit === undefined || limit === null) {
        return ret;
    }

    return [...ret.slice(0, limit), ret.slice(limit).join(sep)].map(x => (trim ? x.trim() : x));
}

const sdfFromName = (name: string) => {
    return `sdf${firstToCap(name)}`;
}

fs.readFile(process.argv[2], (err, data) => {
    if (err) throw err;

    console.log(`import { buildAtlas } from "../core/renderer/atlas";`);
    console.log(`import { PI , PI_2, TWO_PI} from "../core/mathUtils";`);
    console.log(`import { m4 } from "../core/vector3";`);
    console.log(`import { renderSdfSpriteAnim } from "../core/renderer/sdf";`);
    console.log(`import * as C from "../core/constants";`);
    console.log(``);

    const lines = data.toString().split("\n").map(x => x.trim()).filter(x => x != "");

    const textures = [];

    for (let l of lines) {
        const [command, rest] = betterSplit(l, " ", 1);
        switch (command) {
            case "@sdf": {
                const [name, def] = betterSplit(rest, "=", 1);
                console.log(`const ${sdfFromName(name)} = "${def.replace(/([^\d/,]),/g,"$1")
            }";`);
                break;
            }
            case "@tile": {
                const [name, def] = betterSplit(rest, "=", 1);
                const params = betterSplit(def, ",", 1);
                textures.push({
                    name: firstToCap(name),
                    dim: [1],
                    sdf: sdfFromName(params[0]),
                    params: betterSplit(params[1], "___", null),
                })
                break;
            }
            case "@animation": {
                const [pre, def] = betterSplit(rest, "=", 1);
                const [size, name] = betterSplit(pre, " ", null);
                const sizes = betterSplit(size, "x", null).map(x => parseInt(x, 10));

                const [sdfName, sdfParams] = betterSplit(def, " ", 1);
                textures.push({
                    name: firstToCap(name),
                    dim: sizes,
                    sdf: sdfFromName(sdfName),
                    params: betterSplit(sdfParams, "___", null),
                })

                // console.log(name, sizes);
                break;
            }
        }
    }

    console.log("");

    let curTexPos = 0;

    for (let t of textures) {
        let curTotalLength = 0;
        console.log(`export const ${t.name} = ${curTexPos};`);

        curTotalLength += t.dim.reduce((r, x) => r * x, 1);
        console.log(`export const ${t.name}FramesPerDimension = [${t.dim.join(",")}];`);


        console.log(`export const ${t.name}TotalFrames = ${curTotalLength};`);
        curTexPos += curTotalLength;
    }

    console.log(``)

    console.log(`export const TexturesTotalFrames = ${curTexPos};`);
    console.log(``)

    console.log("export const generateBoundedTextures = (view: m4, invView: m4, depthOnly:number) => [ ");
    for (let t of textures) {
        console.log(`    renderSdfSpriteAnim(${t.sdf}, view, invView, depthOnly, ${t.name}FramesPerDimension,[${t.params.map(x => `(t, f)=>${x ? x.trim() : 0}`)}]),`);
    }
    console.log("];");

});
