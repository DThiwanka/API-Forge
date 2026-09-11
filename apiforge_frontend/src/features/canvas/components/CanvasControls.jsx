import { Controls } from '@xyflow/react';

export default function CanvasControls() {
  return (
    <Controls
      position="bottom-left"
      showInteractive={false}
      className="!bg-[#111318] !border !border-[#232732] !rounded-lg !shadow-xl !overflow-hidden [&>button]:!bg-[#111318] [&>button]:!border-b [&>button]:!border-[#232732] [&>button]:!text-slate-300 [&>button:hover]:!bg-[#181b22] [&>button:hover]:!text-white [&>button]:!w-7 [&>button]:!h-7 [&>button>svg]:!fill-current"
    />
  );
}

