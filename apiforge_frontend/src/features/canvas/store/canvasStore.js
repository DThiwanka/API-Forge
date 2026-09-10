const canvasStore = {
  nodes: [],
  edges: [],
  getNodes() {
    return this.nodes;
  },
  setNodes(nodes) {
    this.nodes = nodes;
  },
};

export default canvasStore;
