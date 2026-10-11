import { Mention } from '@tiptap/extension-mention';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslate } from '@/shared/i18n';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { resolveFieldLabel } from '../runtime/template-registry';
import { EXIF_TEXT_VARIABLES } from '../templates/format-exif-text';
import type { TemplateTextField } from '../templates/types';

const MENTION_NAME = 'mention';
const TOKEN_PATTERN = /\{[A-Za-z]+\}/g;
const MENTION_CLASS =
  'rounded-md bg-primary/12 px-1 py-0.5 text-[0.85em] font-medium text-primary whitespace-nowrap';

/** 变量以 mention 芯片呈现（TipTap mentions 的样式），但**存储仍然是纯文本** `{Make}`。 */
function knownToken(token: string) {
  return EXIF_TEXT_VARIABLES.find((variable) => variable.token === token);
}

/** 纯文本 → 编辑器文档：已知 token 变成 mention 节点，其余原样保留（未知 `{Foo}` 不当作变量）。 */
function contentFromValue(value: string) {
  const nodes: Array<Record<string, unknown>> = [];
  let cursor = 0;

  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const token = match[0];
    if (!knownToken(token)) {
      continue;
    }

    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push({ type: 'text', text: value.slice(cursor, index) });
    }
    nodes.push({ type: MENTION_NAME, attrs: { id: token, label: token } });
    cursor = index + token.length;
  }

  if (cursor < value.length) {
    nodes.push({ type: 'text', text: value.slice(cursor) });
  }

  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: nodes.length > 0 ? nodes : undefined }],
  };
}

/** 编辑器文档 → 纯文本：mention 还原成 `{Token}`，段落之间用空格连接（与渲染时折叠空白的行为一致）。 */
function valueFromDoc(doc: ProseMirrorNode): string {
  const blocks: string[] = [];

  doc.forEach((block) => {
    let line = '';
    block.forEach((node) => {
      if (node.isText) {
        line += node.text ?? '';
        return;
      }
      if (node.type.name === MENTION_NAME) {
        line += String(node.attrs.id ?? '');
        return;
      }
      if (node.type.name === 'hardBreak') {
        line += '\n';
      }
    });
    blocks.push(line);
  });

  return blocks.join(' ');
}

/**
 * 模板文本参数的「展开编辑」弹框。
 *
 * 变量以 mention 芯片插入到光标位置（TipTap mentions 的做法），列表放在编辑框下方；
 * 值实时回写到参数（纯文本 `{Token}`），所以关闭即生效，不需要额外的确定按钮。
 */
export function TemplateTextEditorDialog({
  field,
  value,
  onChange,
  onClose,
}: {
  field: TemplateTextField<string>;
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const t = useTranslate();
  const label = resolveFieldLabel(field, t);

  const editor = useEditor({
    extensions: [
      // 值最终是纯文本，所以只留文档/段落/文本/换行与撤销重做，关掉所有会产出格式的扩展
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        trailingNode: false,
        underline: false,
      }),
      Mention.configure({
        HTMLAttributes: { class: MENTION_CLASS },
        // 存储的是纯文本 `{Make}`，所以芯片上也只显示 token 本身：
        // 扩展默认会在前面加 suggestion 字符（`@`），而值里并没有它，展示与真实值不一致会误导
        renderText: ({ node }) => String(node.attrs.id ?? ''),
        renderHTML: ({ node }) => [
          'span',
          { 'data-type': 'mention', 'data-id': String(node.attrs.id ?? ''), class: MENTION_CLASS },
          String(node.attrs.id ?? ''),
        ],
      }),
    ],
    content: contentFromValue(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-28 w-full px-3 py-2 text-sm outline-none [&_p]:leading-6 whitespace-pre-wrap break-all',
      },
    },
    onUpdate: ({ editor: instance }) => onChange(valueFromDoc(instance.state.doc)),
  });

  const insertVariable = (token: string, name: string) => {
    editor
      ?.chain()
      .focus()
      .insertContent([
        { type: MENTION_NAME, attrs: { id: token, label: name } },
        { type: 'text', text: ' ' },
      ])
      .run();
  };

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
          <EditorContent editor={editor} />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-foreground">
              {t('template.props.variablesTitle')}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t('template.props.variablesHint')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXIF_TEXT_VARIABLES.map((variable) => {
              const name = variable.labelKey ? t(variable.labelKey) : variable.label;

              return (
                <Button
                  key={variable.token}
                  type="button"
                  variant="plain"
                  size="sm"
                  className="h-6 rounded-md border border-border px-2 text-[11px]"
                  onClick={() => insertVariable(variable.token, name)}
                >
                  {name}
                  <span className="text-muted-foreground">{variable.token}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" size="sm" onClick={onClose}>
            {t('template.props.editorDone')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
