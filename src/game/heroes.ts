import {
    Mesh,
    MeshStandardMaterial,
    TextureLoader,
    SRGBColorSpace,
    PlaneGeometry,
    MeshBasicMaterial,
    DoubleSide,
    Group,
    type ColorRepresentation
} from "three";
import { loadGLB } from "../loaders";
import { Pawn } from "./pawn";
import { HealthComponent } from "./health.component";

export async function createScarAsync(): Promise<Pawn> {
    return createHeroAsync("/models/Scar_Lion_King.png", 'Scar', 0xdd8437);
}

export async function createThumperAsync(): Promise<Pawn> {
    return createHeroAsync("/models/thumper.png", 'Thumper');
}

export async function createMulanAsync(): Promise<Pawn> {
    return createHeroAsync("/models/mulan.png", 'Mulan');
}

export async function createCaptainHookAsync(): Promise<Pawn> {
    return createHeroAsync("/models/captain_hook.png", 'Captain Hook');
}

export async function createMaleficentAsync(): Promise<Pawn> {
    return createHeroAsync("/models/maleficent.png", 'Maleficent', 0x880C59);
}

export async function createHadesAsync(): Promise<Pawn> {
    return createHeroAsync("/models/hades.png", 'Hades');
}

export async function createHeroAsync(cardUrl: string, name: string, color: ColorRepresentation = 0x3333aa): Promise<Pawn> {

    // Root
    const root = new Group();
    root.name = `${name}_root`;

    // Card Holder
    const mesh = (await loadGLB("/models/card_holder.glb")).children[0]!.clone() as Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);

    // Material
    const mat = new MeshStandardMaterial({
        color: color,
        metalness: 0,
        roughness: 0.2,
    });
    mesh.material = mat;

    // Card 
    const tex = await new TextureLoader().loadAsync(cardUrl);
    tex.colorSpace = SRGBColorSpace;
    const ar = tex.width / tex.height;
    const card = new Mesh(
        new PlaneGeometry(1 * ar, 1),
        new MeshBasicMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.05,
            side: DoubleSide,
            depthWrite: false,   // avoid sorting artifacts
        })
    );
    card.position.y += 0.65;
    root.add(card);

    // Pawn
    const pawn = new Pawn(name, root);
    pawn.moveSpeed = 5.0;

    HealthComponent.addComponent(pawn);

    return pawn;
}