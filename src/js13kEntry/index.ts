import { Ingame } from "../core/ingame";
import { Renderer, init } from "../core/entrypoint";
import {
    initWebgl, createProgramAsync,
    createQuads, createTextureFromSdfPixelData, createEmptyVertexBuffer,
    createFBOWithTextureAttachment, bindFBOAndSetViewport, createTextureAndAttachToFbo,
} from "../core/renderer/webgl";

import { renderSdfSprite, SdfPixelData, BoundedSdf } from "../core/renderer/sdf";
import { m4AxisAngleRotation, m4Multiply, m4v4Multiply, m4v3Multiply, m4, m4TranslateRight, v3Mul, v3Mix, v3Sub, v3Add, v3Length, v3Normalize, v3Dot, v3 } from "../core/vector3";
import * as glEnum from "../core/renderer/webglEnums";
import { min, max, floor, PI, PI_4, PI_2, clamp, wrap, sin, abs } from "../core/mathUtils";
import { EntityPlunger, EntityBumpyBeast, EntityFlipper, EntitySolid, EntityPinballDoor, EntityRaiseBumper, Entity } from "../core/entities/entities";
import { buildAtlas } from "../core/renderer/atlas";

import * as Shaders from "../core/renderer/shaders/shaders";

import { getLocalStorage, getLocalStorageObj, setLocalStorage, setLocalStorageObj, emptyArray, newFloat32Array, forCallback } from "../core/utils";
import { entitiesCreate } from "~core/entities/entities";
import { DEBUG, playerBallRad, sdfVersion, viewRes, spritesQualityRes, shadowScale } from "../core/constants";

import * as Textures from "../assets/textures";
import { generateBoundedTextures } from "../assets/textures";


const vbSpriteVertexDataSizeFloats = 9;
const vbSpriteVertexDataSizeBytes = vbSpriteVertexDataSizeFloats * 4;

/*
const vbSpriteDataSizeFloats = 10;
const vbSpriteDataSizeBytes = vbSpriteDataSizeFloats * 4;
*/

const maxSprites = 50000; //2048;

