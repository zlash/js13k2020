import { promisify, forCallback, newFloat32Array } from "../utils";
import * as glEnum from "./webglEnums";

import { viewRes, upscale, windowScale } from "../constants";

import { DEBUG } from "../constants";
import { SdfPixelData } from "./sdf";

const glReverseEnumLookUp = (value: any) => {
    let k = Object.getOwnPropertyNames(WebGL2RenderingContext).find(x => (WebGL2RenderingContext as any)[x] === value);
    return k || "<ENUM VALUE NOT FOUND>";
}

export const createEmptyVertexBuffer = (gl: WebGL2RenderingContext, stride: number, arr: ArrayBufferView, attribIndex: number[], layout: string) => {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(glEnum.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(glEnum.ARRAY_BUFFER, arr, glEnum.STREAM_DRAW);

    let currentOffset = 0;

    layout.split(",").forEach((x, idx) => {
        const el = ({
            "f": [glEnum.FLOAT, 4],
        } as any)[x[0]];

        const nElements = parseInt(x.substr(1), 10);

        gl.vertexAttribPointer(attribIndex[idx], nElements, el[0], false, stride, currentOffset);
        gl.enableVertexAttribArray(attribIndex[idx]);

        currentOffset += nElements * el[1];


    });

    return positionBuffer;
};

export const createQuads = (gl: WebGL2RenderingContext, n: number) => {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(glEnum.ARRAY_BUFFER, positionBuffer);

    const fArray = newFloat32Array(2 * 4 * n);
    forCallback(n, (i) => {
        fArray.set([
            -1.0, 1.0,
            -1.0, -1.0,
            1.0, 1.0,
            1.0, -1.0
        ], i * 4 * 2);
    });

    gl.bufferData(glEnum.ARRAY_BUFFER, fArray, glEnum.STATIC_DRAW);

    return positionBuffer;
}

export const createTexture2d = (gl: WebGL2RenderingContext,
    w: number, h: number,
    internalFormat: number, texelFormat: number, dataFormat: number,
    data?: ArrayBufferView) => {
    let tex = gl.createTexture();
    const i = glEnum.RGBA;
    gl.bindTexture(glEnum.TEXTURE_2D, tex);
    gl.texImage2D(glEnum.TEXTURE_2D, 0, internalFormat, w, h, 0, texelFormat, dataFormat, data as ArrayBufferView);
    gl.texParameteri(glEnum.TEXTURE_2D, glEnum.TEXTURE_MIN_FILTER, glEnum.NEAREST);
    gl.texParameteri(glEnum.TEXTURE_2D, glEnum.TEXTURE_MAG_FILTER, glEnum.LINEAR);
    gl.texParameteri(glEnum.TEXTURE_2D, glEnum.TEXTURE_WRAP_S, glEnum.CLAMP_TO_EDGE);
    gl.texParameteri(glEnum.TEXTURE_2D, glEnum.TEXTURE_WRAP_T, glEnum.CLAMP_TO_EDGE);
    return tex;
}

export const createTextureAndAttachToFbo = (gl: WebGL2RenderingContext, fbo: ReturnType<typeof createFBOWithTextureAttachment>,
    attachment: number,
    internalFormat: number, texelFormat: number, dataFormat: number,) => {

    gl.bindFramebuffer(glEnum.FRAMEBUFFER, fbo.fbo);

    const tex = createTexture2d(gl, fbo.w, fbo.h, internalFormat, texelFormat, dataFormat);
    gl.framebufferTexture2D(glEnum.FRAMEBUFFER, attachment, glEnum.TEXTURE_2D, tex, 0);
    return tex;
};

export const createFBOWithTextureAttachment = (gl: WebGL2RenderingContext,
    w: number, h: number,
    internalFormat: number, texelFormat: number, dataFormat: number,
    depth = false,
) => {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(glEnum.FRAMEBUFFER, fbo);

    const tex = createTexture2d(gl, w, h, internalFormat, texelFormat, dataFormat);
    gl.framebufferTexture2D(glEnum.FRAMEBUFFER, glEnum.COLOR_ATTACHMENT0, glEnum.TEXTURE_2D, tex, 0);

    if (depth) {
        const depthTexture = createTexture2d(gl, w, h, glEnum.DEPTH_COMPONENT16, glEnum.DEPTH_COMPONENT, glEnum.UNSIGNED_INT);
        gl.framebufferTexture2D(
            glEnum.FRAMEBUFFER,
            glEnum.DEPTH_ATTACHMENT,
            glEnum.TEXTURE_2D,
            depthTexture,
            0);
    }

    //gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    if (DEBUG) {
        let completeness = gl.checkFramebufferStatus(glEnum.FRAMEBUFFER);
        if (completeness != glEnum.FRAMEBUFFER_COMPLETE) {
            console.log("FBO status check FAILED!: ", glReverseEnumLookUp(completeness));
        } else {
            console.log("FBO OK");
        }
    }
    return { fbo: fbo as WebGLFramebuffer, tex: tex, w, h };
}


export const createTextureFromSdfPixelData = (gl: WebGL2RenderingContext, texture: SdfPixelData) => {
    return {
        sdf: createTexture2d(gl, texture.w, texture.h, glEnum.RGBA32F, glEnum.RGBA, glEnum.FLOAT, texture.data) as WebGLTexture,
        material: createTexture2d(gl, texture.w, texture.h, glEnum.RGB, glEnum.RGB, glEnum.UNSIGNED_BYTE, texture.materialData) as WebGLTexture,
    };
};

