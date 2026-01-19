import { Camera } from "@/app/main/renderer/camera";
import { MeshData } from "@/app/main/renderer/mesh/mesh-data";
import { MeshRenderer } from "@/app/main/renderer/mesh/mesh-renderer";
import { Tick } from "@/app/main/renderer/tick";
import { Transform } from "@/app/main/renderer/utils/transform";

export class Cloud {
    private device: GPUDevice;
    private uniformBuffer: GPUBuffer;

    private generatedClouds: MeshRenderer[] = [];
    public floatingEnabled: boolean = false;
    public floatingSpeed: number = 1.0;
    public floatingHeight: number = 0.2;
    public floatingTime: number = 0.0;
    public originalY: number = 0.0;

    constructor(device: GPUDevice, uniformBuffer: GPUBuffer) {
        this.device = device;
        this.uniformBuffer = uniformBuffer;
    }

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
     * Generate Clouds
     */
    public async generateClouds(templateMeshes: MeshRenderer[]): Promise<MeshRenderer[] | null> {
        if(!this.device || !this.uniformBuffer) {
            console.error('Device or uniform buffer not set for cloud generation');
            return [];
        }

        this.generatedClouds = [];
        const count = 15;
        const minDistance = 2.0;
        const usedPos: {
            x: number,
            y: number,
            z: number
        }[] = [];
        const maxAttempts = 50;

        for(let i = 0; i < count; i++) {
            const templateIndex = Math.floor(Math.random() * templateMeshes.length);
            const template = templateMeshes[templateIndex];
            const templateData = template.getMeshData();
            if(!templateData) continue;

            let attempts = 0;
            let validPos = false;
            let randomPosX;
            let randomPosY;
            let randomPosZ;

            while(attempts < maxAttempts && !validPos) {
                randomPosX = this.randomRange(-12.0, 10.0);
                randomPosY = this.randomRange(-8.0, 6.0);
                randomPosZ = this.randomRange(-7.0, -2.0);
                validPos = true;

                for(const pos of usedPos) {
                    const distance = Math.sqrt(
                        Math.pow(randomPosX - pos.x, 2) +
                        Math.pow(randomPosX - pos.y, 2) +
                        Math.pow(randomPosX - pos.z, 2)
                    );
                    if(distance < minDistance) {
                        validPos = false;
                        break;
                    }
                }
            }
            if(!validPos) continue;

            const meshRenderer = new MeshRenderer(this.device, this.uniformBuffer);
            const randomRotation = Math.random() * Math.PI * 2;
            const randomScale = 0.2 + Math.random() * 0.4;
            if(!randomPosX || !randomPosY || !randomPosZ) return null;
            
            meshRenderer.transform.setPosition(
                randomPosX, 
                randomPosY, 
                randomPosZ
            );
            meshRenderer.transform.setRotation(0, randomRotation, 0);
            meshRenderer.transform.setScale(
                randomScale, 
                randomScale, 
                randomScale
            );
            usedPos.push({
                x: randomPosX,
                y: randomPosY,
                z: randomPosZ
            });

            const cloudTypes = ['cloud1', 'cloud2'];
            const randomType = cloudTypes[Math.floor(Math.random() * cloudTypes.length)];
            await meshRenderer.set(randomType as any, "cloud.png");
            
            const meshData = meshRenderer.getMeshData();
            if(meshData) {
                meshData.setRotationSpeed(templateData.rotationSpeed);
                const randomSpeed = (0.1 + Math.random()) / 5;
                const randomHeight = (0.1 + Math.random()) / 5;
                meshRenderer.custom.set(
                    meshRenderer.transform,
                    true,
                    randomSpeed,
                    randomHeight
                );
            }
            this.generatedClouds.push(meshRenderer);
        }
        
        return this.generatedClouds;
    }

    private randomRange(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    public getGeneratedClouds(): MeshRenderer[] {
        return this.generatedClouds;
    }
    
    /**
     * Assign Random Props
     */
    public assignRandomProps(meshes: MeshRenderer[]): void {
        const allMeshes = [...meshes, ...this.generatedClouds];
        allMeshes.forEach(m => {
            const data = m.getMeshData();
            if(data &&
                (data.name.includes('cloud1') ||
                data.name.includes('cloud2'))
            ) {
                const randomSpeed = (0.1 + Math.random()) / 2;
                const randomHeight = 0.1 + Math.random();
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

        this.generatedClouds.forEach(c => {
            c.custom.update(c.transform);
        });
    }

    /**
     * Render
     */
    public async render(el: Map<string, any[]>, getElementsByType: <T>(type: string) => T[]): Promise<void> {
        const meshes = getElementsByType<MeshRenderer>('mesh')
            .filter(mesh => {
                const data = mesh.getMeshData();
                return data && 
                    (data.name.includes('cloud1') || 
                    data.name.includes('cloud2'));
            });
        if(meshes.length > 0) {
            const generatedClouds = await this.generateClouds(meshes);
            if(!el.has('mesh')) el.set('mesh', []);
            el.get('mesh')!.push(...generatedClouds!);
        }
    }

    /**
     * Cleanup
     */
    public cleanup(): void {
        this.generatedClouds.forEach(cloud => {
            cloud.cleanup();
        });
        this.generatedClouds = [];
    }
}