const fs = require("fs");

import { mapFromRpn } from "../src/core/map";
import { max } from "../src/core/mathUtils";

const maxMapSize = 2000;

const entities = {
    marker: -1,
    plunger: 0,
    bumpyBeast: 1,
    flipper: 2,
    solid: 3,
    pinballDoor: 5,
    raiseBumper: 6,
    raiseBumperSet: 7,
    popper: 8,
    acolyte: 9,
    coins: 10,
    trapDoors: 11,
    checkpoint: 12,
};

const parse = (mapaDataString) => {
    const commands = mapaDataString.split("\n").map(x => x.trim()).filter(x => x !== "");
    const parsed = {};
    let curFragment;

    let stringOut;
    while (commands.length > 0) {
        const command = commands.shift();
        switch (command[0]) {
            case "/":
                continue;
            case "#":
                const layerName = command.substring(1);
                if (parsed[layerName]) {
                    throw new Error(`${layerName} is being redefined!`);
                }
                parsed[layerName] = [];
                curFragment = parsed[layerName];
                continue;
            case "@":
                let [subcommand, ...rest] = command.split(" ");
                subcommand = subcommand.substring(1).trim();

                if (subcommand === "tPattern") {
                    let row: string;
                    const rows = [];
                    let w = 0;
                    while ((row = commands.shift())[0] !== "=") {
                        const pRow = row.split(" ").map(x => {
                            let f = parseFloat(x);
                            if (f != f) {
                                return '_';
                            }
                            return f;
                        });
                        w = max(pRow.length, w);
                        rows.push(pRow);
                    }
                    const h = rows.length;
                    const buf = Array(w * h).fill(-1);
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            buf[y * w + x] = rows[y][x];
                        }
                    }
                    curFragment.push([subcommand, {
                        width: w,
                        height: h,
                        buf,
                    }]);
                    continue;
                }
                let parameters = rest.join("").split(",");

                if (entities[subcommand] != undefined) {
                    curFragment.push(["entity", [entities[subcommand], parameters.map(x => {
                        const f = parseFloat(x);
                        return f != f ? x : f;
                    })]]);
                    break;
                }

                switch (subcommand) {
                    case "rect":
                        parameters = parameters.map(x => parseFloat(x));
                        curFragment.push([subcommand, parameters]);
                        break;
                    case "insert":
                        curFragment.push([subcommand, parameters[0].trim(),
                            [
                                parseFloat(parameters[1]),
                                parseFloat(parameters[2]),
                                parseFloat(parameters[3]),
                            ]]);
                        break;
                }
                continue;
        }
    }
    return { entry: Object.keys(parsed).find(x => parsed[x] === curFragment), parsed };
}

const parsedToRPN = (entries, toParse, cache) => {
    const type = toParse[0];
    cache = cache || {};

    switch (type) {
        case "entity": {
            const eId = toParse[1][0]
            const rest = toParse[1][1];
            return [...(rest.reverse()), rest.length, eId, "e"].join(",");
        }
        case "insert":
            if (!cache[toParse[1]]) {
                cache[toParse[1]] = parsedToRPN(entries, entries[toParse[1]], cache);
            }
            return [cache[toParse[1]], toParse[2][2] || 0, toParse[2][1], toParse[2][0], "i"].join(",");
        case "rect":

            return [...(toParse[1].reverse()), "R"].join(",");
        case "tPattern": {
            const { width, height, buf } = toParse[1];
            return [...(buf.reverse()), height, width, "T"].join(",");
        }
    }

    if (typeof (type) === "string") {
        throw new Error(`${type} type not implemented!`);
    }

    //Its a compound
    return [...(toParse.map(x => parsedToRPN(entries, x, cache)).reverse()), toParse.length, "c"].join(",");
}

fs.readFile(process.argv[2], (err, data) => {
    if (err) throw err
    const { entry, parsed } = parse(data.toString());
    const rpn = parsedToRPN(parsed, parsed[entry], undefined);

    const dst = new Float32Array(Array(maxMapSize * maxMapSize * 2).fill(-1));
    const [map, entities] = mapFromRpn(rpn.replace(/([^\d/,]),/g, "$1"), maxMapSize, maxMapSize, dst);

    // bound map and output w ando height
    let w = 0;
    let h = 0;

    for (let y = 0; y < maxMapSize; y++) {
        let rowNotEmpty = false;
        for (let x = 0; x < maxMapSize; x++) {
            if (map[(y * maxMapSize + x) * 2] >= 0) {
                w = max(w, x);
                rowNotEmpty = true;
            }
        }
        if (rowNotEmpty) {
            h = max(h, y);
        }
    }

    console.log(`${w + 1};${h + 1};${rpn.replace(/([^\d/,]),/g, "$1")}`);
});
