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
      if (key.startsWith('wrapped')) {
        const key1 = key[7].toLowerCase() + key.substring(8);
        ret[key1] = { value };
      } else {
        ret[key] = { value };
      }
    }
  });

  return ret;
}
