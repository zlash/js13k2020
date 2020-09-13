#define uShadowTex _A
#define uAccumTex _B
#define uMatTex _C

#define uAccumView _D
#define uShadowView _E
#define uViewSize _F

uniform sampler2D uShadowTex;
uniform sampler2D uAccumTex;
uniform sampler2D uMatTex;

uniform mat4 uAccumView;
uniform mat4 uShadowView;
uniform vec2 uViewSize;

layout(location = 0) out vec4 fC;

in vec2 vp;

void main() {

  vec4 accumTexel = texelFetch(uAccumTex, ivec2(gl_FragCoord.xy), 0);

  #define matTexel (texelFetch(uMatTex, ivec2(gl_FragCoord.xy), 0))

  float accumDepth = accumTexel.a * 2.0 - 1.0;

  vec4 posInWorld = inverse(uAccumView) * vec4(vp, accumDepth, 1.0);
  vec4 posInShadow = uShadowView * posInWorld;

  float x, y;
  float shadow = 0.0;
  for (y = -1.5; y <= 1.5; y += 1.0) {
    for (x = -1.5; x <= 1.5; x += 1.0) {
      vec4 shadowTexel =
          texture(uShadowTex, ((posInShadow.xy + vec2(1.0)) / vec2(2.0)) +
                                  vec2(x, y) / uViewSize);
      float shadowDepthExpanded = shadowTexel.a * 2.0 - 1.0;
      shadow += posInShadow.z + 0.05 > shadowDepthExpanded ? 1.0 : 0.4;
    }
  }

  shadow /= 16.0;

  // float shadow = posInShadow.z + 0.05 > shadowDepthExpanded ? 1.0 : 0.35;

  vec3 normal = normalize(accumTexel.rgb * 2.0 - vec3(1.0));

  vec3 solidColor = vec3(0.99, 0.97, 0.95);
  float matId = matTexel.x * 255.0;

  vec3 sunColor = vec3(0.95, 0.95, 0.85);
  vec3 skyColor = vec3(0.54, 0.69, 0.9);
  vec3 metalColor = vec3(0.6, 0.66, 0.72);
  vec3 grassColor = vec3(0.0, 0.7, 0.0);
  vec3 goldColor = vec3(1.0, 1.0, 0.0);

  float pseudoEnvMapAngle = dot(normal, vec3(0.0, 1.0, 0.0));

#define metal80s                                                               \
  (sin(pseudoEnvMapAngle * 3.14 + 15.0 * gl_FragCoord.y / uViewSize.y) * 0.5)

  //
  // MATERIALS
  //
  if (matId > 0.5) { // 1: Gold
    solidColor = goldColor;
  }
  if (matId > 1.5) { // 2: ???
    solidColor = goldColor;
  }
  if (matId > 2.5) { // 3: Grass
    solidColor = grassColor;
  }
  if (matId > 3.5) { // 4: Earth
    solidColor = vec3(0.7, 0.45, 0.2);
  }
  if (matId > 4.5) { // 5: Wood
    solidColor = vec3(0.7, 0.45, 0.2);
  }
  if (matId > 5.5) { // 6: Stone
    solidColor = 0.8 * vec3(0.9961, 0.9765, 0.9529);
  }
  if (matId > 6.5) { // 7: Metal
    solidColor = (pseudoEnvMapAngle + metal80s + 1.0) / 2.0 * metalColor * 1.1 +
                 (-pseudoEnvMapAngle + 1.0) / 2.0 * grassColor;
  }

  #define uLightDirection (normalize(vec3(0.75, 1.0, 0.4)))

  #define lightDot dot(uLightDirection, normal)

  vec3 light = shadow * sunColor * max(0.0, lightDot) // Direct light
               + skyColor * 0.3;                      // Ambient general
  // Ambient general

  /*

  light += 0.5 * sunColor * max(0.0, -normalDot) +
  */
  /*
    vec3 i_ambient =
        0.6 * mix(vec3(0.72549, 0.933333, 0.870588), // Ambient from bottom
                  vec3(0.7725, 0.9686, 0.9647),      // Ambient from top
                  (normal.y + 1.0) / 2.0);
                  */

  // Two point lighting: Sun, inverse sun,

  // vec3 color = i_solidColor * clamp(light * mod(posInWorld.z / 0.5, 1.0),
  // 0.0, 1.0);

  vec3 color = solidColor * clamp(light, 0.0, 1.0);

  #define screenUv (gl_FragCoord.xy / uViewSize)

  if (accumDepth == -1.0) {
    color = mix(vec3(0.2039, 0.3961, 0.6431), skyColor, screenUv.y);
  }

  /*
    float normalProj = dot(posInShadow.xyz, normal);
    vec3 pointInPlane = posInShadow.xyz - normal * normalProj;

    vec3 mx = normalize(cross(vec3(0.0, 0.0, 1.0), normal));
    vec3 mz = normalize(cross(normal, mx));

    vec2 uv = (mat3(mx, normal, mz) * pointInPlane).xz * 2.0;

    vec3 checkers =
        vec3(step(cos(uv.x * 3.1415) * sin(uv.y * 2.0 * 3.1415) + 1.0, 1.0));
  */

  // color = clamp(color * mod(posInWorld.z / 0.5, 1.0), 0.0, 1.0);
  // vec3 color =
  // clamp(shadow*vec3((normal+1.0)/2.0)*mod(posInWorld.z/0.5,1.0),0.0,1.0)*0.8;

  // color = pow(color, vec3(1.0 / 2.2));

  fC = vec4(clamp(color, 0.0, 1.0), 1.0);
  // fC = vec4((normal + vec3(1.0)) / 2.0, 1.0);
  // fC = vec4(1.0,0.0,0.0,1.0);
}
