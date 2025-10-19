import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const gltfLoader = new GLTFLoader();

export async function loadGLB(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            url,
            (gltf) => resolve(gltf.scene),
            undefined,
            (err) => reject(err)
        );
    });
}

export async function buildPrefilteredRadianceMap(texture: THREE.Texture, renderer: THREE.WebGLRenderer) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(texture);
    pmrem.dispose();
    return envRT;
}
