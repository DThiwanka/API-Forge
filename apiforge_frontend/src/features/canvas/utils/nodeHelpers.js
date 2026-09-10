export function calculateNodeCenter(node) {
  return {
    x: (node.x || 0) + (node.width || 100) / 2,
    y: (node.y || 0) + (node.height || 60) / 2,
  };
}

export default { calculateNodeCenter };
