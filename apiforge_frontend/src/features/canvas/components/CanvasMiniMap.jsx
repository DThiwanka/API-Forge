import { MiniMap } from '@xyflow/react';
import { getMethodStyle } from '../utils/nodeHelpers';

export default function CanvasMiniMap() {
  const getNodeColor = (node) => {
    if (node.type === 'requestNode') {
      const method = node.data?.method || 'GET';
      return getMethodStyle(method).dot;
    }
    return '#38bdf8';
  };

  return (
    <MiniMap
      position="bottom-right"
      nodeColor={getNodeColor}
      nodeStrokeWidth={1}
      nodeStrokeColor="#232732"
      maskColor="rgba(9, 10, 15, 0.75)"
      className="!bg-[#111318] !border !border-[#232732] !rounded-lg !shadow-2xl !overflow-hidden !w-44 !h-28"
    />
  );
}

