import './styles.css';
import { calculateChart, chartToText, DAY_MASTER_TEXT, buildKimiPrompt } from './bazi';
import { requestKimiReading } from './kimi';
import { createShareUrl, readInputFromHash } from './share';
import type { BaziChart, BirthInput, ElementName, Gender, LateZiMode } from './types';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`缺少页面元素：${id}`);
  return element as T;
}
const form = byId<HTMLFormElement>('birth-form');
const emptyState = byId('empty-state');
const chartResult = byId('chart-result');
const apiKeyInput = byId<HTMLInputElement>('api-key');
const modelInput = byId<HTMLInputElement>('api-model');
const kimiButton = byId<HTMLButtonElement>('kimi-button');
const aiResponse = byId('ai-response');
const copyReadingButton = byId<HTMLButtonElement>('copy-reading-button');
let currentChart: BaziChart | null = null;
let currentReading = '';
let toastTimer: number | undefined;
let requestController: AbortController | null = null;
function showToast(message: string) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}
async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    showToast(copied ? successMessage : '复制失败，请手动复制。');
  }
}
function readForm(): BirthInput {
  const data = new FormData(form);
  return {
    date: String(data.get('date') || ''),
    time: String(data.get('time') || ''),
    gender: String(data.get('gender') || 'unspecified') as Gender,
    birthplace: String(data.get('birthplace') || '').trim(),
    lateZi: String(data.get('lateZi') || 'same-day') as LateZiMode,
  };
}
function fillForm(input: BirthInput) {
  byId<HTMLInputElement>('birth-date').value = input.date;
  byId<HTMLInputElement>('birth-time').value = input.time;
  byId<HTMLSelectElement>('gender').value = input.gender;
  byId<HTMLInputElement>('birthplace').value = input.birthplace;
  byId<HTMLSelectElement>('late-zi').value = input.lateZi;
}
function renderPillars(chart: BaziChart) {
  const container = byId('pillar-grid');
  container.replaceChildren();
  chart.pillars.forEach((pillar) => {
    const card = document.createElement('article');
    card.className = `pillar-card${pillar.key === 'day' ? ' day' : ''}`;
    const hidden = pillar.hiddenGans.map((gan, index) => `${gan} ${pillar.hiddenShiShen[index]}`).join(' · ');
    card.innerHTML = `<span class="pillar-label">${pillar.label}</span><span class="pillar-shishen">${pillar.shiShen}</span><i class="element-dot gan element-${pillar.ganElement}" title="天干五行属${pillar.ganElement}"></i><strong class="pillar-char">${pillar.gan}</strong><i class="element-dot zhi element-${pillar.zhiElement}" title="地支五行属${pillar.zhiElement}"></i><strong class="pillar-char zhi">${pillar.zhi}</strong><div class="pillar-meta"><strong>${pillar.naYin}</strong><span>${hidden}</span><br /><span>地势 · ${pillar.diShi}</span></div>`;
    container.append(card);
  });
}
function renderElements(chart: BaziChart) {
  const container = byId('element-bars');
  container.replaceChildren();
  const names: ElementName[] = ['木', '火', '土', '金', '水'];
  names.forEach((name) => {
    const count = chart.elements[name];
    const item = document.createElement('div');
    item.className = 'element-item';
    item.innerHTML = `<div class="element-item-top"><strong>${name}</strong><span>${count} / 8</span></div><div class="element-track"><div class="element-fill element-${name}" style="width:${count / 8 * 100}%"></div></div>`;
    container.append(item);
  });
}
function resetReading() {
  requestController?.abort();
  currentReading = '';
  aiResponse.hidden = true;
  aiResponse.replaceChildren();
  copyReadingButton.hidden = true;
  byId('kimi-status').hidden = true;
  kimiButton.disabled = false;
  kimiButton.firstElementChild!.textContent = '生成 Kimi 解读';
}
function renderChart(chart: BaziChart) {
  resetReading();
  currentChart = chart;
  emptyState.hidden = true;
  chartResult.hidden = false;
  byId('result-date').textContent = `${chart.input.date} · ${chart.input.time}`;
  byId('result-lunar').textContent = chart.lunarDate;
  byId('day-master-seal').textContent = chart.dayMaster;
  byId('solar-term').textContent = `节气界点｜${chart.solarTerm}`;
  renderPillars(chart);
  renderElements(chart);
  const dayMaster = DAY_MASTER_TEXT[chart.dayMaster];
  byId('day-master-name').textContent = `日主 · ${chart.dayMaster}${chart.dayMasterElement}`;
  byId('day-master-symbol').textContent = dayMaster.symbol;
  byId('day-master-reflection').textContent = dayMaster.reflection;
}
function submitChart(scroll = false) {
  try {
    const chart = calculateChart(readForm());
    renderChart(chart);
    if (scroll) chartResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showToast(error instanceof Error ? error.message : '排盘失败，请检查输入。');
  }
}
function renderSafeReading(markdown: string) {
  aiResponse.replaceChildren();
  const lines = markdown.split('\n');
  let list: HTMLUListElement | null = null;
  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) { list = null; return; }
    const heading = /^#{1,4}\s+(.+)$/.exec(line);
    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    const numbered = /^\d+[.、]\s*(.+)$/.exec(line);
    if (heading) {
      const element = document.createElement('h2');
      element.textContent = heading[1].replaceAll('**', '');
      aiResponse.append(element);
      list = null;
    } else if (bullet || numbered) {
      if (!list) { list = document.createElement('ul'); aiResponse.append(list); }
      const item = document.createElement('li');
      item.textContent = (bullet?.[1] || numbered?.[1] || '').replaceAll('**', '');
      list.append(item);
    } else {
      const paragraph = document.createElement('p');
      paragraph.textContent = line.replaceAll('**', '');
      aiResponse.append(paragraph);
      list = null;
    }
  });
  aiResponse.hidden = false;
}
form.addEventListener('submit', (event) => { event.preventDefault(); submitChart(true); });
byId('share-button').addEventListener('click', () => { if (currentChart) void copyText(createShareUrl(currentChart.input), '分享链接已复制。链接含出生信息，请谨慎分享。'); });
byId('copy-chart-button').addEventListener('click', () => { if (currentChart) void copyText(chartToText(currentChart), '排盘内容已复制。'); });
byId('print-button').addEventListener('click', () => window.print());
byId('copy-prompt-button').addEventListener('click', () => { if (currentChart) void copyText(buildKimiPrompt(currentChart), '提示词已复制，可粘贴到任意 Kimi 对话。'); });
copyReadingButton.addEventListener('click', () => { if (currentReading) void copyText(currentReading, 'Kimi 解读已复制。'); });
kimiButton.addEventListener('click', async () => {
  if (!currentChart) return;
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  if (!apiKey) {
    byId<HTMLDetailsElement>('api-settings').open = true;
    apiKeyInput.focus();
    showToast('请先填写 Moonshot API Key，或选择“复制提示词”。');
    return;
  }
  if (!model) { modelInput.focus(); showToast('请填写模型名称。'); return; }
  const status = byId('kimi-status');
  requestController = new AbortController();
  kimiButton.disabled = true;
  kimiButton.firstElementChild!.textContent = 'Kimi 正在解读…';
  status.textContent = '正在安全连接 Kimi API，通常需要一些时间。';
  status.className = 'kimi-status loading';
  status.hidden = false;
  aiResponse.hidden = true;
  copyReadingButton.hidden = true;
  try {
    currentReading = await requestKimiReading(currentChart, apiKey, model, requestController.signal);
    status.hidden = true;
    renderSafeReading(currentReading);
    copyReadingButton.hidden = false;
    apiKeyInput.value = '';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    status.textContent = error instanceof Error ? error.message : '解读失败，请稍后重试。';
    status.className = 'kimi-status error';
  } finally {
    kimiButton.disabled = false;
    kimiButton.firstElementChild!.textContent = '重新生成解读';
    requestController = null;
  }
});
const sharedInput = readInputFromHash();
if (sharedInput) {
  fillForm(sharedInput);
  submitChart();
  showToast('已还原分享链接中的排盘。');
}
