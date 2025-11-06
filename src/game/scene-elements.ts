import {
    Camera,
    DirectionalLight,
    MOUSE,
    PerspectiveCamera,
    Scene,
    SRGBColorSpace,
    TextureLoader,
    Vector2,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import { EffectComposer, HDRLoader, RenderPass, UnrealBloomPass } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildPrefilteredRadianceMap } from "../loaders";

export function createCamera(pixel_width: number, pixel_height: number): PerspectiveCamera {
    const camera = new PerspectiveCamera(
        45,
        pixel_width / pixel_height,
        0.1,
        1000
    );
    camera.position.set(8, 8, 8);
    camera.lookAt(0, 0, 0);

    return camera;
}

export function createControls(camera: Camera, renderer: WebGLRenderer): OrbitControls {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    controls.mouseButtons = {
        MIDDLE: MOUSE.PAN,
        RIGHT: MOUSE.ROTATE
    };

    return controls;
}

export async function createLightsAsync(scene: Scene, renderer: WebGLRenderer): Promise<void> {
    const radianceMap = await new HDRLoader().loadAsync('/hdri/kloppenheim_02_puresky_1k.hdr');
    scene.environment = (await buildPrefilteredRadianceMap(radianceMap, renderer)).texture;

    const dirLight = new DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-5, 10, -5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);
}

export async function createBackground(scene: Scene, renderer: WebGLRenderer): Promise<void> {
    const backgroundMap = await new TextureLoader().loadAsync('/hdri/rich_multi_nebulae_2k.png');
    backgroundMap.colorSpace = SRGBColorSpace;
    scene.background = (await buildPrefilteredRadianceMap(backgroundMap, renderer)).texture;
}

export function createGlowEffect(scene: Scene, camera: Camera, renderer: WebGLRenderer)
    : EffectComposer {

    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;

    const bloom = new UnrealBloomPass(
        new Vector2(w, h),
                /*strength*/1.2,
                /*radius*/0.4,
                /*threshold*/0.85
    );

    const rt = new WebGLRenderTarget(w, h, {
        samples: Math.min(4, renderer.capabilities.maxSamples)
    });

    const composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);

    return composer;
}