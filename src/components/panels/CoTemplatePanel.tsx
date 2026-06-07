export function CoTemplatePanel() {
  return (
    <div className="space-y-4 p-3">
      <h4 className="text-xs font-semibold text-foreground">模板</h4>
      <p className="text-xs text-muted-foreground">选择照片水印模板</p>
      <div className="grid grid-cols-2 gap-2">
        {['框架白边', '无框圆角', 'PS启动窗', '极简', '复古胶片', '现代'].map((name) => (
          <div
            key={name}
            className="flex aspect-[4/3] items-center justify-center rounded-md border bg-muted/30 text-[10px] text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
