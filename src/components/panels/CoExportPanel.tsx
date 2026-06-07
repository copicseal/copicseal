export function CoExportPanel() {
  return (
    <div className="space-y-4 p-3">
      <h4 className="text-xs font-semibold text-foreground">导出</h4>
      <p className="text-xs text-muted-foreground">配置导出格式与尺寸</p>
      <button
        type="button"
        className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        导出当前
      </button>
    </div>
  );
}
