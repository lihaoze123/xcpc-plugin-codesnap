import type { PluginCommandAction, ToolExecutionResult } from "@xcpc/plugin-sdk/host";

export function runCommand(
  commandId: string,
  ctx?: Record<string, unknown>,
): PluginCommandAction {
  if (commandId === "open") {
    return {
      type: "open_tool",
      plugin_id: "codesnap",
      tool_id: "snapshot",
      initial_inputs: ctx ?? undefined,
    };
  }
  return { type: "none" };
}

export function runTool(
  toolId: string,
  inputs: Record<string, unknown>,
): ToolExecutionResult {
  if (toolId !== "snapshot") {
    throw new Error(`Unknown tool: ${toolId}`);
  }
  const code = String(inputs.code ?? "");
  const lines = code ? code.split(/\r?\n/).length : 0;
  return {
    summary: lines > 0 ? `已就绪（${lines} 行代码），请在桌面端 CodeSnap 界面中预览与导出。` : "请在桌面端 CodeSnap 界面中粘贴或打开代码文件。",
    blocks: [
      {
        type: "text",
        title: "CodeSnap",
        content:
          lines > 0
            ? `已接收 ${lines} 行代码。CodeSnap 使用桌面端 Canvas2D 实时渲染高清 PNG 截图。`
            : "CodeSnap 是交互式代码截图插件，请在桌面端工具面板中打开使用。",
      },
    ],
  };
}
