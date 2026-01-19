struct Camera {
    viewProj: mat4x4<f32>,
    position: vec3<f32>,
    padding: f32,
    time: f32,
    padding2: vec3<f32>
}

@group(0) @binding(0) var<uniform> camera: Camera;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
    @location(1) uv: vec2<f32>
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let normalizedY = (input.position.y + 500.0) / 1000.0;
    
    let gradient = mix(
        vec3<f32>(0.0, 0.1, 0.3),
        vec3<f32>(0.2, 0.4, 0.8),
        normalizedY
    );
    
    return vec4<f32>(gradient, 1.0);
}