precision mediump float;

#include <clipping_planes_pars_vertex>
#include <common>

uniform float objectId;

varying vec4 vColor;

void main() {
#include <begin_vertex>
#include <worldpos_vertex>
#include <project_vertex>
#include <clipping_planes_vertex>

  vColor = vec4(position, objectId);
}
