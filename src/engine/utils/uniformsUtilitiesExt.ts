import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';

const skip = new Set<string>();
skip.add('uniforms');
skip.add('vertexShader');
skip.add('fragmentShader');

export default function toUniform(shaderMaterial: ShaderMaterial): unknown {
  if (!shaderMaterial) {
    throw Error('invalid shader material');
  }
  const ret: Record<string, { value: unknown }> = {};
  Object.entries(shaderMaterial).forEach((v) => {
    const [key, value] = v;
    if (!skip.has(key)) {
      ret[key] = { value };
    }
  });

  return ret;
}
