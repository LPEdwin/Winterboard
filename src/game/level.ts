import type { Scene } from "three";
import { create8x8BoardAsync } from "./board";
import {
    createScarAsync,
    createHadesAsync,
    createCaptainHookAsync,
    createMaleficentAsync,
    createThumperAsync,
    createMulanAsync
} from "./heroes";
import { World } from "./world";
import { localPlayer } from "./player";
import { Team } from "./team";

export async function createLevelAsync(scene: Scene, playerCount: number = 1): Promise<World> {
    const board = await create8x8BoardAsync(scene);
    const world = new World(scene, board);

    const teamA = new Team([
        await createScarAsync(),
        await createHadesAsync(),
        await createCaptainHookAsync()
    ]);

    const teamB = new Team([
        await createMaleficentAsync(),
        await createThumperAsync(),
        await createMulanAsync()
    ]);

    teamA.pawns.forEach((x, i) => {
        x.setPosition(board.getTileAnchor(i + 2, 0));
    });

    teamB.pawns.forEach((x, i) => {
        x.setPosition(board.getTileAnchor(i + 2, 7));
    });

    if (playerCount == 1) {
        teamA.controller = localPlayer;
        teamB.controller = localPlayer;
    }

    world.spawnTeam(teamA);
    world.spawnTeam(teamB);

    return world;
}