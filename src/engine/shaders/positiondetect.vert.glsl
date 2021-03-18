#include <common>
#include <clipping_planes_pars_vertex>

varying vec4 vColor;
uniform float objectId;
uniform mat4 objectTransform;
uniform mat4 afterProjectMatrix;

void main() {
	#include <begin_vertex>

	vColor = vec4(transformed, 1.0);
	vColor = objectTransform * vColor;
	vColor.w = objectId;

	#include <project_vertex>
	gl_Position = afterProjectMatrix*gl_Position;

	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
}