export let mainDiv: HTMLDivElement;

export const setText = (div: HTMLDivElement, text: string, html?: number) => {
    const pSelect = html ? "innerHTML" : "innerText";
    if (div[pSelect] != text) {
        div[pSelect] = text;
    }
}

export const addText = (x: number, y: number, fontSize: number, centered: number) => {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.font = `700 ${fontSize}em sans-serif`;
    if (centered) {
        div.style.transform = "scaleY(0.9) translate(-50%,-50%)";
        div.style.textAlign = "center";
    } else {
        div.style.transform = "scaleY(0.9)";
    }

    div.style.top = `${y}%`;
    div.style.left = `${x}%`;
    div.style.color = `#FFF`;
    div.style.textShadow = "#000 0 2px 5px";
    mainDiv.appendChild(div);
    return div;
}

export const initWebgl = () => {
    console.log("JS13k2020 - Debug Build!");
    const doc = document;

    mainDiv = doc.createElement("div");
    const theDivStyle = mainDiv.style;
    theDivStyle.position = "absolute";
    theDivStyle.top = "50%";
    theDivStyle.left = "50%";
    theDivStyle.transform = "translate(-50%,-50%)";

    const canvas = doc.createElement("canvas");
    canvas.width = viewRes[0];
    canvas.height = viewRes[1];

    // canvas.style.width = `${viewRes[0] / upscale}px`;
    // canvas.style.height = `${viewRes[1] / upscale}px`;


    //canvas.style.width = `${document.documentElement.clientWidth}px`;
    const bodyStyle = document.body.style;
    bodyStyle.padding = bodyStyle.margin = "0";
    bodyStyle.width = "100%";
    bodyStyle.backgroundColor = "#000";
    bodyStyle.userSelect = "none";

    const canvasStyle = canvas.style;

    const clientWidth = document.documentElement.clientWidth * windowScale;
    const clientHeight = document.documentElement.clientHeight * windowScale;

    if (clientWidth / clientHeight > viewRes[0] / viewRes[1]) {
        canvasStyle.height = `${clientHeight}px`;
    } else {
        canvasStyle.width = `${clientWidth}px`;
    }

    const fontSizeProportion = 0.002;
    theDivStyle.fontSize = `1.8vw`;



    let gl = canvas.getContext("webgl2", { alpha: false, powerPreference: "high-performance", antialias: true }) as WebGL2RenderingContext;

    gl.getExtension('OES_texture_float_linear');
    gl.getExtension('EXT_color_buffer_float');


    gl.clearColor(0, 0, 0, 0);

    // gl.enable(glEnum.BLEND);
    //gl.blendFunc(glEnum.ONE, glEnum.ONE_MINUS_SRC_ALPHA);
    gl.blendFunc(glEnum.SRC_ALPHA, glEnum.ONE_MINUS_SRC_ALPHA);
    //gl.blendEquation(gl.FUNC_ADD);

    mainDiv.appendChild(canvas);
    doc.body.appendChild(mainDiv);
    return gl;
}

export const loadShaderAsync = (gl: WebGL2RenderingContext, type: number, source: string) => {
    return promisify(() => {
        source = "#version 300 es\nprecision highp float;\n" + source;

        const shader = gl.createShader(type) as WebGLShader;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (DEBUG) {
            if (!gl.getShaderParameter(shader, glEnum.COMPILE_STATUS)) {
                console.warn(`FAILED SHADER: (TYPE ${glReverseEnumLookUp(type)})`);
                console.warn(`ERROR LOG`, gl.getShaderInfoLog(shader));
                console.warn("============================================");
                console.warn(source);
                gl.deleteShader(shader);
                throw new Error("SHADER COMPILATION FAILED!");
            }
        }

        return shader;
    });
}

export const bindFBOAndSetViewport = (gl: WebGL2RenderingContext, size: number[], fbo?: WebGLFramebuffer | null) => {
    gl.bindFramebuffer(glEnum.FRAMEBUFFER, fbo as WebGLFramebuffer);
    gl.viewport(0, 0, size[0], size[1]);
}


export const createProgramWithShadersAsync = (gl: WebGL2RenderingContext, shaders: [WebGLShader, WebGLShader]) => {
    return promisify(() => {
        const shaderProgram = gl.createProgram() as WebGLProgram;
        shaders.forEach(x => gl.attachShader(shaderProgram, x));
        gl.linkProgram(shaderProgram);


        if (DEBUG) {
            if (!gl.getProgramParameter(shaderProgram, glEnum.LINK_STATUS)) {
                alert('Unable to link the shader program: ' + gl.getProgramInfoLog(shaderProgram));
                return null;
            }
        }

        gl.validateProgram(shaderProgram);


        if (DEBUG) {
            if (!gl.getProgramParameter(shaderProgram, glEnum.VALIDATE_STATUS)) {
                alert('Unable to validate the shader program: ' + gl.getProgramInfoLog(shaderProgram));
                return null;
            }
        }

        shaders.forEach(x => gl.deleteShader(x));

        return shaderProgram;
    });
}

export const createProgramAsync = async (gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string) => {
    const vertexShader = await loadShaderAsync(gl, glEnum.VERTEX_SHADER, vsSrc) as WebGLShader;
    const fragmentShader = await loadShaderAsync(gl, glEnum.FRAGMENT_SHADER, fsSrc) as WebGLShader;

    return createProgramWithShadersAsync(gl, [vertexShader, fragmentShader]);
}
