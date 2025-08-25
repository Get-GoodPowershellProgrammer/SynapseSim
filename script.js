// Synapse Simulation Framework

const canvas = document.getElementById('synapseCanvas');
const ctx = canvas.getContext('2d');

const NEURON_RADIUS = 30;
const SYNAPSE_COLOR = '#009688';
const NEURON_COLOR = '#333';

let neurons = [];
let synapses = [];
let simulationRunning = false;

class Neuron {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.potential = 0; // Neuron's current potential
        this.synapses = []; // Synapses connected to this neuron
    }

    // Add a synapse to the list of incoming synapses
    addSynapse(synapse) {
        this.synapses.push(synapse);
    }

    // Calculate the synaptic input for this neuron
    synapticInput() {
        let totalInput = 0;

        // Loop through all incoming synapses
        this.synapses.forEach(synapse => {
            // If the presynaptic neuron has fired (potential >= threshold), add the strength
            if (synapse.from.potential >= 1) {  // Neuron firing threshold
                totalInput += synapse.strength;
            }
        });

        return totalInput; // Return the total synaptic input
    }

    // Update potential based on synaptic input and other factors (optional)
    updatePotential() {
        this.potential += this.synapticInput();
        if (this.potential >= 1) {
            this.fire();
            this.potential = 0; // Reset after firing
        }
    }

    // Fire the neuron and trigger synapses
    fire() {
        console.log(`Neuron at (${this.x}, ${this.y}) fired!`);
        // Here you could trigger the synapse to transmit signals to connected neurons
        this.synapses.forEach(synapse => synapse.transmit());
    }

    // Method to draw the neuron (for visualization)
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, NEURON_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = NEURON_COLOR;
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.stroke();
    }
}

// Basic synapse structure
class Synapse {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.strength = Math.random(); // Random strength for demo
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.to.x, this.to.y);
        ctx.strokeStyle = SYNAPSE_COLOR;
        ctx.lineWidth = 3 * this.strength; // Visualize strength
        ctx.stroke();
    }
}

// Setup demo network
function createDemoNetwork() {
    neurons = [
        new Neuron(200, 300),
        new Neuron(400, 150),
        new Neuron(600, 300),
        new Neuron(400, 450)
    ];
    synapses = [
        new Synapse(neurons[0], neurons[1]),
        new Synapse(neurons[1], neurons[2]),
        new Synapse(neurons[2], neurons[3]),
        new Synapse(neurons[3], neurons[0])
    ];
}

function drawNetwork() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    synapses.forEach(syn => syn.draw(ctx));
    neurons.forEach(neuron => neuron.draw(ctx));
}

function startSimulation() {
    simulationRunning = true;
    // In a real simulation, update neuron potentials and synapse transmission
    // Here, just animate synapses for demonstration
    animateSynapses();
}

function resetSimulation() {
    simulationRunning = false;
    createDemoNetwork();
    drawNetwork();
}

function animateSynapses() {
    if (!simulationRunning) return;
    synapses.forEach(syn => {
        syn.strength = 0.5 + 0.5 * Math.sin(Date.now() / 500 + syn.from.x); // Animate strength
    });
    drawNetwork();
    requestAnimationFrame(animateSynapses);
}

// Event Listeners
document.getElementById('startBtn').addEventListener('click', startSimulation);
document.getElementById('resetBtn').addEventListener('click', resetSimulation);

// Initialize
createDemoNetwork();
drawNetwork();