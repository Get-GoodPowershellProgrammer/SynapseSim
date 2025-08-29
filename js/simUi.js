import { Network } from "./simEngine.js"

export class UI {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.network = new Network();
    this.running = false;
    this.lastTime = performance.now();

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.bindUI();
    requestAnimationFrame(this.loop.bind(this));
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - 50;
  }

  bindUI() {
    document.getElementById("addNeuron").onclick = () => {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      this.network.addNeuron(x, y);
    };

    document.getElementById("startStop").onclick = () => {
      this.running = !this.running;
    };

    document.getElementById("exportNetwork").onclick = () => {
      const data = JSON.stringify(this.network, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "network.json";
      a.click();
      URL.revokeObjectURL(url);
    };

    document.getElementById("importNetwork").onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          // TODO: properly reconstruct neurons/synapses
          console.log("Imported:", data);
        } catch (err) {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    };
  }

  loop(now) {
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.running) {
      this.network.update(dt);
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.network.draw(this.ctx);

    requestAnimationFrame(this.loop.bind(this));
  }
}
