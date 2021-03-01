#include <common>
#include <clipping_planes_pars_fragment>

varying vec4 vColor;

void main() {

	#include <clipping_planes_fragment>

	gl_FragColor = vColor;

}
