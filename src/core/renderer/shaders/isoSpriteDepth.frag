uniform sampler2D uTex;
in vec2 oVT;

in float oD;

layout(location = 0) out vec4 fc;

void main() {
  vec4 texC = texelFetch(uTex, ivec2(oVT), 0);
  float dist = oD + (texC.r * 2. - 1.) / 2.;

  if (texC.a <= 0.0) {
    discard;
  } 
  
  fc = vec4(vec3(dist), 1.0);
}