export class AmbientLight {
    private color: [number, number, number] = [0.5, 0.5, 0.5];
    private intensity: number = 0.6;

    public getData(): Float32Array {
        return new Float32Array([
            ...this.color,
            this.intensity
        ]);
    }
}