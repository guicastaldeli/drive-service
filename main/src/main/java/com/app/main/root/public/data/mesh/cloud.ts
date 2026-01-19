import { MeshData } from "@/app/main/renderer/mesh/mesh-data";
import { MeshRenderer } from "@/app/main/renderer/mesh/mesh-renderer";
import { Tick } from "@/app/main/renderer/tick";
import { Transform } from "@/app/main/renderer/utils/transform";

/**
 * 
 * 
 *      Cloud Mesh General Configuration...
 * 
 * 
 */

export class Cloud {
    public floatingEnabled: boolean = false;
    public floatingSpeed: number = 1.0;
    public floatingHeight: number = 0.2;
    public floatingTime: number = 0.0;
    public originalY: number = 0.0;

    /**
     * Set Mesh Config
     */
    public set(
        data: MeshData, 
        isChat: boolean,
        color: [number, number, number],
        transform: Transform
    ): { isChat: boolean, color: [number, number, number] } {
        this.originalY = transform.position[1];

        if(data.name.includes('cloud1') ||
            data.name.includes('cloud2')
        ) {
            this.floatingEnabled = true;
        }
        if(data.name.includes('cloud1') && 
            !data.name.includes('cloud2')
        ) {
            isChat = true;
        } else {
            isChat = false;
        }

        return { isChat, color }
    }
    
    /**
     * Assign Random Props
     */
    public assignRandomProps(meshes: MeshRenderer[]): void {
        meshes.forEach(m => {
            const data = m.getMeshData();
            if(data && 
                (data.name.includes('cloud1') ||
                data.name.includes('cloud2'))
            ) {
                const randomSpeed = 0.5 + Math.random() * 1.0;
                const randomHeight = 0.1 + Math.random() * 0.3;
                this.setFloatingProps(
                    m.transform,
                    true,
                    randomSpeed,
                    randomHeight
                );
            }
        });
    }

    /**
     * Floating Props
     */
    public setFloatingProps(
        transform: Transform,
        enabled: boolean, 
        speed: number, 
        height: number
    ): void {
        this.floatingEnabled = enabled;
        this.floatingSpeed = speed
        this.floatingHeight = height;
        this.originalY = transform.position[1];
    }

    /**
     * Update
     */
    public update(transform: Transform): void {
        if(!this.floatingEnabled) return;

        this.floatingTime += Tick.getDeltaTime() * this.floatingSpeed;

        const offsetY = Math.sin(this.floatingTime) * this.floatingHeight;

        const [x, _, z] = transform.position;
        transform.setPosition(x, this.originalY + offsetY, z);
    }
}