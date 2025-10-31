import { getHostFromUrl, getRole, isClient, isHost, isMobile, useLocalServer } from "./device";
import {
    createCamera,
    createControls,
    createBackground,
    createLightsAsync,
    createGlowEffect
} from "./game/scene-elements";
import { Clock, DefaultLoadingManager, PCFSoftShadowMap, Scene, SRGBColorSpace, WebGLRenderer } from "three";
import { renderFps } from "./game/fps-overlay";
import { createLevelAsync } from "./game/level";
import { GameServer } from "./game/game-server";
import { getNewHashId } from "./game/primitives";
import { LOCAL_PEER_SERVER_CONFIG } from "./environment.dev";

// Required for Github Pages deployment
DefaultLoadingManager.setURLModifier((url) => {
    if (/^(https?:|data:)/.test(url)) return url;
    const clean = url.startsWith('/') ? url.slice(1) : url;
    return import.meta.env.BASE_URL + clean;
});

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

// Renderer setup
const renderer = new WebGLRenderer({
    canvas,
    antialias: !isMobile(),
    powerPreference: isMobile() ? 'default' : 'high-performance',
});

renderer.setPixelRatio(1.0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

// === Scene setup ===
async function init() {
    const scene = new Scene();
    const camera = createCamera();
    const controls = createControls(camera, renderer);
    let composer = isMobile() ?
        undefined :
        createGlowEffect(scene, camera, renderer)

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (composer)
            composer = createGlowEffect(scene, camera, renderer);
    });

    await createBackground(scene, renderer);
    await createLightsAsync(scene, renderer);

    const invalidRole = isClient() && !getHostFromUrl();
    if (invalidRole)
        console.warn(`Client role set but missing host name.`)
    const singlePlayer = getRole() == undefined || invalidRole;

    const world = await createLevelAsync(scene, singlePlayer ? 1 : 2);
    window.addEventListener("pointerdown", event => world.handlePointerEvent(event, camera, renderer));

    if (!singlePlayer) {
        const config = useLocalServer() ? LOCAL_PEER_SERVER_CONFIG : undefined;
        if (useLocalServer())
            console.log('Run "npx --yes -p peer peerjs --port 9000 --key peerjs" for local peer server use.');
        let hostId = getHostFromUrl() ?? getNewHashId('xxxxx');
        console.log(`Server name is ${hostId}.`);
        const server = isHost() ?
            await GameServer.host(hostId, config) :
            await GameServer.join(hostId, config);
        world.attachServer(server);
    }

    const clock = new Clock();

    function Update() {
        const delta = clock.getDelta();
        world.update(delta)
        controls.update();
        if (composer) {
            composer.render();
        }
        else {
            renderer.render(scene, camera);
        }
        renderFps(delta);

        requestAnimationFrame(Update);
    }

    // Run loop
    Update();
}

init().catch(console.error);
