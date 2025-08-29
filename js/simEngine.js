export class Neuron {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.potential = 0;
    this.threshold = 1;
    this.refractory = 0;
  }

  update(dt) {
    if (this.refractory > 0) {
      this.refractory -= dt;
      return false;
    }

    this.potential += dt * 0.001; // baseline leak
    if (this.potential >= this.threshold) {
      this.potential = 0;
      this.refractory = 0.5;
      return true;
    }
    return false;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = this.potential > 0.8 ? "#0f0" : "#444";
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.stroke();
  }
}

export class Synapse {
  constructor(from, to, weight = 1) {
    this.from = from;
    this.to = to;
    this.weight = weight;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.stroke();
  }
}

export class Network {
  constructor() {
    this.neurons = [];
    this.synapses = [];
  }

  addNeuron(x, y) {
    const n = new Neuron(x, y);
    this.neurons.push(n);
    return n;
  }

  addSynapse(from, to, weight = 1) {
    this.synapses.push(new Synapse(from, to, weight));
  }

  update(dt) {
    this.neurons.forEach(n => n.update(dt));
  }

  draw(ctx) {
    this.synapses.forEach(s => s.draw(ctx));
    this.neurons.forEach(n => n.draw(ctx));
  }
}