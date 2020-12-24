attribute float generic;

uniform sampler2D colorMapTexture;
uniform float colorMapOffset;
uniform float colorMapRatio;

varying vec4 vColor;
varying vec3 vNormal;

void main(){
    vNormal=normal;
    vColor=texture2D(colorMapTexture,vec2((generic+colorMapOffset)*colorMapRatio,1.));
    //vColor=texture2D(colorMapTexture,vec2(colorMapRatio/100.,1.));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}