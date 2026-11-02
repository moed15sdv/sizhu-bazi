import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateChart } from '../src/bazi';
import { requestKimiReading } from '../src/kimi';

const chart = calculateChart({
  date: '1990-05-20', time: '14:30', gender: 'unspecified', birthplace: '', lateZi: 'same-day',
});

afterEach(() => vi.unstubAllGlobals());

describe('Kimi API 请求', () => {
  it('使用官方端点、Bearer 密钥和已排好的命盘', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '这是一段模拟解读。' } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestKimiReading(chart, 'sk-test-only', 'kimi-k2.6');
    expect(result).toBe('这是一段模拟解读。');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.moonshot.cn/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer sk-test-only');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('kimi-k2.6');
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.messages[1].content).toContain('年柱：庚午');
  });

  it('把服务端错误转成可读提示', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: '无效的 API Key' },
    }), { status: 401 })));
    await expect(requestKimiReading(chart, 'bad-key', 'kimi-k2.6')).rejects.toThrow('无效的 API Key');
  });

  it('没有正文时给出明确错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 })));
    await expect(requestKimiReading(chart, 'key', 'kimi-k2.6')).rejects.toThrow('没有返回解读内容');
  });
});
