#include <common>
#include <clipping_planes_pars_vertex>

varying vec4 vColor;
uniform float objectId;
uniform mat4 objectTransform;

void main() {
	#include <begin_vertex>

	vColor = vec4(transformed, 1.0);
	vColor = objectTransform * vColor;
	vColor.w = objectId;

	#include <project_vertex>

	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
}
