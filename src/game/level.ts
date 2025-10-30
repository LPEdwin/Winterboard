import type { Scene } from "three";
import { create8x8BoardAsync } from "./board";
import { createScarAsync, createHadesAsync, createCaptainHookAsync, createMaleficentAsync, createThumperAsync, createMulanAsync } from "./heroes";
import type { Team } from "./primitives";
import { World } from "./world";
import { localPlayer } from "./player";

export async function createWorldAsync(scene: Scene, playerCount: number = 1): Promise<World> {
    const board = await create8x8BoardAsync(scene);
    const world = new World(scene, board);

    const teamA: Team = {
        id: 0,
        pawns: [
            await createScarAsync(),
            await createHadesAsync(),
            await createCaptainHookAsync()
        ],
        controller: undefined
    };

    const teamB: Team = {
        id: 1,
        pawns: [
            await createMaleficentAsync(),
            await createThumperAsync(),
            await createMulanAsync()
        ],
        controller: undefined
    };

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