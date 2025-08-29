// --- Utility Functions ---
function drawGlow(ctx, x, y, radius, intensity, color = "rgba(255,100,100,0.4)") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.globalAlpha = intensity;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function drawCircle(ctx, x, y, radius, color, lineWidth = 2, stroke = "#666") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
}

function drawLabel(ctx, text, x, y, color = "#fff", font = "bold 15px monospace") {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawPotentialBar(ctx, x, y, height, width, ratio, threshold) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y - height/2, width, height);
    ctx.fillStyle = ratio > 0.8 ? '#ff4444' : '#00bcd4';
    ctx.fillRect(x, y + height/2 - ratio * height, width, ratio * height);
    ctx.restore();
}

function pointLineDistance(px, py, x1, y1, x2, y2) {
    const apx = px - x1;
    const apy = py - y1;
    const abx = x2 - x1;
    const aby = y2 - y1;
    const ab2 = abx * abx + aby * aby;
    const ap_ab = apx * abx + apy * aby;
    const t = Math.max(0, Math.min(1, ab2 ? ap_ab / ab2 : 0));
    const cx = x1 + abx * t;
    const cy = y1 + aby * t;
    return Math.hypot(px - cx, py - cy);
}

// --- Classes ---

const NEURON_RADIUS = 30;

class Neuron {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.potential = 0;
        this.synapses = [];
        this.lastFired = 0;
        this.refractoryUntil = 0;
        this.id = id;
    }
    addSynapse(synapse) {
        this.synapses.push(synapse);
    }
    removeSynapse(synapse) {
        this.synapses = this.synapses.filter(s => s !== synapse);
    }
    synapticInput(params) {
        let totalInput = 0;
        this.synapses.forEach(synapse => {
            if (synapse.from.potential >= params.threshold) {
                totalInput += synapse.strength * params.synapticStrength;
            }
        });
        return totalInput;
    }
    updatePotential(params, dt = 1/60) {
        // dt: seconds
        const currentTime = Date.now();
        if (currentTime < this.refractoryUntil) {
            this.potential = 0;
            return;
        }
        this.potential += this.synapticInput(params);

        if (Math.random() < params.spontaneousRate * dt) {
            this.potential += params.synapticStrength * 0.5;
        }
        this.potential += (Math.random() - 0.5) * params.noiseLevel * dt;

        // Decay rate: scale by dt to be frame-rate independent
        this.potential *= (1 - params.decayRate * dt);

        if (this.potential >= params.threshold) {
            this.fire(params);
        }
        this.potential = Math.max(0, Math.min(this.potential, params.threshold * 1.5));
    }
    fire(params) {
        const currentTime = Date.now();
        this.lastFired = currentTime;
        this.refractoryUntil = currentTime + params.refractoryPeriod;
        this.potential = 0;
        this.synapses.forEach(synapse => synapse.transmit(params));
    }
    draw(ctx, params) {
        const currentTime = Date.now();
        const timeSinceFired = currentTime - this.lastFired;
        const glowIntensity = Math.max(0, 1 - timeSinceFired / 1000);
        const isRefractory = currentTime < this.refractoryUntil;

        // Glow effect
        if (glowIntensity > 0) {
            drawGlow(ctx, this.x, this.y, NEURON_RADIUS + 10, glowIntensity * 0.4);
        }
        // Main neuron
        let intensity = Math.min(this.potential / params.threshold, 1);
        let color;
        if (isRefractory) {
            color = '#666';
        } else {
            const red = Math.floor(51 + intensity * 100);
            const green = Math.floor(51 + intensity * 50);
            const blue = Math.floor(51 + intensity * 30);
            color = `rgb(${red}, ${green}, ${blue})`;
        }
        drawCircle(ctx, this.x, this.y, NEURON_RADIUS, color, 2, isRefractory ? '#999' : '#666');
        // Inner highlight
        drawGlow(ctx, this.x - 8, this.y - 8, NEURON_RADIUS / 3, 0.3, 'rgba(255,255,255,0.3)');
        // Potential bar
        const barHeight = 20;
        const barWidth = 4;
        const potentialRatio = Math.min(this.potential / params.threshold, 1);
        drawPotentialBar(ctx, this.x + NEURON_RADIUS + 5, this.y, barHeight, barWidth, potentialRatio, params.threshold);
        // Label
        drawLabel(ctx, "N" + (this.id + 1), this.x, this.y + 5);
    }
}

