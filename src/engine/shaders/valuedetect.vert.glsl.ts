export default `
#include <common>
#include <clipping_planes_pars_vertex>

attribute float generic;
varying vec4 vColor;
uniform mat4 afterProjectMatrix;

void main() {
	#include <begin_vertex>

	vColor = vec4(transformed, generic); // combine position and value as color

	#include <project_vertex>
	gl_Position = afterProjectMatrix*gl_Position;

	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
}
`;
