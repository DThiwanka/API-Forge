import Dialog from '../../../components/ui/Dialog';
import CurlImport from './CurlImport';

export default function ImportDialog({
  isOpen,
  onClose,
  workspaceId,
  defaultCollectionId,
  defaultFolderId,
  onSuccess,
}) {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import cURL Command"
      className="max-w-2xl bg-[#14171f] border-[#2b313e] p-5 max-h-[90vh] overflow-y-auto"
    >
      <div className="text-xs text-slate-400 mb-4 -mt-2">
        Paste a raw cURL command to convert it into a structured APIForge request definition.
      </div>

      <CurlImport
        workspaceId={workspaceId}
        defaultCollectionId={defaultCollectionId}
        defaultFolderId={defaultFolderId}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

