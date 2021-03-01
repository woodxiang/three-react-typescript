#include <common>
#include <clipping_planes_pars_vertex>

varying vec4 vColor;
uniform float objectId;

void main() {
	#include <begin_vertex>

  vColor = vec4(transformed, objectId); // set the postion as color.

	#include <project_vertex>

	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
}
