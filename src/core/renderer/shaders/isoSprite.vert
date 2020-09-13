#define uViewMatrix _G
#define uCameraAndSpritesRes _H
#define uViewBoxAndSolidOnly _I

#define Prerender _J
#define PrerenderStruct _K
#define prerender _L

#define vertexPosition _M 
#define sprPos _N
#define prerenderId _O
#define modData _P

#define MainUniformBlock _Q

#define texSubrect _U
#define texSolidSubrect _V
#define regPoint _W
#define pad _X

layout(location = 1) in vec2 vertexPosition;  // vertexPosition
layout(location = 2) in vec3 sprPos; // sprPos
layout(location = 3) in float prerenderId; // PreId
layout(location = 4) in vec3 modData;  // Mod Data (x: zOffset)

struct PrerenderStruct {
  vec4 texSubrect;
  vec4 texSolidSubrect;
  vec2 regPoint;
  vec2 pad;
};

layout(std140) uniform Prerender { PrerenderStruct prerender[300]; };


layout(std140) uniform MainUniformBlock { 
  mat4 uViewMatrix;
  vec4 uCameraAndSpritesRes;
  vec4 uViewBoxAndSolidOnly;
};

out vec2 oVT; // vTextureCoord
out vec3 oW;  // worldPos
out float oD; // viewDepth
out float oC; // colorMod

void main() {
  PrerenderStruct prerenderData = prerender[int(prerenderId)];

  #define pdTexSubrect prerenderData.texSubrect
  #define pdTexSolidSubrect prerenderData.texSolidSubrect

  #define registrationPoint prerenderData.regPoint

  float tighten = 0.97;

  float solidOnly = uViewBoxAndSolidOnly.a;
  float spritesRes = uCameraAndSpritesRes.a;
  vec3 viewBox = uViewBoxAndSolidOnly.xyz;

  vec4 texSubrect = solidOnly!= 0.0 ? pdTexSolidSubrect : pdTexSubrect;

  #define sizeOriginal (texSubrect.zw * viewBox.xy / spritesRes)

  #define viewOffset \
      (solidOnly != 0.0 ? ((texSubrect.xy - texSubrect.xy + (texSubrect.zw - texSubrect.zw) / 2.0) / \
                    texSubrect.zw) * \
                       sizeOriginal * vec2(2, -2) \
                 : vec2(0.0)) \

  vec4 fullViewPos = uViewMatrix * tighten * vec4(sprPos, 1);

  fullViewPos += vec4(0.0, 0.0, modData.z, 0.0);

  oD = fullViewPos.z;



  oVT = (vec2(1) - ((vec2(-vertexPosition.x, vertexPosition.y) + vec2(1)) / 2.)) * texSubrect.zw +
        texSubrect.xy;

  #define viewPos (fullViewPos.xy + registrationPoint * viewBox.xy / 2.0)

  #define quadScaledInView ((vertexPosition.xy * sizeOriginal + viewOffset) / tighten)

  gl_Position = vec4(viewPos + quadScaledInView, -oD / (50.0 * viewBox.z), 1);


}