# Unity Frame Timing Visualizer

An interactive web-based visualization tool that simulates and demonstrates CPU/GPU pipelining, graphics command queue behavior, and frame pipeline depth in Unity-style rendering pipelines.

![Unity Frame Timing Visualizer](Thumbnail.png)

**[Try it live →](https://nbrader.com/unity-frame-visualizer/index.html)**

## Overview

This educational tool helps developers understand the complex timing relationships between CPU and GPU work in modern game engines. By adjusting parameters in real-time, you can explore how different configurations affect frame rate, identify bottlenecks, and understand the impact of graphics command queue capacity and frame pipeline depth.

## Features

- **Real-time Simulation**: Adjust parameters with sliders and see immediate visual feedback
- **Interactive Timeline**: Visual representation of CPU and GPU work across multiple frames
- **Performance Metrics**: Track FPS, frame time, bottleneck identification, buffer usage, and input latency
- **Educational**: Understand concepts like:
  - CPU-bound vs GPU-bound scenarios
  - Graphics command queue saturation
  - Frame pipeline depth and input latency
  - CPU-GPU parallelism

## How to Use

### Running Locally

No build process or dependencies required! Simply:

```bash
git clone https://github.com/yourusername/nbrader.com-unity-frame-visualizer.git
cd nbrader.com-unity-frame-visualizer
```

**Option 1: Direct File Access (Simplest)**

Open `index.html` directly in your web browser. This works reliably in Firefox and usually works in Chrome/Edge/Safari.

**Option 2: Local Web Server (If needed)**

If your browser has strict security policies for local files, use a simple web server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have npx)
npx serve

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Controls

- **Script Execution Time**: Duration of CPU-side game logic and physics (ms)
- **Draw Calls Per Frame**: Number of draw calls generated per frame
- **Draw Call Generation Time**: CPU time per draw call (ms per call)
- **Draw Call Processing Time**: GPU time per draw call (ms per call)
- **Graphics Command Queue Capacity**: Maximum draw calls that can be queued before CPU must wait
- **Max Frames Ahead**: CPU-GPU frame pipeline depth limit (prevents excessive input latency)

### Understanding the Timeline

The timeline shows two parallel tracks:
- **CPU Thread**: Shows script execution (blue), render command generation (orange), and wait states (red stripes)
- **GPU**: Shows execution (purple) and idle/wait states (red stripes)

Each frame is labeled with "Frame N" on the CPU track and "Present N" when the GPU completes rendering.

### Reading the Metrics

- **Frame Time**: Time between frame presentations (lower is better)
- **FPS**: Frames per second
- **Bottleneck**: Identifies the limiting factor (CPU Scripts, CPU Render, GPU, Queue Full, or Frame Pipeline Limit)
- **Graphics Command Queue**: Current queue usage vs maximum capacity
- **Frames Ahead**: Number of frames the CPU is ahead of GPU vs pipeline depth limit
- **Input Latency**: Time from frame start to final presentation

## Examples to Try

1. **CPU-Bound Scenario**: Increase "Script Execution Time" to 30ms while keeping GPU processing low - observe CPU bottleneck
2. **GPU-Bound Scenario**: Increase "Draw Call Processing Time" to 0.15 - observe GPU becoming the bottleneck
3. **Queue Saturation**: Set graphics command queue capacity close to draw calls count - observe CPU waiting for queue space
4. **Input Latency**: Increase "Max Frames Ahead" to 6 - see how input latency grows

## Technical Details

- Pure JavaScript (no frameworks)
- No build process or dependencies
- Client-side only
- Simulates 6 frames of pipelining behavior
- Adaptive timeline axis based on simulation duration

## Project Structure

```
.
├── index.html      # DOM structure and controls
├── script.js       # Simulation engine and rendering logic
├── style.css       # Dark theme styling
├── CLAUDE.md       # Development guidance for AI assistants
└── README.md       # This file
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Nathan Scott Brader

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.