class Synapse {
    constructor(from, to, strength=null, delay=null) {
        this.from = from;
        this.to = to;
        this.strength = strength ?? (0.3 + Math.random() * 0.7);
        this.activity = 0;
        this.delay = delay ?? (Math.random() * 200 + 50);
        this.transmissionQueue = [];
    }
    transmit(params) {
        this.transmissionQueue.push({
            time: Date.now() + this.delay,
            strength: this.strength * params.synapticStrength
        });
        this.activity = 1;
    }
    processTransmissions() {
        const currentTime = Date.now();
        this.transmissionQueue = this.transmissionQueue.filter(transmission => {
            if (currentTime >= transmission.time) {
                this.to.potential += transmission.strength;
                return false;
            }
            return true;
        });
    }
    draw(ctx) {
        this.processTransmissions();
        this.activity *= 0.95;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.to.x, this.to.y);
        const alpha = 0.6 + 0.4 * this.activity;
        ctx.strokeStyle = `rgba(0, 188, 212, ${alpha})`;
        ctx.lineWidth = 1 + 3 * this.strength * (0.5 + 0.5 * this.activity);
        ctx.stroke();
        // Animated pulse
        if (this.activity > 0.1) {
            const pulsePos = 1 - this.activity;
            const pulseX = this.from.x + (this.to.x - this.from.x) * pulsePos;
            const pulseY = this.from.y + (this.to.y - this.from.y) * pulsePos;
            drawGlow(ctx, pulseX, pulseY, 3 + 2 * this.strength, this.activity, `rgba(255,255,255,${this.activity})`);
        }
        // Show pending transmissions as small dots
        this.transmissionQueue.forEach((transmission, index) => {
            const progress = Math.min(1, (Date.now() - (transmission.time - this.delay)) / this.delay);
            if (progress > 0 && progress < 1) {
                const dotX = this.from.x + (this.to.x - this.from.x) * progress;
                const dotY = this.from.y + (this.to.y - this.from.y) * progress;
                drawCircle(ctx, dotX, dotY, 2, `rgba(255,200,0,${1-progress})`, 0);
            }
        });
        ctx.restore();
    }
}

