import { Mesh, MeshStandardMaterial, TextureLoader, SRGBColorSpace, PlaneGeometry, MeshBasicMaterial, DoubleSide } from "three";
import { loadGLB } from "../loaders";
import { Pawn } from "./pawn";

export async function createScarAsync(): Promise<Pawn> {

    const scar = new Pawn();

    const scarMesh = (await loadGLB("/models/card_holder.glb")).children[0]!.clone() as Mesh;
    scarMesh.position.set(-0.1, 0.5, 0.5);
    scarMesh.castShadow = true;
    scarMesh.receiveShadow = true;
    scar.mesh = scarMesh;
    scar.moveSpeed = 5.0;

    const orange_mat = new MeshStandardMaterial({
        color: 0xdd8437,
        metalness: 0,
        roughness: 0.2,
    });

    scarMesh.material = orange_mat;

    // Card 
    const tex = await new TextureLoader().loadAsync("/models/Scar_Lion_King.png");
    tex.colorSpace = SRGBColorSpace;

    const card = new Mesh(
        new PlaneGeometry(3.34, 2.98),
        new MeshBasicMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.05,
            side: DoubleSide,
            depthWrite: false,   // avoid sorting artifacts
        })
    );

    card.scale.multiplyScalar(0.4);
    card.position.z -= 0.75;
    card.position.y -= 0.25;
    card.rotation.set(-Math.PI * 0.5, -Math.PI * 0.5, 0);

    scarMesh.add(card);

    return scar;
}