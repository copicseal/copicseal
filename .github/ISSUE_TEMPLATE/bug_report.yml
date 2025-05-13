name: 🐞 Bug 报告
description: 如果 copicseal 出现了异常或错误，请在这里反馈
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        感谢你的反馈！请尽可能提供完整的信息以帮助我们复现和解决问题。

  - type: input
    id: version
    attributes:
      label: 应用版本
      placeholder: 比如：v1.3.0 或 dev 分支最新 commit
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: 问题描述
      placeholder: 简要描述你遇到的问题
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: 复现步骤
      placeholder: |
        1. 打开应用
        2. 拖动图片 xxx
        3. 点击导出，报错或没有反应
    validations:
      required: true

  - type: textarea
    id: screenshot
    attributes:
      label: 截图或录屏（可选）
      description: 如有截图或录屏，请贴在这里

  - type: textarea
    id: logs
    attributes:
      label: 错误日志（可选）
      description: 控制台报错、终端输出等有助于定位问题的信息
      render: shell

  - type: dropdown
    id: platform
    attributes:
      label: 操作系统
      options:
        - Windows
        - macOS（Intel）
        - macOS（Apple Silicon）
        - Linux
    validations:
      required: true
