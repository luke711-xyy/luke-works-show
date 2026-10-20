import * as THREE from "three";

/** Both panels end at the same world x; foliage cannot overprint its neighbor. */
export class PondSeam {
  readonly home = new THREE.Plane(new THREE.Vector3(-1, 0, 0));
  readonly works = new THREE.Plane(new THREE.Vector3(1, 0, 0));
  update(width: number, cameraX: number) {
    const boundary = width / 2 - cameraX;
    this.home.constant = boundary;
    this.works.constant = -boundary;
  }
  bind(root: THREE.Object3D, domain: "pond" | "works" | null) {
    const planes = domain ? [domain === "pond" ? this.home : this.works] : null;
    root.traverse((part) => {
      if (!(part instanceof THREE.Mesh)) return;
      const materials = Array.isArray(part.material)
        ? [...part.material]
        : [part.material];
      if (part.customDepthMaterial) materials.push(part.customDepthMaterial);
      for (const material of materials) {
        material.clippingPlanes = planes;
        material.clipShadows = true;
      }
    });
  }
}
