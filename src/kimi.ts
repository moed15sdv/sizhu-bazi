import { buildKimiPrompt } from './bazi';
import type { BaziChart } from './types';

interface KimiResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export async function requestKimiReading(
  chart: BaziChart,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: 'system',
        content: '你是 Kimi。你以尊重、非宿命论的方式解释传统四柱八字，重视可验证的排盘数据和审慎表达。',
      },
      { role: 'user', content: buildKimiPrompt(chart) },
    ],
    max_tokens: 2200,
  };
  if (model === 'kimi-k2.6') body.thinking = { type: 'disabled' };

  let response: Response;
  try {
    response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('无法连接 Kimi API，请检查网络后重试。');
  }

  const data = await response.json().catch(() => null) as KimiResponse | null;
  if (!response.ok) {
    throw new Error(data?.error?.message || `Kimi API 请求失败（HTTP ${response.status}）。`);
  }
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Kimi 暂时没有返回解读内容，请重试。');
  return content;
}
