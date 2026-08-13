import { mapNodes, nodeTypes, rewardSummary } from "./event-config.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class MapController {
  constructor({ viewport, scene, nodesLayer, marker, pathLine, pathShadow, store }) {
    this.viewport = viewport;
    this.scene = scene;
    this.nodesLayer = nodesLayer;
    this.marker = marker;
    this.pathLine = pathLine;
    this.pathShadow = pathShadow;
    this.store = store;
    this.scale = 1;
    this.minScale = .5;
    this.maxScale = 2;
    this.x = 0;
    this.y = 0;
    this.pointers = new Map();
    this.lastPinchDistance = 0;
    this.dragOrigin = null;
    this.resizeObserver = new ResizeObserver(() => this.resetView(true));
  }

  init() {
    this.renderPath();
    this.renderNodes();
    this.bindControls();
    this.resizeObserver.observe(this.viewport);
    requestAnimationFrame(() => {
      this.resetView(false);
      this.syncState(this.store.get());
      this.focusNode(this.store.get().currentPosition, false);
    });
  }

  renderPath() {
    const points = mapNodes.map((node) => ({
      x: node.x * 16,
      y: node.y * 9
    }));
    const d = points.map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = points[index - 1];
      const midX = (prev.x + point.x) / 2;
      const midY = (prev.y + point.y) / 2 - (index % 2 ? 20 : -20);
      return `Q ${midX} ${midY} ${point.x} ${point.y}`;
    }).join(" ");
    this.pathLine.setAttribute("d", d);
    this.pathShadow.setAttribute("d", d);
  }

  renderNodes() {
    const fragment = document.createDocumentFragment();
    mapNodes.forEach((node) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-node";
      button.dataset.nodeId = String(node.id);
      button.dataset.type = node.type;
      button.style.left = `${node.x}%`;
      button.style.top = `${node.y}%`;
      button.setAttribute("aria-label", `${node.id}. ${node.name}, ${nodeTypes[node.type]}, thưởng ${rewardSummary(node.reward)}`);

      const ring = document.createElement("span");
      ring.className = "node-ring";
      const core = document.createElement("span");
      core.className = "node-core";
      const glyph = document.createElement("span");
      glyph.textContent = node.icon;
      core.append(glyph);
      const number = document.createElement("span");
      number.className = "node-number";
      number.textContent = node.id;
      const label = document.createElement("span");
      label.className = "node-label";
      label.textContent = node.name;
      const tooltip = document.createElement("span");
      tooltip.className = "node-tooltip";
      const type = document.createElement("strong");
      type.textContent = nodeTypes[node.type];
      const name = document.createElement("span");
      name.textContent = node.name;
      const reward = document.createElement("small");
      reward.textContent = `Phần thưởng: ${rewardSummary(node.reward)}`;
      tooltip.append(type, name, reward);
      button.append(ring, core, number, label, tooltip);

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.nodesLayer.querySelectorAll(".tooltip-open").forEach((item) => item.classList.remove("tooltip-open"));
        button.classList.add("tooltip-open");
      });
      fragment.append(button);
    });
    this.nodesLayer.append(fragment);
  }

  bindControls() {
    this.viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      const rect = this.viewport.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.12 : .89;
      this.zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });

    this.viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      this.viewport.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.dragOrigin = { x: event.clientX, y: event.clientY, mapX: this.x, mapY: this.y };
      this.viewport.classList.add("is-dragging");
    });

    this.viewport.addEventListener("pointermove", (event) => {
      if (!this.pointers.has(event.pointerId)) return;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = [...this.pointers.values()];
      if (points.length === 2) {
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        if (this.lastPinchDistance) {
          const rect = this.viewport.getBoundingClientRect();
          const centerX = (points[0].x + points[1].x) / 2 - rect.left;
          const centerY = (points[0].y + points[1].y) / 2 - rect.top;
          this.zoomAt(distance / this.lastPinchDistance, centerX, centerY);
        }
        this.lastPinchDistance = distance;
      } else if (this.dragOrigin) {
        this.x = this.dragOrigin.mapX + event.clientX - this.dragOrigin.x;
        this.y = this.dragOrigin.mapY + event.clientY - this.dragOrigin.y;
        this.constrain();
        this.applyTransform();
      }
    });

    const endPointer = (event) => {
      this.pointers.delete(event.pointerId);
      this.lastPinchDistance = 0;
      this.dragOrigin = null;
      this.viewport.classList.remove("is-dragging");
    };
    this.viewport.addEventListener("pointerup", endPointer);
    this.viewport.addEventListener("pointercancel", endPointer);
    this.viewport.addEventListener("click", (event) => {
      if (!event.target.closest(".map-node")) {
        this.nodesLayer.querySelectorAll(".tooltip-open").forEach((item) => item.classList.remove("tooltip-open"));
      }
    });
  }

  zoomAt(factor, centerX = this.viewport.clientWidth / 2, centerY = this.viewport.clientHeight / 2) {
    const oldScale = this.scale;
    this.scale = clamp(this.scale * factor, this.minScale, this.maxScale);
    const ratio = this.scale / oldScale;
    this.x = centerX - (centerX - this.x) * ratio;
    this.y = centerY - (centerY - this.y) * ratio;
    this.constrain();
    this.applyTransform();
  }

  resetView(focus = true) {
    const viewportWidth = this.viewport.clientWidth;
    const viewportHeight = this.viewport.clientHeight;
    if (!viewportWidth || !viewportHeight) return;
    this.minScale = Math.max(viewportWidth / this.scene.offsetWidth, viewportHeight / this.scene.offsetHeight);
    this.maxScale = Math.max(1.8, this.minScale * 2.25);
    this.scale = this.minScale;
    this.x = (viewportWidth - this.scene.offsetWidth * this.scale) / 2;
    this.y = (viewportHeight - this.scene.offsetHeight * this.scale) / 2;
    this.applyTransform();
    if (focus) this.focusNode(this.store.get().currentPosition, false);
  }

  constrain() {
    const scaledWidth = this.scene.offsetWidth * this.scale;
    const scaledHeight = this.scene.offsetHeight * this.scale;
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    this.x = scaledWidth >= vw ? clamp(this.x, vw - scaledWidth, 0) : (vw - scaledWidth) / 2;
    this.y = scaledHeight >= vh ? clamp(this.y, vh - scaledHeight, 0) : (vh - scaledHeight) / 2;
  }

  applyTransform() {
    this.scene.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.scale})`;
  }

  getNodePixel(nodeId) {
    const node = mapNodes.find((item) => item.id === nodeId) || mapNodes[0];
    return {
      x: this.scene.offsetWidth * node.x / 100,
      y: this.scene.offsetHeight * node.y / 100
    };
  }

  setHeroPixel(x, y) {
    this.marker.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -78%)`;
  }

  setHeroNode(nodeId) {
    const point = this.getNodePixel(nodeId);
    this.setHeroPixel(point.x, point.y);
  }

  focusPixel(point, smooth = true) {
    const targetX = this.viewport.clientWidth / 2 - point.x * this.scale;
    const targetY = this.viewport.clientHeight / 2 - point.y * this.scale;
    if (!smooth) {
      this.x = targetX;
      this.y = targetY;
      this.constrain();
      this.applyTransform();
      return;
    }
    const fromX = this.x;
    const fromY = this.y;
    const start = performance.now();
    const duration = 300;
    const frame = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.x = fromX + (targetX - fromX) * eased;
      this.y = fromY + (targetY - fromY) * eased;
      this.constrain();
      this.applyTransform();
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  focusNode(nodeId, smooth = true) {
    this.focusPixel(this.getNodePixel(nodeId), smooth);
  }

  markLanded(nodeId) {
    const node = this.nodesLayer.querySelector(`[data-node-id="${nodeId}"]`);
    if (!node) return;
    node.classList.remove("landed");
    requestAnimationFrame(() => node.classList.add("landed"));
  }

  addTrail(x, y) {
    if (this.store.get().reducedEffects) return;
    const trail = document.createElement("i");
    trail.className = "motion-trail";
    trail.style.left = `${x - 12}px`;
    trail.style.top = `${y - 4}px`;
    this.scene.append(trail);
    setTimeout(() => trail.remove(), 550);
  }

  syncState(state) {
    this.setHeroNode(state.currentPosition);
    this.nodesLayer.querySelectorAll(".map-node").forEach((node) => {
      const id = Number(node.dataset.nodeId);
      node.classList.toggle("current", id === state.currentPosition);
      node.classList.toggle("visited", state.passedNodes.includes(id));
    });
  }
}
