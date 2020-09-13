import { SdfPixelData } from "./sdf";
import { atlasInnerMargins, atlasResolution } from "../constants";
import { min } from "../mathUtils";
import { newFloat32Array } from "../utils";

interface AtlasLayer {
    data: SdfPixelData;
    boxes: {
        x: number;
        y: number;
        idx: number;
        pixelData: SdfPixelData;
    }[];
}

export type Atlas = AtlasLayer[];


// Optimization (bump y on min row height for faster creation)

export const buildAtlas = (texturesInput: SdfPixelData[]) => {
    const atlas: Atlas = [];
    const textures = texturesInput.map((x, idx) => ({ texture: x, idx }))
        .sort(({ texture: a }, { texture: b }) => b.w * b.h - a.w * a.h);

    console.log("BEGIN FITTING FOR", texturesInput);

    const newLayer = () => {
        atlas.push({
            data: {
                w: atlasResolution,
                h: atlasResolution,
                data: newFloat32Array(atlasResolution * atlasResolution * 4),
                materialData: new Uint8Array(atlasResolution * atlasResolution * 3)
            },
            boxes: [],
        });
    };

    newLayer();

    const fitTexture = ({ texture, idx }: typeof textures[0]) => {
        let idxLayer = 0;

        const margin = atlasInnerMargins;
        let fitted = false;
        let x = 0;
        let y = 0;

        while (!fitted && idxLayer < atlas.length) {
            y = margin;
            while (!fitted) {
                x = margin;
                const texBorderY = y + texture.h + margin;
                let minY = atlasResolution;

                if (texBorderY >= atlasResolution - margin) {
                    break;
                }

                for (let box of atlas[idxLayer].boxes) {
                    const texBorderX = x + texture.w + margin;
                    const boxBorderX = box.x + box.pixelData.w + margin;
                    const boxBorderY = box.y + box.pixelData.h + margin;
                    minY = min(minY, boxBorderY + 1);
                    if (y <= boxBorderY && box.y <= texBorderY
                        && x <= boxBorderX && box.x <= texBorderX) {
                        x = boxBorderX + 1;
                        continue;
                    }
                }

                if (x + texture.w + margin < atlasResolution && texBorderY < atlasResolution) {
                    fitted = true;
                }

                if (!fitted) {
                    y += minY;
                }
            }

            if (!fitted) {
                idxLayer++;
                if (idxLayer >= atlas.length) {
                    newLayer();
                }
            }
        }



        // Render in buffer
        const curLayer = atlas[idxLayer];
        const curBuffer = curLayer.data.data;
        const curMaterialBuffer = curLayer.data.materialData;

        for (let i = 0; i < texture.h; i++) {
            const srcWidthBytes = texture.w * 4;
            const srcIndex = i * srcWidthBytes;
            curBuffer.set(
                texture.data.subarray(srcIndex, srcIndex + srcWidthBytes),
                ((y + i) * atlasResolution + x) * 4,
            );
            const srcMatWidthBytes = texture.w * 3;
            const srcMatIndex = i * srcMatWidthBytes;
            curMaterialBuffer.set(
                texture.materialData.subarray(srcMatIndex, srcMatIndex + srcMatWidthBytes),
                ((y + i) * atlasResolution + x) * 3,
            );
        }
        curLayer.boxes.push({ x, y, pixelData: texture, idx });
        curLayer.boxes = curLayer.boxes.sort((a, b) => a.x - b.x);

    }

    textures.map(x => fitTexture(x));

    console.log("ENDED FITTING FOR", texturesInput);

    return atlas;
};
