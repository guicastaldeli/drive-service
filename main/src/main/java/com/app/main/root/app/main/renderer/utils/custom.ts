import { Cloud } from "@/public/data/mesh/cloud";
import { Fresnel } from "@/public/data/mesh/fresnel";
import { MeshData } from "../mesh/mesh-data";
import { Transform } from "./transform";
import { MeshRenderer } from "../mesh/mesh-renderer";

export class Custom {
    private cloud: Cloud;

    public isChat: boolean = false;
    public isFresnel: boolean = false;

    constructor() {
        this.cloud = new Cloud();
    }

    /**
     * Chat
     */
    private setChat(
        data: MeshData, 
        color: [number, number, number], 
        transform: Transform
    ): [number, number, number] {
        const cRes = this.cloud.set(data, this.isChat, color, transform);
        return cRes.color;
    }


    /**
     * Fresnel
     */
    private setFresnel(data: MeshData): void {
        const fRes = Fresnel.set(data, this.isFresnel);
        this.isFresnel = fRes.isFresnel;
    }

    /**
     * Init
     */
    public init(
        data: MeshData, 
        color: [number, number, number], 
        transform: Transform
    ): [number, number, number] {
        color = this.setChat(data, color, transform);
        this.setFresnel(data);
        return color;
    }

    /**
     * Update
     */
    public update(transform: Transform): void {
        this.cloud.update(transform);
    }

    /**
     * Set
     */
    public set(
        transform: Transform,
        enabled: boolean, 
        speed: number, 
        height: number
    ): void {
        this.cloud.setFloatingProps(
            transform,
            enabled,
            speed,
            height
        );
    }

    /**
     * Assign
     */
    public assign(meshes: MeshRenderer[]): void {
        this.cloud.assignRandomProps(meshes);
    }
}