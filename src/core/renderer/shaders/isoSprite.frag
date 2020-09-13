uniform sampler2D uTex;
uniform sampler2D uMat;

in vec2 oVT;
in float oD;

layout(location = 0) out vec4 fc;
layout(location = 1) out vec4 m; // u,v, mid, scale

void main() {
  ivec2 iOVT = ivec2(oVT);
  vec4 texC = texelFetch(uTex, iOVT, 0);
  vec4 texMat = texelFetch(uMat, iOVT, 0);

  float inAlpha = texC.a;

  if (inAlpha == 0.0) {
    discard;
  }

  float outAlpha = ((oD + (inAlpha * 2. - 1.)) + 1.) / 2.;
  fc = vec4(texC.rgb, outAlpha);
  m = vec4(texMat.rgb, outAlpha);
}