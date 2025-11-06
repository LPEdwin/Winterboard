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
import { spawnHeroesAsync } from "./game/level";
import { GameServer } from "./game/game-server";
import { getNewHashId } from "./game/primitives";
import { LOCAL_PEER_SERVER_CONFIG } from "./environment.dev";
import { localPlayer } from "./game/player";
import GUI from 'lil-gui';
import { World } from "./game/world";
import { create8x8BoardAsync } from "./game/board";

// Required for Github Pages deployment
DefaultLoadingManager.setURLModifier((url) => {
    if (/^(https?:|data:)/.test(url)) return url;
    const clean = url.startsWith('/') ? url.slice(1) : url;
    return import.meta.env.BASE_URL + clean;
});

let autoInit = !(getRole() === undefined);

const settings = {
    singlePlayer: isClient() && !getHostFromUrl(),
    hostId: getHostFromUrl() ?? getNewHashId('xxxxx'),
    isHost: isHost(),
    useLocalServer: useLocalServer()
}

if (!autoInit) {
    const gui = new GUI();
    gui.domElement.addEventListener('pointerdown', e => e.stopPropagation());

    gui.add(localPlayer, 'name').name('Name');

    const mult = gui.addFolder('Game');
    const actions = {
        solo: () => {
            settings.singlePlayer = true;
            settings.isHost = false;
            init().catch(console.error);
        },
        host: () => {
            settings.singlePlayer = false;
            settings.isHost = true;
            init().catch(console.error);
        },
        join: () => {
            settings.singlePlayer = false;
            settings.isHost = false;
            init().catch(console.error);
        },
    };
    mult.add(settings, 'useLocalServer').name('Dev Server');
    mult.add(settings, 'hostId').name('Host');
    mult.add(actions, 'solo').name('Solo Game');
    mult.add(actions, 'host').name('Host Game');
    mult.add(actions, 'join').name('Join Game');
}


// Renderer setup
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

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
    const board = await create8x8BoardAsync(scene);
    const world = new World(scene, renderer, camera, board);
    await spawnHeroesAsync(world, settings.singlePlayer ? 1 : 2);
    window.addEventListener("pointerdown", event => world.handlePointerEvent(event));

    if (!settings.singlePlayer) {
        const config = settings.useLocalServer ? LOCAL_PEER_SERVER_CONFIG : undefined;
        if (useLocalServer())
            console.log('Run "npx --yes -p peer peerjs --port 9000 --key peerjs" for local peer server use.');
        console.log(`Host name is ${settings.hostId}.`);
        const server = settings.isHost ?
            await GameServer.host(settings.hostId, config) :
            await GameServer.join(settings.hostId, config);
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

if (autoInit)
    init().catch(console.error);