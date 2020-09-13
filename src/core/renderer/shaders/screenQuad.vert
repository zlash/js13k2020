layout(location = 0) in vec2 v;//aVertexPosition

out vec2 vp; //vertexPosition

void main()
{
    vp = v;
    gl_Position = vec4(v.xy, 0.0, 1.0);
}