class Network {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.neurons = [];
        this.synapses = [];
        this.backgroundPattern = null;
        this.params = {
            threshold: 1.0,
            refractoryPeriod: 500,
            decayRate: 0.05,
            synapticStrength: 0.5,
            noiseLevel: 0.02,
            spontaneousRate: 0.01
        };
        // Simulation controls
        this.simulationRunning = false;
        this.simulationPaused = false;
        this.simSpeed = 1.0;
        this.lastFrame = null;
        // UI edit state
        this.mode = "simulate";
        this.submode = null;
        this.draggingNeuron = null;
        this.dragOffset = {x:0,y:0};
        this.connectFromNeuron = null;
        // Setup
        this.generateBackground();
        this.createDemoNetwork();
    }

    generateBackground() {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 200;
        patternCanvas.height = 200;
        const patternCtx = patternCanvas.getContext('2d');
        const gradient = patternCtx.createRadialGradient(100, 100, 0, 100, 100, 100);
        gradient.addColorStop(0, 'rgba(0, 50, 100, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 20, 40, 0.3)');
        patternCtx.fillStyle = gradient;
        patternCtx.fillRect(0, 0, 200, 200);
        patternCtx.strokeStyle = 'rgba(0, 188, 212, 0.2)';
        patternCtx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
            const x1 = Math.random() * 200;
            const y1 = Math.random() * 200;
            for (let j = 0; j < 3; j++) {
                const x2 = x1 + (Math.random() - 0.5) * 100;
                const y2 = y1 + (Math.random() - 0.5) * 100;
                patternCtx.beginPath();
                patternCtx.moveTo(x1, y1);
                patternCtx.lineTo(x2, y2);
                patternCtx.stroke();
            }
            patternCtx.beginPath();
            patternCtx.arc(x1, y1, 2, 0, 2 * Math.PI);
            patternCtx.fillStyle = 'rgba(0, 188, 212, 0.4)';
            patternCtx.fill();
        }
        this.backgroundPattern = this.ctx.createPattern(patternCanvas, 'repeat');
    }

    createDemoNetwork() {
        const w = this.canvas.width, h = this.canvas.height;
        this.neurons = [
            new Neuron(w*0.25, h*0.30, 0),
            new Neuron(w*0.75, h*0.22, 1),
            new Neuron(w*0.80, h*0.60, 2),
            new Neuron(w*0.56, h*0.82, 3),
            new Neuron(w*0.18, h*0.75, 4),
            new Neuron(w*0.45, h*0.45, 5)
        ];
        this.synapses = [
            new Synapse(this.neurons[0], this.neurons[1]),
            new Synapse(this.neurons[1], this.neurons[2]),
            new Synapse(this.neurons[2], this.neurons[3]),
            new Synapse(this.neurons[3], this.neurons[4]),
            new Synapse(this.neurons[4], this.neurons[0]),
            new Synapse(this.neurons[1], this.neurons[5]),
            new Synapse(this.neurons[5], this.neurons[3]),
            new Synapse(this.neurons[0], this.neurons[5])
        ];
        this.synapses.forEach(synapse => {
            synapse.to.addSynapse(synapse);
        });
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 0.4;
        this.ctx.fillStyle = this.backgroundPattern;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1;
        this.synapses.forEach(syn => syn.draw(this.ctx));
        this.neurons.forEach(neuron => neuron.draw(this.ctx, this.params));
        // If connecting, highlight neuron for user
        if (this.mode === "edit" && this.submode === "connect" && this.connectFromNeuron) {
            drawCircle(this.ctx, this.connectFromNeuron.x, this.connectFromNeuron.y, NEURON_RADIUS + 10, "rgba(255,165,0,0.2)", 3, "orange");
        }
    }

    startSimulation() {
        if (this.simulationRunning) return;
        this.simulationRunning = true;
        this.simulationPaused = false;
        this.lastFrame = null;
        this.neurons[0] && (this.neurons[0].potential = 1);
        this.animateSynapses();
    }
    pauseSimulation() {
        this.simulationPaused = true;
    }
    resumeSimulation() {
        if (!this.simulationRunning) return;
        this.simulationPaused = false;
        this.animateSynapses();
    }
    resetSimulation() {
        this.simulationRunning = false;
        this.simulationPaused = false;
        this.createDemoNetwork();
        this.redraw();
    }

    animateSynapses() {
        if (!this.simulationRunning || this.simulationPaused) return;
        // Use deltaTime for smooth simulation speed scaling
        const now = performance.now();
        // If this is first frame, initialize lastFrame
        if (!this.lastFrame) this.lastFrame = now;
        const deltaTime = (now - this.lastFrame) * this.simSpeed; // ms * speed
        this.lastFrame = now;

        // Advance simulation: pass deltaTime in seconds
        this.updateSimulation(deltaTime / 1000);

        this.redraw();
        requestAnimationFrame(() => this.animateSynapses());
    }

    updateSimulation(dt) {
        // dt is in seconds, so dt = 0.016 at 60fps
        // All physics are frame-rate independent
        this.neurons.forEach(neuron => {
            neuron.updatePotential(this.params, dt);
        });
    }

    setParamsFromUI() {
        // Called from slider init
        const sliders = [
            { id: 'threshold', param: 'threshold', suffix: '' },
            { id: 'refractory', param: 'refractoryPeriod', suffix: 'ms' },
            { id: 'decay', param: 'decayRate', suffix: '' },
            { id: 'strength', param: 'synapticStrength', suffix: '' },
            { id: 'noise', param: 'noiseLevel', suffix: '' },
            { id: 'spontaneous', param: 'spontaneousRate', suffix: '' }
        ];
        sliders.forEach(slider => {
            const sliderElement = document.getElementById(slider.id + 'Slider');
            const valueElement = document.getElementById(slider.id + 'Value');
            sliderElement.addEventListener('input', () => {
                this.params[slider.param] = parseFloat(sliderElement.value);
                valueElement.textContent = sliderElement.value + slider.suffix;
            });
            valueElement.textContent = this.params[slider.param] + slider.suffix;
        });
        // Simulation speed
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        speedSlider.addEventListener('input', () => {
            this.simSpeed = parseFloat(speedSlider.value);
            speedValue.textContent = this.simSpeed + "x";
        });
        speedValue.textContent = this.simSpeed + "x";
    }

    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        let found = false;
        for (let neuron of this.neurons) {
            if (Math.hypot(neuron.x - mouse.x, neuron.y - mouse.y) < NEURON_RADIUS) {
                showTooltip(e.clientX, e.clientY, `
                    <b>Neuron N${neuron.id + 1}</b><br>
                    Potential: ${neuron.potential.toFixed(3)}<br>
                    Last fired: ${neuron.lastFired ? (new Date(neuron.lastFired)).toLocaleTimeString() : 'Never'}
                `);
                found = true;
                break;
            }
        }
        if (!found) hideTooltip();
        // Dragging neuron
        if (this.submode === "drag" && this.draggingNeuron) {
            this.draggingNeuron.x = mouse.x - this.dragOffset.x;
            this.draggingNeuron.y = mouse.y - this.dragOffset.y;
            this.redraw();
        }
    }

    handleCanvasMouseDown(e) {
        if (this.mode !== "edit") return;
        const rect = this.canvas.getBoundingClientRect();
        const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (this.submode === "addNeuron") {
            const newId = this.neurons.length;
            const neuron = new Neuron(mouse.x, mouse.y, newId);
            this.neurons.push(neuron);
            this.redraw();
        } else if (this.submode === "connect") {
            for (let neuron of this.neurons) {
                if (Math.hypot(neuron.x - mouse.x, neuron.y - mouse.y) < NEURON_RADIUS) {
                    if (!this.connectFromNeuron) {
                        this.connectFromNeuron = neuron;
                        this.redraw();
                    } else if (this.connectFromNeuron !== neuron) {
                        const syn = new Synapse(this.connectFromNeuron, neuron);
                        this.synapses.push(syn);
                        neuron.addSynapse(syn);
                        this.connectFromNeuron = null;
                        this.redraw();
                    }
                    return;
                }
            }
        } else if (this.submode === "remove") {
            // Remove neuron if clicked
            for (let i = 0; i < this.neurons.length; i++) {
                if (Math.hypot(this.neurons[i].x - mouse.x, this.neurons[i].y - mouse.y) < NEURON_RADIUS) {
                    // Remove synapses connected to/from this neuron
                    this.synapses = this.synapses.filter(s => s.from !== this.neurons[i] && s.to !== this.neurons[i]);
                    this.neurons.splice(i,1);
                    // Renumber ids
                    this.neurons.forEach((n,j) => n.id = j);
                    this.redraw();
                    return;
                }
            }
            // Remove synapse if clicked near line
            for (let i = 0; i < this.synapses.length; i++) {
                const s = this.synapses[i];
                if (pointLineDistance(mouse.x, mouse.y, s.from.x, s.from.y, s.to.x, s.to.y) < 10) {
                    this.synapses.splice(i,1);
                    this.redraw();
                    return;
                }
            }
        } else {
            // Dragging neuron
            for (let neuron of this.neurons) {
                if (Math.hypot(neuron.x - mouse.x, neuron.y - mouse.y) < NEURON_RADIUS) {
                    this.draggingNeuron = neuron;
                    this.dragOffset.x = mouse.x - neuron.x;
                    this.dragOffset.y = mouse.y - neuron.y;
                    this.submode = "drag";
                    break;
                }
            }
        }
    }

    handleCanvasMouseUp(e) {
        if (this.submode === "drag" && this.draggingNeuron) {
            this.draggingNeuron = null;
            this.submode = null;
            this.redraw();
        }
    }

    exportJSON() {
        const neuronData = this.neurons.map(n => ({
            x: n.x, y: n.y, id: n.id
        }));
        const synapseData = this.synapses.map(s => ({
            from: s.from.id, to: s.to.id, strength: s.strength, delay: s.delay
        }));
        const json = JSON.stringify({neurons: neuronData, synapses: synapseData, params: {...this.params}});
        const blob = new Blob([json], {type:"application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "network.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importJSON(obj) {
        this.neurons = obj.neurons.map(n => new Neuron(n.x, n.y, n.id));
        this.synapses = obj.synapses.map(s => new Synapse(this.neurons[s.from], this.neurons[s.to], s.strength, s.delay));
        this.synapses.forEach(syn => {
            syn.to.addSynapse(syn);
        });
        Object.assign(this.params, obj.params || {});
        this.redraw();
        this.setParamsFromUI();
    }
}

// --- DOM & Event Bindings ---

const canvas = document.getElementById('synapseCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

// Responsive Canvas
function resizeCanvas() {
    canvas.width = Math.floor(window.innerWidth * 0.9);
    canvas.height = Math.floor(window.innerHeight * 0.7);
    network && network.redraw();
}
window.addEventListener('resize', resizeCanvas);

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('change', function(e) {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
});
document.documentElement.setAttribute('data-theme', window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
themeToggle.checked = document.documentElement.getAttribute('data-theme') === 'dark';

// Control Panel Toggle
document.getElementById('panelToggle').addEventListener('click', function() {
    document.getElementById('controlPanel').classList.toggle('collapsed');
});

// Tooltip functions
function showTooltip(x, y, html) {
    tooltip.innerHTML = html;
    tooltip.style.left = (x + 20) + 'px';
    tooltip.style.top = (y + 15) + 'px';
    tooltip.style.display = 'block';
}
function hideTooltip() {
    tooltip.style.display = 'none';
}

// Network setup
let network = new Network(canvas, ctx);

function initializeControls() {
    network.setParamsFromUI();
}
initializeControls();

// Simulation controls
document.getElementById('startBtn').addEventListener('click', () => network.startSimulation());
document.getElementById('pauseBtn').addEventListener('click', () => network.pauseSimulation());
document.getElementById('resumeBtn').addEventListener('click', () => network.resumeSimulation());
document.getElementById('resetBtn').addEventListener('click', () => network.resetSimulation());

// Edit Mode controls
document.getElementById("modeSelector").addEventListener("change", e => {
    network.mode = e.target.value;
    network.submode = null;
    network.connectFromNeuron = null;
    network.redraw();
});
document.getElementById("addNeuronBtn").addEventListener("click", () => {
    if (network.mode === "edit") network.submode = "addNeuron";
});
document.getElementById("connectModeBtn").addEventListener("click", () => {
    if (network.mode === "edit") network.submode = "connect";
    network.connectFromNeuron = null;
});
document.getElementById("removeModeBtn").addEventListener("click", () => {
    if (network.mode === "edit") network.submode = "remove";
});

// Canvas events
canvas.addEventListener('mousemove', e => network.handleCanvasMouseMove(e));
canvas.addEventListener('mousedown', e => network.handleCanvasMouseDown(e));
canvas.addEventListener('mouseup', e => network.handleCanvasMouseUp(e));
canvas.addEventListener('mouseleave', hideTooltip);

// Export/Import
document.getElementById("exportBtn").addEventListener("click", () => network.exportJSON());
document.getElementById("importFile").addEventListener("change", function(e){
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const obj = JSON.parse(evt.target.result);
            network.importJSON(obj);
        } catch {
            alert("Invalid JSON.");
        }
    };
    reader.readAsText(file);
    e.target.value = "";
});

// Initial setup
resizeCanvas();
network.redraw();