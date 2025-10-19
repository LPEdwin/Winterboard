import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera + controls
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(-5, 10, -5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);

// Loaders
const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// === Utility functions ===
async function loadGLB(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            url,
            (gltf) => resolve(gltf.scene),
            undefined,
            (err) => reject(err)
        );
    });
}
async function loadLdrEnv(path: string) {
    const tex = await new THREE.TextureLoader().loadAsync(path);
    tex.mapping = THREE.EquirectangularReflectionMapping;

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const envRT = pmrem.fromEquirectangular(tex);
    scene.environment = envRT.texture;
    scene.background = tex;

    tex.dispose();
    pmrem.dispose();
}
await loadLdrEnv('/hdri/rich_multi_nebulae_2k.png');

// === Board ===
const boardSize = 8;
const tileSize = 1;
const tiles: THREE.Mesh[] = [];

const evenColor = new THREE.Color(0.082, 0.509, 0.690);
const oddColor = new THREE.Color(0.286, 0.851, 0.882);
const selectedColor = new THREE.Color(0.2, 0.6, 1);

// === Scene setup ===
async function init() {

    const boxModel = await loadGLB("/models/box.glb");
    const scarModel = await loadGLB("/models/card_holder.glb");

    for (let x = 0; x < boardSize; x++) {
        for (let z = 0; z < boardSize; z++) {
            const tile = boxModel.clone(true).children[0] as THREE.Mesh;
            tile.scale.multiplyScalar(0.98);
            tile.castShadow = false;
            tile.receiveShadow = true;
            tile.position.set(
                (x - boardSize / 2 + 0.5) * tileSize,
                0,
                (z - boardSize / 2 + 0.5) * tileSize
            );

            const mat = new THREE.MeshStandardMaterial();
            mat.color.copy((x + z) % 2 === 0 ? evenColor : oddColor);
            tile.material = mat;
            tile.name = `tile_${x}_${z}`;
            scene.add(tile);
            tiles.push(tile);
        }
    }

    // === Scar model ===
    const scar = scarModel.clone(true).children[0] as THREE.Mesh;
    scar.position.set(-0.1, 1, tileSize * 0.5);
    scar.castShadow = true;
    scar.receiveShadow = true;
    scene.add(scar);

    // Card plane (texture)
    const card = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshStandardMaterial({
            map: textureLoader.load("/models/Scar_Lion_King.png"),
            transparent: true,
            side: THREE.DoubleSide,
        })
    );
    card.position.set(0.1, 0.6, 0);
    scar.add(card);

    // Shadow receiver
    const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(boardSize * tileSize, boardSize * tileSize),
        new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // === Highlight + movement ===
    let highlighted: THREE.Mesh | null = null;
    let currentTarget: THREE.Vector3 | null = null;
    const MOVE_SPEED = 5;
    const clock = new THREE.Clock();

    window.addEventListener("pointerdown", (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(tiles, false);

        if (intersects.length > 0) {
            const picked = intersects[0].object as THREE.Mesh;
            currentTarget = picked.getWorldPosition(new THREE.Vector3());
            currentTarget.x += 0.4;
            currentTarget.y = scar.position.y;

            if (highlighted) {
                (highlighted.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
            }
            highlighted = picked;
            (highlighted.material as THREE.MeshStandardMaterial).emissive.copy(selectedColor);
        }
    });

    // === Animation ===
    function animate() {
        const delta = clock.getDelta();

        if (currentTarget) {
            const pos = scar.position;
            const dist = pos.distanceTo(currentTarget);
            const step = MOVE_SPEED * delta;

            if (dist <= step) {
                scar.position.copy(currentTarget);
                currentTarget = null;
            } else {
                scar.position.lerp(currentTarget, step / dist);
            }
        }

        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

init().catch(console.error);
