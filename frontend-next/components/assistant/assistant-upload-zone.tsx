type AssistantUploadZoneProps = {
  onFilesSelected?: (files: FileList) => void
}

export function AssistantUploadZone({
  onFilesSelected
}: AssistantUploadZoneProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-400/10">
      <input
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            onFilesSelected?.(event.target.files)
          }
        }}
      />

      <span className="text-lg">+</span>

      <div>
        <div className="font-bold text-white">Upload documents</div>
        <div className="text-xs text-slate-500">
          Chronologies, reports, safeguarding records and attachments
        </div>
      </div>
    </label>
  )
}
