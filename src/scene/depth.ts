import * as THREE from "three";

const DEPTH_STEP = 1.8 / 96;
export const POND_DEPTH_SCALE = DEPTH_STEP * 0.45;
const bindings = new WeakMap<THREE.Material, THREE.IUniform<THREE.Vector2>>();

export function depthBand(layer: number) {
  if (!Number.isInteger(layer) || layer < 0 || layer >= 96)
    throw new RangeError("Pond layers must be integers from 0 to 95");
  return { center: 0.9 - layer * DEPTH_STEP, scale: POND_DEPTH_SCALE };
}

function bindDepth(material: THREE.Material, layer: number) {
  const band = depthBand(layer);
  const existing = bindings.get(material);
  if (existing) {
    existing.value.set(band.center, band.scale);
    return;
  }
  const uniform = { value: new THREE.Vector2(band.center, band.scale) },
    previous = material.onBeforeCompile,
    cacheKey = material.customProgramCacheKey();
  bindings.set(material, uniform);
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.uPondDepth = uniform;
    const shadowReferences = shader.vertexShader.includes(
      "#include <shadowmap_vertex>",
    )
      ? `
  #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
      vDirectionalShadowCoord[ i ].z = 0.5 * (1.0 + uPondDepth.x - uPondDepth.y) * vDirectionalShadowCoord[ i ].w + uPondDepth.y * vDirectionalShadowCoord[ i ].z;
    }
    #pragma unroll_loop_end
  #endif
`
      : "";
    // Keep the original projected silhouette, normals, lighting and internal
    // depth. Only place this object's depth interval ahead of the layer below.
    shader.vertexShader =
      `uniform vec2 uPondDepth;\n` +
      shader.vertexShader.replace(
        /void\s+main\s*\(\s*\)\s*\{/,
        "void pondObjectVertex() {",
      ) +
      `
void main() {
  pondObjectVertex();
  gl_Position.z = (uPondDepth.x + uPondDepth.y * clamp(gl_Position.z / gl_Position.w, -1.0, 1.0)) * gl_Position.w;
  #ifdef POND_DEPTH_MATERIAL
    vHighPrecisionZW = gl_Position.zw;
  #endif
  // The directional shadow lookup uses the same bands as its depth caster:
  // a lower leaf can never cast a cut-through shadow onto a higher flower.
  ${shadowReferences}
}
`;
  };
  material.customProgramCacheKey = () => `${cacheKey}|pond-depth-v1`;
  material.needsUpdate = true;
}

/** Stable painter layers, with genuine per-object self-occlusion and shadows. */
export function setPondLayer(root: THREE.Object3D, layer: number) {
  depthBand(layer);
  const materials = new Set<THREE.Material>();
  root.traverse((part) => {
    part.renderOrder = layer;
    if (!(part instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(part.material)
      ? part.material
      : [part.material]) {
      if (!materials.has(material)) {
        bindDepth(material, layer);
        materials.add(material);
      }
    }
    if (part.castShadow) {
      const depth = part.customDepthMaterial ?? new THREE.MeshDepthMaterial();
      depth.defines = { POND_DEPTH_MATERIAL: 1 };
      bindDepth(depth, layer);
      part.customDepthMaterial = depth;
    }
  });
}