const makeRenderer = async () => {
    const gl = initWebgl();

    if (DEBUG) {
        if (getLocalStorage("v") != sdfVersion) {
            localStorage.clear();
            setLocalStorage("v", sdfVersion);
        }
    }

    const appendSdfTexToBody = (tex: SdfPixelData) => {
        const doc = document;
        const canvas = doc.createElement("canvas");
        canvas.width = tex.w;
        canvas.height = tex.h;
        const ctx = canvas.getContext('2d', { alpha: true });
        const imageData = new ImageData(Uint8ClampedArray.from(tex.data.map(x => floor(x * 0xFF))), tex.w, tex.h);
        ctx?.putImageData(imageData, 0, 0);
        doc.body.appendChild(canvas);


        const canvas2 = doc.createElement("canvas");
        canvas2.width = tex.w;
        canvas2.height = tex.h;
        const ctx2 = canvas2.getContext('2d', { alpha: true });
        const us = new Uint8ClampedArray(tex.w * tex.h * 4);

        for (let i = 0; i < tex.materialData.length / 3; i++) {
            us[i * 4] = tex.materialData[i * 3];
            us[i * 4 + 1] = tex.materialData[i * 3 + 1];
            us[i * 4 + 2] = tex.materialData[i * 3 + 2];
            us[i * 4 + 3] = 0xFF;
        }

        const imageData2 = new ImageData(us, tex.w, tex.h);
        ctx2?.putImageData(imageData2, 0, 0);
        doc.body.appendChild(canvas2);
    }


    const genBoundedTextures = async (view: m4, invView: m4, depthOnly: number) => {
        const boundedTextures: (BoundedSdf & { x: number; y: number; dimensions: number[]; })[]
            = (await Promise.all(generateBoundedTextures(view, invView, depthOnly)) as any).reduce((accum: any, x: any) => {
                return [...accum, ...((x[0] as any).map(
                    (y: any) => (
                        { ...y, dimensions: x[1] }
                    )
                ))];
            }, [] as any);

        const atlas = buildAtlas(boundedTextures.map(x => x.pixelData));
        const atlasTextures = createTextureFromSdfPixelData(gl, atlas[0].data);

        atlas.forEach(l => l.boxes.forEach(b => {
            boundedTextures[b.idx].x = b.x;
            boundedTextures[b.idx].y = b.y;
        }));

        if (DEBUG) {
            atlas.map(x => appendSdfTexToBody(x.data));
        }
        return [boundedTextures, atlasTextures] as [typeof boundedTextures, typeof atlasTextures];
    };

    const makeRotationsMatrix = (rotations: any, inverse: number) => {
        const partials = [
            m4AxisAngleRotation(rotations[0], inverse * rotations[0][3], []),
            m4AxisAngleRotation(rotations[1], inverse * rotations[1][3], []),
        ];
        return (m4Multiply as any)(...(inverse > 0 ? partials : partials.reverse()));
    };




    const shadowRotations = [[0, 1, 0, PI_2 * 0.6], [1, 0, 0, -PI_2 * 0.4]];
    const shadowInvView = makeRotationsMatrix(shadowRotations, 1);
    const shadowView = makeRotationsMatrix(shadowRotations, -1);

    const rotations = [[0, 1, 0, PI_4], [1, 0, 0, -PI_4]];
    const invView = makeRotationsMatrix(rotations, 1);
    const view = makeRotationsMatrix(rotations, -1);

    const [boundedTextures, atlasTextures] = await genBoundedTextures(invView, view, 0);
    const [shadowBoundedTextures, shadowAtlasTextures] = await genBoundedTextures(shadowInvView, shadowView, 1);

    const shadowFboSize = [viewRes[0] * shadowScale, viewRes[1] * shadowScale];
    const shadowFbo = createFBOWithTextureAttachment(gl, shadowFboSize[0], shadowFboSize[1], glEnum.RGBA32F, glEnum.RGBA, glEnum.FLOAT, true);


    const accumulationFbo = createFBOWithTextureAttachment(gl, viewRes[0], viewRes[1], glEnum.RGBA32F, glEnum.RGBA, glEnum.FLOAT, true);


    const accumMaterialTexture = createTextureAndAttachToFbo(gl, accumulationFbo, glEnum.COLOR_ATTACHMENT1, glEnum.RGB, glEnum.RGB, glEnum.UNSIGNED_BYTE);
    gl.drawBuffers([glEnum.COLOR_ATTACHMENT0, glEnum.COLOR_ATTACHMENT1]);


    const shadowProgram = await createProgramAsync(gl, Shaders.isoSpriteVS, Shaders.isoSpriteDepthFS) as WebGLProgram;
    const program = await createProgramAsync(gl, Shaders.isoSpriteVS, Shaders.isoSpriteFS) as WebGLProgram;
    const deferredProgram = await createProgramAsync(gl, Shaders.screenQuadVS, Shaders.deferredFS) as WebGLProgram;

    const getUniformLocation = (prog: WebGLProgram, name: string) => gl.getUniformLocation(prog, name);

    const getIsoSpriteUniformLocations = (prog: WebGLProgram) => ({
        uTex: getUniformLocation(prog, "uTex"),
        uMat: getUniformLocation(prog, "uMat"),
    });

    const programUniforms: any = getIsoSpriteUniformLocations(program);
    //programUniforms.uDepthTex = getUniformLocation(program, "uDepthTex");
    //programUniforms.uInvShadowMatrix = getUniformLocation(program, "uInvShadowMatrix");

    const shadowProgramUniforms = getIsoSpriteUniformLocations(shadowProgram);

    const uShadowTex = getUniformLocation(deferredProgram, "_A");
    const uAccumTex = getUniformLocation(deferredProgram, "_B");
    const uMatTex = getUniformLocation(deferredProgram, "_C");


    const uAccumView = getUniformLocation(deferredProgram, "_D");
    const uShadowView = getUniformLocation(deferredProgram, "_E");
    const uViewSize = getUniformLocation(deferredProgram, "_F");


    //
    // Vertex Data
    // 

    //const spritesToRenderData = newFloat32Array(maxSprites * vbSpriteDataSizeFloats);
    //const shadowSpritesToRenderData = newFloat32Array(maxSprites * vbSpriteDataSizeFloats);

    const spritesVerticesPerQuad = 6;
    const spritesToRenderVertexData = newFloat32Array(maxSprites * vbSpriteVertexDataSizeFloats * spritesVerticesPerQuad);

    const vbSpriteVertexData = createEmptyVertexBuffer(
        gl,
        vbSpriteVertexDataSizeBytes,
        spritesToRenderVertexData,
        [1, 2, 3, 4],
        "f2,f3,f1,f3",
        // QuadCorner, Pos, PreId, Mod
    );

    // 
    // IsoSpriteUBO 
    // 
    const isoSpriteUbo = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(glEnum.UNIFORM_BUFFER, isoSpriteUbo);

    const isoSpriteUboSizeFloats = 24;
    const isoSpriteUboData = newFloat32Array(isoSpriteUboSizeFloats);

    gl.bufferData(glEnum.UNIFORM_BUFFER, isoSpriteUboData, glEnum.STREAM_DRAW);
    gl.bindBufferBase(glEnum.UNIFORM_BUFFER, 1, isoSpriteUbo);

    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, "_Q"), 1);
    //gl.uniformBlockBinding(shadowProgram, gl.getUniformBlockIndex(shadowProgram, "_Q"), 1);



    //
    // Pre-renders UBO
    //

    // TODO: Unify program init

    const genPrerendersUBO = (bTextures: typeof boundedTextures, prog: WebGLProgram) => {
        const preRendersUBO = gl.createBuffer() as WebGLBuffer;
        gl.bindBuffer(glEnum.UNIFORM_BUFFER, preRendersUBO);

        const uboEntrySizeFloats = 12;
        const preRendersUBOData = newFloat32Array(300 * uboEntrySizeFloats);

        // v4 texSubrect
        // v4 solidSubrect
        // v2 regpoint
        // v2 pad

        bTextures.forEach((bt, idx) => {
            preRendersUBOData.set([
                bt.x, bt.y, bt.pixelData.w, bt.pixelData.h,

                bt.x + bt.solidQuad[0], bt.y + bt.solidQuad[1],
                bt.solidQuad[2] - bt.solidQuad[0], bt.solidQuad[3] - bt.solidQuad[1],

                bt.extents[0], bt.extents[1],
                0, 0,
            ], idx * uboEntrySizeFloats);
        })

        gl.bufferData(glEnum.UNIFORM_BUFFER, preRendersUBOData, glEnum.STATIC_DRAW);
        gl.bindBufferBase(glEnum.UNIFORM_BUFFER, 2, preRendersUBO);

        gl.uniformBlockBinding(prog, gl.getUniformBlockIndex(prog, "_J"), 2);

        return preRendersUBO;
    };

    const programUBO = genPrerendersUBO(boundedTextures, program);
    const shadowProgramUBO = genPrerendersUBO(shadowBoundedTextures, program);

    //
    // Index buffer
    const sortedIndexData = new Uint16Array(maxSprites);
    const indexBufferData = new Uint16Array(maxSprites * spritesVerticesPerQuad);
    const reverseIndexBufferData = new Uint16Array(maxSprites * spritesVerticesPerQuad);
    const indexBufferDepths = new Float32Array(maxSprites * spritesVerticesPerQuad);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(glEnum.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(glEnum.ELEMENT_ARRAY_BUFFER, indexBufferData, glEnum.STREAM_DRAW);


    const quadBuffer = createQuads(gl, maxSprites);
    const quadAVertexPosition = 0;

    gl.bindBuffer(glEnum.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(quadAVertexPosition, 2, glEnum.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(quadAVertexPosition);

    const cameraPos = [0, 0, 0];
    const zeroVec = [0, 0, 0];
    const vecRegisters = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]] as any;

    const quadVertices = [
        [-1.0, 1.0], [-1.0, -1.0], [1.0, -1.0],
        [-1.0, 1.0], [1.0, -1.0], [1.0, 1.0],
    ];

    return [
        (dt: number, ingame?: Ingame, restUnit?: number) => {

            if (!ingame) {
                gl.clear(glEnum.COLOR_BUFFER_BIT);
                return;
            }
            const { ball, map, entities, cameraDst } = ingame;
            const { size: mapSize, tiles: mapTiles } = map;
            const [mapWidth, mapHeight] = mapSize;

            const deltaBallPos = v3Sub(ball.pos, ball.prevPos, []);
            const interpolatedBallPos = v3Add(v3Mul(deltaBallPos, restUnit!, []), ball.pos);

            v3Mix(cameraPos, cameraDst, min(1, dt * 0.005));

            let spritesToRender = 0;

            //
            // Sprite frame data pusher
            //

            const pushSpriteToRender = (pos: v3, baseSpriteNumber: number, frame?: number[], zOffset?: number) => {

                // Cull spot with a big ass sphere (This is illegal in several countries)
                /*const len = v3Length(v3Sub(pos, cameraPos, vecRegisters[1]));
                if (len > 15) {
                    return;
                }*/

                const spriteVertexDataBaseOffset = spritesToRender * vbSpriteVertexDataSizeFloats * spritesVerticesPerQuad;


                let boundedSpriteId = baseSpriteNumber;
                if (frame) {
                    for (let i = 0; i < frame.length; i++) {
                        const multiplier = i == frame.length - 1 ? 1 : boundedTextures[baseSpriteNumber].dimensions[i + 1];
                        boundedSpriteId += frame[i] * multiplier;
                    }
                }

                for (let i = 0; i < spritesVerticesPerQuad; i++) {
                    let curOffset = spriteVertexDataBaseOffset + i * vbSpriteVertexDataSizeFloats;

                    // QuadCorner
                    spritesToRenderVertexData[curOffset++] = quadVertices[i][0];
                    spritesToRenderVertexData[curOffset++] = quadVertices[i][1];

                    // Pos 
                    spritesToRenderVertexData[curOffset++] = pos[0];
                    spritesToRenderVertexData[curOffset++] = pos[1];
                    spritesToRenderVertexData[curOffset++] = pos[2];

                    // PreId
                    spritesToRenderVertexData[curOffset++] = boundedSpriteId;

                    // Mod
                    spritesToRenderVertexData[curOffset++] = 0;
                    spritesToRenderVertexData[curOffset++] = 0;
                    spritesToRenderVertexData[curOffset++] = zOffset || 0;
                }
                spritesToRender++;
            }

            //
            // Render player ball 
            //
            pushSpriteToRender(interpolatedBallPos, Textures.PlayerBall);

            //
            // Map render
            //
            for (let y = 0; y < mapHeight; y++) {
                for (let x = 0; x < mapWidth; x++) {
                    const mapIdx = (y * mapWidth + x) * 2;
                    const tileIdx = mapTiles[mapIdx];
                    const tileHeight = mapTiles[mapIdx + 1];

                    //God forgive me for this culling
                    if (abs(cameraPos[0] - x) > 20
                        || abs(cameraPos[1] - y) > 20) {
                        continue;
                    }

                    if (tileHeight >= 0) {
                        let minZ = 0;

                        if (x > 0 && y > 0 && x < mapWidth - 1 && y < mapHeight - 1) {
                            minZ = max(0, min(
                                mapTiles[mapIdx - 1],
                                min(mapTiles[mapIdx + 3],
                                    min(mapTiles[mapIdx + mapWidth * 2 + 1],
                                        mapTiles[mapIdx - mapWidth * 2 + 1]))
                            ) - 1);
                        }

                        minZ = max(minZ, tileHeight - 20);

                        for (let i = minZ; i < tileHeight + 1; i++) {
                            const tileToRender = i === tileHeight ? tileIdx : (
                                tileIdx == Textures.CastleWallCap ? tileIdx + 1 : 0
                            );
                            vecRegisters[2][0] = x + 0.5;
                            vecRegisters[2][1] = y + 0.5;
                            vecRegisters[2][2] = i + 0.5;
                            pushSpriteToRender(vecRegisters[2], tileToRender, 0 as any, -0.05);
                        }
                    }
                }
            }



            const pushEntitySprite = (e: Entity, tex: number, dimensions: number[], frames?: number[], posOffset?: number[], zOffset?: number) => {
                posOffset = posOffset || zeroVec;
                v3Add(e.pos, posOffset, vecRegisters[3]);
                pushSpriteToRender(vecRegisters[3], tex, frames && frames.map(
                    (x, idx) => clamp(floor(x), 0, dimensions[idx] - 1)
                ), zOffset);
            };


            for (let e of <any>entities) {
                const renderEntity = [
                    () => // EntityPlunger: 0 
                        pushSpriteToRender(e.pos, Textures.Plunger, [e.rotated, e.frame])
                    ,
                    () => // EntityBumpyBeast: 1
                        pushSpriteToRender(e.pos, Textures.BumpyBeast, [floor(
                            ((e.angle + (0.5 / Textures.BumpyBeastFramesPerDimension[0])) % 1) * Textures.BumpyBeastFramesPerDimension[0]
                        )], 0.2)
                    ,
                    () => // EntityFlipper: 2
                        pushSpriteToRender(e.anchor, Textures.Flipper, [
                            e.side,
                            clamp(floor(e.pos[0] * Textures.FlipperFramesPerDimension[1]), 0, Textures.FlipperFramesPerDimension[1] - 1)
                        ], 0.07)
                    ,
                    () => // EntitySolid: 3
                        pushSpriteToRender(e.pos, Textures.PinballSideBlock, [((1 - e.flip[0]) / 2) % Textures.PinballSideBlockFramesPerDimension[0]], 0.09)
                    ,
                    // EntityPlayerBall: 4
                    ,
                    () => // EntityPinballDoor: 5 
                        pushSpriteToRender(e.pos, Textures.CastleDoor, 0 as any, 1)
                    ,
                    () => // EntityRaiseBumper: 6
                        pushEntitySprite(e, Textures.RaiseBumper, Textures.RaiseBumperFramesPerDimension,
                            [0, e.h * Textures.RaiseBumperFramesPerDimension[1]])
                    ,
                    // EntityRaiseBumpersSet: 7
                    ,
                    () => // Popper: 8
                        pushEntitySprite(e, Textures.Popper, Textures.PopperFramesPerDimension,
                            [0, e.angle * Textures.RaiseBumperFramesPerDimension[1]])
                    ,
                    () => // Acolytes: 9 
                        e.acolytes && e.acolytes.forEach((x: any) =>
                            x && pushSpriteToRender([x[0], x[1], e.pos[2] + sin(e.clock * 9) * 0.4], Textures.Acolyte, 0 as any, 0.5)
                        )
                    ,
                    () => // Coins: 10
                        e.coinsCollection.forEach((c: any) => {
                            c && pushSpriteToRender(c.pos, Textures.Coin);
                        })
                    ,
                    () => // TrapDoors
                        forCallback(4, (i) =>
                            pushEntitySprite(e, Textures.TrapDoors, Textures.TrapDoorsFramesPerDimension,
                                [(e.t * 1.1 - i * 0.05) * Textures.TrapDoorsFramesPerDimension[0]], [i * 2.25, 0, 0], 0.5))
                    ,
                    () => // Checkpoint
                        pushEntitySprite(e, Textures.Checkpoint, Textures.CheckpointFramesPerDimension,
                            [e.t * Textures.CheckpointFramesPerDimension[0]], 0 as any, 0.5)
                    ,
                ];

                const rE = renderEntity[e.type];
                rE && rE();
            }

            //
            // Set up cube views
            //

            const makeViewMatrix = (renderView: m4, viewBox: number[],) => {
                // This matrix goes from my world reprensentation to normalized cube volume
                return m4Multiply(
                    [
                        viewBox[0], 0, 0, 0,
                        0, viewBox[1], 0, 0,
                        0, 0, viewBox[2], 0,
                        0, 0, 0, 1,
                    ],
                    m4Multiply(
                        renderView,
                        [
                            1, 0, 0, 0,
                            0, 0, 1, 0,
                            0, 1, 0, 0,
                            -cameraPos[0], -cameraPos[2], -cameraPos[1], 1,
                        ],
                    ),
                );
            }

            //
            // Render world
            //

            //console.log("TO RENDER", spritesToRender);

            gl.bindBuffer(glEnum.ARRAY_BUFFER, vbSpriteVertexData);
            gl.bufferSubData(glEnum.ARRAY_BUFFER, 0, spritesToRenderVertexData);

            const renderWorld = (viewMatrix: m4, viewBox: number[], ubo: WebGLBuffer,
                uniforms: any, textures: typeof atlasTextures) => {

                gl.uniform1i(uniforms.uTex, 0);
                gl.uniform1i(uniforms.uMat, 1);

                gl.activeTexture(glEnum.TEXTURE1);
                gl.bindTexture(glEnum.TEXTURE_2D, textures.material);
                gl.activeTexture(glEnum.TEXTURE0);
                gl.bindTexture(glEnum.TEXTURE_2D, textures.sdf);

                //gl.enable(glEnum.DEPTH_TEST);

                gl.clear(glEnum.COLOR_BUFFER_BIT | glEnum.DEPTH_BUFFER_BIT);

                /*
                                const sortedIndexDataView = sortedIndexData.subarray(0, spritesToRender);
                                const indexBufferDataView = indexBufferData.subarray(0, spritesToRender * spritesVerticesPerQuad);
                                const reverseIndexBufferDataView = reverseIndexBufferData.subarray(0, spritesToRender * spritesVerticesPerQuad);
                                const indexBufferDepthsView = indexBufferDepths.subarray(0, spritesToRender);
                
                                for (let i = 0; i < spritesToRender; i++) {
                                    const sprIdx = i * spritesVerticesPerQuad * vbSpriteVertexDataSizeFloats;
                                    const inView = m4v3Multiply(viewMatrix, spritesToRenderVertexData.subarray(sprIdx + 2, sprIdx + 5) as any, vecRegisters[2]);
                                    sortedIndexDataView[i] = i;
                                    indexBufferDepthsView[i] = inView[2] + spritesToRenderVertexData[sprIdx + 8];
                                }
                
                
                                //sortedIndexDataView.sort((a, b) => indexBufferDepthsView[a] - indexBufferDepthsView[b]);
                
                
                                sortedIndexDataView.forEach((x, sortedIdx) => {
                                    const idx = x * spritesVerticesPerQuad;
                                    const resIdx = sortedIdx * spritesVerticesPerQuad;
                                    for (let i = 0; i < spritesVerticesPerQuad; i++) {
                                        indexBufferDataView[resIdx + i] = idx + i;
                                        reverseIndexBufferDataView[((spritesToRender - 1) * spritesVerticesPerQuad - resIdx) + i] = idx + i;
                                    }
                                });
                */
                // gl.bindBuffer(glEnum.ELEMENT_ARRAY_BUFFER, indexBuffer);
                // gl.bufferSubData(glEnum.ELEMENT_ARRAY_BUFFER, 0, indexBufferDataView);


                /*
                    layout(std140) uniform MainUniformBlock { 
                        mat4 uViewMatrix;
                        vec4 uCameraAndSpritesRes;
                        vec4 uViewBoxAndSolidOnly;
                    };
                */


                for (let i = 0; i < 16; i++) {
                    isoSpriteUboData[i] = viewMatrix[i];
                }

                for (let i = 0; i < 3; i++) {
                    isoSpriteUboData[16 + i] = cameraPos[i];
                    isoSpriteUboData[20 + i] = viewBox[i];
                }
                isoSpriteUboData[16 + 3] = spritesQualityRes;
                isoSpriteUboData[20 + 3] = 0;

                gl.bindBuffer(glEnum.UNIFORM_BUFFER, ubo);
                gl.bindBufferBase(glEnum.UNIFORM_BUFFER, 2, ubo);

                gl.bindBuffer(glEnum.UNIFORM_BUFFER, isoSpriteUbo);
                gl.bufferSubData(glEnum.UNIFORM_BUFFER, 0, isoSpriteUboData);
                //gl.bindBufferBase(glEnum.UNIFORM_BUFFER, 1, isoSpriteUbo);



                gl.enable(glEnum.DEPTH_TEST);


                //gl.drawElements(glEnum.TRIANGLES, spritesVerticesPerQuad * spritesToRender, glEnum.UNSIGNED_SHORT, 0);
                gl.drawArrays(glEnum.TRIANGLES, 0, spritesVerticesPerQuad * spritesToRender);

                gl.disable(glEnum.DEPTH_TEST);

                //gl.disable(glEnum.DEPTH_TEST);




                //gl.drawArraysInstanced(glEnum.TRIANGLE_STRIP, 0, 4, spritesToRender);

                //gl.enable(glEnum.DEPTH_TEST);
                //gl.disable(gl.DEPTH_TEST);

                /*
                gl.bindBuffer(glEnum.ARRAY_BUFFER, vbSpriteData);
                //  const spritesDataOffset = (maxSprites - 1 - spritesToRender) * vbSpriteDataSizeFloats;
                // gl.bufferSubData(glEnum.ARRAY_BUFFER, 0, spritesData.subarray(spritesDataOffset));
                gl.bufferSubData(glEnum.ARRAY_BUFFER, 0, spritesData);


                gl.clear(glEnum.COLOR_BUFFER_BIT | glEnum.DEPTH_BUFFER_BIT);

                gl.uniform1f(uniforms.uSolidOnly, 1);
                gl.drawArraysInstanced(glEnum.TRIANGLE_STRIP, 0, 4, spritesToRender);

                gl.uniform1f(uniforms.uSolidOnly, 0);
                //gl.enable(glEnum.BLEND);
                gl.depthMask(false);
                gl.drawArraysInstanced(glEnum.TRIANGLE_STRIP, 0, 4, spritesToRender);
                gl.depthMask(true);
                //gl.disable(glEnum.BLEND);
                */
            };


            const scale = 9;
            const viewBox = [1 / scale, viewRes[0] / (viewRes[1] * scale), 1 / scale];

            const shadowNormalizedView = makeViewMatrix(shadowView, [viewBox[0] / 1.5, viewBox[1] / 1.5, viewBox[2]]);
            const viewNormalizedView = makeViewMatrix(view, viewBox);


            gl.depthFunc(glEnum.LESS)
            bindFBOAndSetViewport(gl, shadowFboSize, shadowFbo.fbo);
            gl.useProgram(program);
            renderWorld(shadowNormalizedView, [viewBox[0] / 1.5, viewBox[1] / 1.5, viewBox[2]], shadowProgramUBO, programUniforms, shadowAtlasTextures);

            bindFBOAndSetViewport(gl, viewRes, accumulationFbo.fbo);
            gl.clear(glEnum.COLOR_BUFFER_BIT | glEnum.DEPTH_BUFFER_BIT);
            gl.useProgram(program);
            renderWorld(viewNormalizedView, viewBox, programUBO, programUniforms, atlasTextures);


            bindFBOAndSetViewport(gl, viewRes, null);
            gl.clear(glEnum.COLOR_BUFFER_BIT);
            gl.useProgram(deferredProgram);

            gl.uniform1i(uShadowTex, 0);
            gl.uniform1i(uAccumTex, 1);
            gl.uniform1i(uMatTex, 2);
            gl.uniform2fv(uViewSize, viewRes);

            gl.uniformMatrix4fv(uAccumView, false, viewNormalizedView);
            gl.uniformMatrix4fv(uShadowView, false, shadowNormalizedView);


            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(glEnum.TEXTURE_2D, accumMaterialTexture);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(glEnum.TEXTURE_2D, accumulationFbo.tex);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(glEnum.TEXTURE_2D, shadowFbo.tex);


            gl.drawArrays(glEnum.TRIANGLE_STRIP, 0, 4);
        }
    ] as Renderer;
}

window.addEventListener('DOMContentLoaded', async (event) => {
    const r = await makeRenderer();
    init(r);
});