import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadGLB, buildPrefilteredRadianceMap } from "./loaders";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { isMobile } from "./device";
import Stats from 'three/addons/libs/stats.module.js';

// Required for Github Pages deployment
THREE.DefaultLoadingManager.setURLModifier((url) => {
    if (/^(https?:|data:)/.test(url)) return url;
    const clean = url.startsWith('/') ? url.slice(1) : url;
    return import.meta.env.BASE_URL + clean;
});

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

// Renderer setup
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile(),
    powerPreference: isMobile() ? 'default' : 'high-performance',
});
const DPR_CAP = isMobile() ? 1.0 : 1.5;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Scene + Background
const scene = new THREE.Scene();

const backgroundMap = await new THREE.TextureLoader().loadAsync('/hdri/rich_multi_nebulae_2k.png');
backgroundMap.colorSpace = THREE.SRGBColorSpace;
scene.background = (await buildPrefilteredRadianceMap(backgroundMap, renderer)).texture;

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

controls.mouseButtons = {
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE
};

// Lights
const radianceMap = await new HDRLoader().loadAsync('/hdri/kloppenheim_02_puresky_1k.hdr');
scene.environment = (await buildPrefilteredRadianceMap(radianceMap, renderer)).texture;

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(-5, 10, -5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);


// const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
// dirLight.position.set(-5, 10, -5);
// dirLight.castShadow = true;
// dirLight.shadow.mapSize.set(1024, 1024);
// scene.add(dirLight);

// const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
// scene.add(hemiLight);

// const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
// scene.add(ambientLight);


// === Board ===
const boardSize = 8;
const tileSize = 1;
const tiles: THREE.Mesh[] = [];

const evenColor = new THREE.Color(0.082, 0.509, 0.690).convertSRGBToLinear();
const oddColor = new THREE.Color(0.286, 0.851, 0.882).convertSRGBToLinear();;

// === Scene setup ===
async function init() {
    const tile_mesh = (await loadGLB("/models/box.glb")).children[0]!;

    for (let x = 0; x < boardSize; x++) {
        for (let z = 0; z < boardSize; z++) {
            const mat = new THREE.MeshStandardMaterial(
                {
                    metalness: 0.1,
                    roughness: 0.35
                }
            );
            const tile = tile_mesh.clone() as THREE.Mesh;
            tile.scale.multiplyScalar(0.98);
            tile.castShadow = false;
            tile.receiveShadow = true;
            tile.position.set(
                (x - boardSize / 2 + 0.5) * tileSize,
                0,
                (z - boardSize / 2 + 0.5) * tileSize
            );

            mat.color.copy((x + z) % 2 === 0 ? evenColor : oddColor);
            tile.material = mat;
            tile.name = `tile_${x}_${z}`;
            scene.add(tile);
            tiles.push(tile);
        }
    }

    // Shadow receiver
    const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(boardSize * tileSize, boardSize * tileSize),
        new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // === Effect ===
    let composer: EffectComposer | undefined;
    if (!isMobile()) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));

        const bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
        /*strength*/1.2,
        /*radius*/0.4,
        /*threshold*/0.85
        );
        composer.addPass(bloom);
    }

    // === Scar model ===    
    const scar = (await loadGLB("/models/card_holder.glb")).children[0]!.clone() as THREE.Mesh;
    scar.position.set(-0.1, 0.5, tileSize * 0.5);
    scar.castShadow = true;
    scar.receiveShadow = true;
    scene.add(scar);

    const orange_mat = new THREE.MeshStandardMaterial({
        color: 0xdd8437,
        metalness: 0,
        roughness: 0.2,
    });

    scar.material = orange_mat;

    // Card 
    const tex = await new THREE.TextureLoader().loadAsync("/models/Scar_Lion_King.png");
    tex.colorSpace = THREE.SRGBColorSpace;

    const card = new THREE.Mesh(
        new THREE.PlaneGeometry(3.34, 2.98),
        new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.05,
            side: THREE.DoubleSide,
            depthWrite: false,   // avoid sorting artifacts
        })
    );

    card.scale.multiplyScalar(0.4);
    card.position.z -= 0.75;
    card.position.y -= 0.25;
    card.rotation.set(-Math.PI * 0.5, -Math.PI * 0.5, 0);

    scar.add(card);

    // === Interaction ===
    let currentPick: THREE.Mesh | null = null;
    let currentMaterial: THREE.Material | THREE.Material[] | null = null
    let currentTarget: THREE.Vector3 | null = null;
    let highlighMaterial = new THREE.MeshStandardMaterial(
        {
            color: 0x000000,
            emissive: 0xeeeeee,
        }
    );
    const MOVE_SPEED = 5;

    window.addEventListener("pointerdown", (event) => {
        if (event.button != 0)
            return;
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(tiles, false);

        if (intersects.length > 0) {
            const picked = intersects[0]?.object as THREE.Mesh;
            currentTarget = picked.getWorldPosition(new THREE.Vector3());
            currentTarget.x += 0.4;
            currentTarget.y = scar.position.y;

            if (currentPick) {
                // restore material
                currentPick.material = currentMaterial!;
            }
            currentPick = picked;
            currentMaterial = picked.material;
            currentPick.material = highlighMaterial;
        }
    });

    // === Update ===
    const clock = new THREE.Clock();
    const stats = new Stats();
    stats.dom.style.position = 'fixed';
    stats.dom.style.top = 'calc(env(safe-area-inset-top,0px) + 10px)';
    stats.dom.style.left = 'calc(env(safe-area-inset-left,0px) + 10px)';
    stats.dom.style.zIndex = '9999';
    stats.dom.style.transformOrigin = 'top left';
    stats.dom.style.transform = isMobile() ? 'scale(1.6)' : 'scale(1)';
    document.body.appendChild(stats.dom);

    function Update() {
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
        if (isMobile()) {
            renderer.render(scene, camera);
        }
        else {
            composer?.render();
        }
        stats.update();
        requestAnimationFrame(Update);
    }
    Update();

    window.addEventListener("resize", () => {
        stats.dom.style.transform = isMobile() ? 'scale(1.6)' : 'scale(1)';
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

init().catch(console.error);
