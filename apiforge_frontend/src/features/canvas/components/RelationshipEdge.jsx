import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from '@xyflow/react';
import { KeyRound, Variable, Link2 } from 'lucide-react';
import useCanvasStore from '../store/canvasStore';
import { cn } from '../../../utils/cn';

const TYPE_CONFIG = {
  AUTH: {
    stroke: '#f59e0b', // amber-500
    badgeBg: 'bg-amber-950/80 border-amber-600/60 text-amber-300 hover:border-amber-400',
    icon: KeyRound,
    name: 'Auth',
  },
  VARIABLE: {
    stroke: '#818cf8', // indigo-400
    badgeBg: 'bg-indigo-950/80 border-indigo-600/60 text-indigo-300 hover:border-indigo-400',
    icon: Variable,
    name: 'Variable',
  },
  RESOURCE: {
    stroke: '#10b981', // emerald-500
    badgeBg: 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300 hover:border-emerald-400',
    icon: Link2,
    name: 'Resource',
  },
};

function RelationshipEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data = {},
  selected,
}) {
  const setSelectedRelationship = useCanvasStore((s) => s.setSelectedRelationship);
  const focusedNodeId = useCanvasStore((s) => s.selectedNodeId || s.focusNodeId);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isInferred = Boolean(data.isInferred);
  const relType = data.relationshipType || 'RESOURCE';
  const config = TYPE_CONFIG[relType] || TYPE_CONFIG.RESOURCE;
  const Icon = config.icon;

  // Connection highlighting logic:
  // If a node is selected, is this edge connected to that node?
  const isConnectedToFocus = Boolean(
    focusedNodeId && (source === focusedNodeId || target === focusedNodeId)
  );
  const isDimmed = Boolean(focusedNodeId && !isConnectedToFocus);

  const strokeColor = isInferred ? config.stroke : (style.stroke || '#38bdf8');
  const strokeWidth = selected || isConnectedToFocus ? 2.5 : 1.5;
  const strokeDasharray = isInferred ? '5,5' : style.strokeDasharray || undefined;

  const edgeStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth,
    strokeDasharray,
    opacity: isDimmed ? 0.15 : selected || isConnectedToFocus ? 1 : 0.7,
    transition: 'all 0.2s ease-in-out',
  };

  const handleLabelClick = (e) => {
    e.stopPropagation();
    setSelectedRelationship({
      id,
      source,
      target,
      data,
    });
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />

      {/* Interactive Center Badge for Inferred Relationships */}
      {isInferred && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={cn(
              'nodrag nopan transition-opacity duration-200',
              isDimmed ? 'opacity-15' : 'opacity-100'
            )}
          >
            <button
              type="button"
              onClick={handleLabelClick}
              title={`View ${config.name} relationship details: ${data.reason || data.label || ''}`}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-mono shadow-md backdrop-blur-sm cursor-pointer transition-all duration-150',
                config.badgeBg,
                (selected || isConnectedToFocus) && 'ring-2 ring-white/20 scale-105'
              )}
            >
              <Icon size={10} className="shrink-0" />
              <span className="truncate max-w-[110px]">
                {data.label || config.name}
              </span>
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(RelationshipEdgeComponent);

