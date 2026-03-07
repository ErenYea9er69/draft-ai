/**
 * Results View — 10X Enhanced
 * Renders the full analysis dashboard with rich data from all 11 phases
 */
import { marked } from 'marked';

// Phase metadata
const PHASE_META = {
  problem_reality: { icon: '🎯', label: 'Problem Reality Test', accent: 'electric' },
  market_size: { icon: '📈', label: 'Market Size (TAM/SAM/SOM)', accent: 'emerald' },
  customer_segmentation: { icon: '👥', label: 'Customer Segmentation', accent: 'electric' },
  competitive_intelligence: { icon: '⚔️', label: 'Competitive Intelligence', accent: 'rose' },
  switching_cost: { icon: '🔄', label: 'Switching Cost & Behavior', accent: 'amber' },
  distribution: { icon: '📣', label: 'Distribution & GTM', accent: 'electric' },
  build_feasibility: { icon: '🛠️', label: 'Build Feasibility', accent: 'emerald' },
  economic_model: { icon: '💰', label: 'Economic Model', accent: 'amber' },
  moat: { icon: '🏰', label: 'Moat & Defensibility', accent: 'electric' },
  failure_scenarios: { icon: '💀', label: 'Failure Scenarios', accent: 'rose' },
};

export function renderResults(app, { result, tavilyData, idea, onBack }) {
  const phases = result?.phases || {};
  const scorecard = phases.scorecard || {};

  // Normalize tavilyData for backward compat
  const searches = tavilyData?.searches || tavilyData || [];
  const stats = tavilyData?.stats || {};

  app.innerHTML = `
    <div class="bg-grid min-h-screen">
      <!-- Nav -->
      <nav class="flex items-center justify-between px-6 md:px-10 py-5 max-w-7xl mx-auto">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">🚀</span>
          <span class="font-heading font-bold text-lg tracking-tight text-white">StartupValidator</span>
        </div>
        <button id="back-btn" class="btn-secondary text-xs">← Analyze Another Idea</button>
      </nav>

      <main class="max-w-7xl mx-auto px-6 md:px-10 pb-20">
        <!-- Idea Summary -->
        <div class="glass p-5 mb-6 animate-fade-in-up">
          <div class="text-white/40 text-xs uppercase tracking-wider mb-1.5">Analyzed Idea</div>
          <p class="text-white/80 text-sm leading-relaxed">${escapeHtml(idea)}</p>
          ${stats.totalSources ? `
            <div class="flex gap-4 mt-3 text-xs text-white/30">
              <span>🔍 ${stats.totalSearches || 0} research queries</span>
              <span>📄 ${stats.totalSources || 0} sources found</span>
              <span>🏷️ Keywords: ${(stats.keywords || []).join(', ')}</span>
            </div>
          ` : ''}
        </div>

        <!-- Verdict Banner -->
        ${renderVerdict(scorecard)}

        <!-- Score Overview -->
        ${renderScoreOverview(scorecard)}

        <!-- Go/No-Go + Next Steps -->
        ${renderGoNoGo(scorecard)}

        <!-- Research Intel -->
        ${renderResearch(searches, stats)}

        <!-- Phase Cards Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8 stagger">
          ${Object.entries(PHASE_META).map(([key, meta]) => {
    const phase = phases[key];
    if (!phase) return '';
    return renderPhaseCard(key, meta, phase);
  }).join('')}
        </div>
      </main>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', onBack);
}

// ------- VERDICT -------
function renderVerdict(scorecard) {
  if (!scorecard.verdict) return '';
  const cls = getVerdictClass(scorecard.verdict);
  const emoji = scorecard.verdict_emoji || '📊';

  return `
    <div class="${cls} rounded-2xl p-6 md:p-8 mb-6 animate-fade-in-up" style="animation-delay: 0.1s;">
      <div class="flex flex-col md:flex-row items-center md:items-start gap-5">
        <div class="text-5xl md:text-6xl shrink-0">${emoji}</div>
        <div class="flex-1 text-center md:text-left">
          <h2 class="font-heading text-2xl md:text-3xl font-bold text-white mb-3">${escapeHtml(scorecard.verdict)}</h2>
          <div class="text-white/60 text-sm leading-relaxed">${escapeHtml(scorecard.verdict_explanation || '')}</div>
        </div>
        <div class="text-center shrink-0">
          <div class="font-heading text-5xl font-extrabold ${getScoreColor(scorecard.overall_score, 100)}">${scorecard.overall_score || 0}</div>
          <div class="text-white/40 text-xs mt-1">/ 100</div>
        </div>
      </div>
    </div>
  `;
}

// ------- GO/NO-GO -------
function renderGoNoGo(scorecard) {
  if (!scorecard.go_nogo_recommendation && !scorecard.next_steps) return '';

  return `
    <div class="glass p-6 mb-6 animate-fade-in-up" style="animation-delay: 0.13s;">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${scorecard.go_nogo_recommendation ? `
          <div>
            <h3 class="font-heading font-semibold text-white/80 text-sm uppercase tracking-wider mb-3">🚦 Go/No-Go Recommendation</h3>
            <p class="text-white/70 text-sm leading-relaxed">${escapeHtml(scorecard.go_nogo_recommendation)}</p>
          </div>
        ` : ''}
        ${scorecard.next_steps ? `
          <div>
            <h3 class="font-heading font-semibold text-white/80 text-sm uppercase tracking-wider mb-3">📋 Next 30-Day Actions</h3>
            <p class="text-white/70 text-sm leading-relaxed">${escapeHtml(scorecard.next_steps)}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ------- SCORECARD -------
function renderScoreOverview(scorecard) {
  const scores = [
    { label: 'Problem', value: scorecard.problem_strength, max: 10 },
    { label: 'Market', value: scorecard.market_size_score, max: 10 },
    { label: 'Competition', value: scorecard.competition_risk, max: 10 },
    { label: 'Distribution', value: scorecard.distribution_difficulty, max: 10 },
    { label: 'Build', value: scorecard.build_difficulty, max: 10 },
    { label: 'Monetization', value: scorecard.monetization_potential, max: 10 },
    { label: 'Defensibility', value: scorecard.defensibility, max: 10 },
  ];

  return `
    <div class="glass p-6 md:p-8 mb-5 animate-fade-in-up" style="animation-delay: 0.15s;">
      <h3 class="font-heading font-semibold text-white/80 text-sm uppercase tracking-wider mb-6">Opportunity Scorecard</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6">
        ${scores.map(s => `
          <div class="flex flex-col items-center">
            ${renderGauge(s.value ?? 0, s.max)}
            <div class="text-white/50 text-xs mt-2 text-center">${s.label}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGauge(value, max) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / max, 1);
  const dashoffset = circumference * (1 - percentage);
  const color = getGaugeColor(value, max);

  return `
    <div class="score-gauge">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle class="track" cx="40" cy="40" r="${radius}" />
        <circle class="fill" cx="40" cy="40" r="${radius}"
          stroke="${color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${dashoffset}" />
      </svg>
      <div class="value" style="color: ${color}">${value}</div>
    </div>
  `;
}

// ------- RESEARCH -------
function renderResearch(searches, stats) {
  if (!searches || searches.length === 0) return '';

  const allSources = searches.flatMap(s => s.results || []);
  if (allSources.length === 0) return '';

  return `
    <div class="glass p-6 md:p-8 animate-fade-in-up" style="animation-delay: 0.2s;">
      <h3 class="font-heading font-semibold text-white/80 text-sm uppercase tracking-wider mb-5">
        🔍 Live Market Intelligence
        <span class="text-white/30 normal-case font-normal ml-2">(${allSources.length} sources across ${searches.length} research dimensions)</span>
      </h3>

      <!-- Research categories -->
      <div class="space-y-5">
        ${searches.map(s => {
    if (s.error && (!s.results || s.results.length === 0)) return '';
    return `
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-medium text-white/70">${s.label || s.id}</span>
                <span class="text-xs text-white/30">(${(s.results || []).length} sources)</span>
              </div>
              ${s.answer ? `<p class="text-white/50 text-xs leading-relaxed mb-2 pl-3 border-l-2 border-electric-500/30">${escapeHtml(s.answer.substring(0, 400))}${s.answer.length > 400 ? '...' : ''}</p>` : ''}
              ${(s.results || []).length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  ${(s.results || []).slice(0, 4).map(r => `
                    <div class="competitor-card">
                      <a href="${r.url}" target="_blank" class="text-electric-400 hover:text-electric-300 text-xs font-medium leading-tight block mb-1">${escapeHtml(r.title)}</a>
                      <p class="text-white/35 text-[11px] leading-relaxed line-clamp-2">${escapeHtml((r.content || '').substring(0, 150))}</p>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;
}

// ------- PHASE CARDS -------
function renderPhaseCard(key, meta, phase) {
  const score = phase.score;
  const hasScore = score !== null && score !== undefined;

  // Fields to skip when rendering generic key-value pairs
  const skipKeys = new Set(['title', 'score', 'analysis', 'competitors', 'scenarios', 'biggest_killer']);

  // Build detail rows from all non-skipped fields
  const details = Object.entries(phase)
    .filter(([k, v]) => !skipKeys.has(k) && v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `<div class="mb-2.5">
        <span class="text-white/35 text-[11px] uppercase tracking-wide font-medium">${label}</span>
        <div class="text-white/70 text-sm leading-relaxed mt-0.5">${escapeHtml(String(v))}</div>
      </div>`;
    }).join('');

  // Competitors (enhanced with threat levels, websites, funding)
  const competitors = phase.competitors
    ? `<div class="mt-4 space-y-2.5">
        <span class="text-white/35 text-[11px] uppercase tracking-wide font-medium">Identified Competitors</span>
        ${phase.competitors.map(c => `
          <div class="competitor-card">
            <div class="flex items-center justify-between mb-1.5">
              <div class="text-white/90 text-sm font-medium">${escapeHtml(c.name || '')}</div>
              ${c.threat_level ? `<span class="text-[10px] px-2 py-0.5 rounded-full ${getThreatColor(c.threat_level)}">${escapeHtml(c.threat_level)}</span>` : ''}
            </div>
            <div class="text-white/50 text-xs space-y-1">
              ${c.funding ? `<div><span class="text-white/30">💰 Funding:</span> ${escapeHtml(c.funding)}</div>` : ''}
              ${c.pricing ? `<div><span class="text-white/30">💳 Pricing:</span> ${escapeHtml(c.pricing)}</div>` : ''}
              ${c.features ? `<div><span class="text-white/30">⚡ Features:</span> ${escapeHtml(c.features)}</div>` : ''}
              ${c.strengths ? `<div><span class="text-white/30">✅ Strengths:</span> ${escapeHtml(c.strengths)}</div>` : ''}
              ${c.weaknesses ? `<div><span class="text-white/30">❌ Weaknesses:</span> ${escapeHtml(c.weaknesses)}</div>` : ''}
              ${c.website ? `<div><a href="${c.website}" target="_blank" class="text-electric-400 hover:text-electric-300 text-[11px]">${escapeHtml(c.website)}</a></div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>`
    : '';

  // Failure scenarios (enhanced with probability + mitigation)
  const scenarios = phase.scenarios
    ? `<div class="mt-4 space-y-2.5">
        <span class="text-white/35 text-[11px] uppercase tracking-wide font-medium">Risk Scenarios</span>
        ${phase.scenarios.map((s, i) => {
      // Handle both old format (string) and new format (object)
      if (typeof s === 'string') {
        return `<div class="competitor-card"><div class="text-white/70 text-sm">${i + 1}. ${escapeHtml(s)}</div></div>`;
      }
      return `
            <div class="competitor-card">
              <div class="flex items-start justify-between gap-2 mb-1.5">
                <div class="text-white/80 text-sm font-medium">${i + 1}. ${escapeHtml(s.risk || '')}</div>
                ${s.probability ? `<span class="text-[10px] px-2 py-0.5 rounded-full shrink-0 ${getProbabilityColor(s.probability)}">${escapeHtml(s.probability)}</span>` : ''}
              </div>
              ${s.mitigation ? `<div class="text-white/40 text-xs mt-1"><span class="text-emerald-400/70">Mitigation:</span> ${escapeHtml(s.mitigation)}</div>` : ''}
            </div>
          `;
    }).join('')}
        ${phase.biggest_killer ? `
          <div class="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div class="text-rose-400 text-[11px] uppercase tracking-wide font-medium mb-1">☠️ Biggest Killer</div>
            <div class="text-white/70 text-sm">${escapeHtml(phase.biggest_killer)}</div>
          </div>
        ` : ''}
      </div>`
    : '';

  // Analysis (markdown rendered)
  const analysis = phase.analysis
    ? `<div class="phase-content mt-4 pt-4 border-t border-white/5">${marked.parse(phase.analysis)}</div>`
    : '';

  return `
    <div class="glass p-5 md:p-6 animate-fade-in-up">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="text-xl">${meta.icon}</span>
          <div>
            <h3 class="font-heading font-semibold text-white/90 text-base">${meta.label}</h3>
          </div>
        </div>
        ${hasScore ? renderGauge(score, 10) : ''}
      </div>
      <div class="space-y-0.5">
        ${details}
        ${competitors}
        ${scenarios}
      </div>
      ${analysis}
    </div>
  `;
}

// ------- LOADING -------
export function renderLoading(app) {
  app.innerHTML = `
    <div class="bg-grid min-h-screen flex items-center justify-center">
      <div class="loading-phase animate-fade-in">
        <div class="loading-icon"></div>
        <h2 class="font-heading text-2xl font-bold text-white mb-2">Deep Analysis In Progress</h2>
        <p class="text-white/40 text-sm mb-1">Running 7 research strategies + 11-phase AI validation</p>
        <p class="text-white/25 text-xs mb-6">This takes 60-90 seconds — LongCat is thinking deeply</p>

        <div class="loading-steps">
          <div class="loading-step active" id="step-research">
            <span class="spinner"></span>
            <span>Searching 7 research dimensions...</span>
          </div>
          <div id="research-progress" class="text-xs text-white/30 ml-8 hidden"></div>
          <div class="loading-step" id="step-analysis">
            <span class="w-5 h-5 flex items-center justify-center text-white/20">○</span>
            <span>Running 11-phase AI analysis (thinking mode)...</span>
          </div>
          <div class="loading-step" id="step-scoring">
            <span class="w-5 h-5 flex items-center justify-center text-white/20">○</span>
            <span>Calculating scores & generating verdict...</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function updateLoadingStep(stepId) {
  const steps = ['step-research', 'step-analysis', 'step-scoring'];
  const idx = steps.indexOf(stepId);

  steps.forEach((s, i) => {
    const el = document.getElementById(s);
    if (!el) return;
    if (i < idx) {
      el.classList.remove('active');
      el.classList.add('done');
      el.querySelector('span:first-child').innerHTML = '✓';
    } else if (i === idx) {
      el.classList.add('active');
      el.querySelector('span:first-child').innerHTML = '<span class="spinner"></span>';
    }
  });
}

export function updateResearchProgress(progress) {
  const el = document.getElementById('research-progress');
  if (el) {
    el.classList.remove('hidden');
    el.textContent = `${progress.current} (${progress.done}/${progress.total} complete)`;
  }
}

// ------- HELPERS -------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function getVerdictClass(verdict) {
  if (!verdict) return 'verdict-risky';
  const v = verdict.toLowerCase();
  if (v.includes('exceptional')) return 'verdict-exceptional';
  if (v.includes('promising')) return 'verdict-promising';
  if (v.includes('risk')) return 'verdict-risky';
  return 'verdict-notworth';
}

function getScoreColor(value, max) {
  const pct = value / max;
  if (pct >= 0.7) return 'text-emerald-400';
  if (pct >= 0.4) return 'text-amber-400';
  return 'text-rose-400';
}

function getGaugeColor(value, max) {
  const pct = value / max;
  if (pct >= 0.7) return '#34d399';
  if (pct >= 0.4) return '#fbbf24';
  return '#fb7185';
}

function getThreatColor(level) {
  if (!level) return 'bg-white/10 text-white/50';
  const l = level.toLowerCase();
  if (l === 'high') return 'bg-rose-500/20 text-rose-400';
  if (l === 'medium') return 'bg-amber-500/20 text-amber-400';
  return 'bg-emerald-500/20 text-emerald-400';
}

function getProbabilityColor(prob) {
  if (!prob) return 'bg-white/10 text-white/50';
  const p = prob.toLowerCase();
  if (p === 'high') return 'bg-rose-500/20 text-rose-400';
  if (p === 'medium') return 'bg-amber-500/20 text-amber-400';
  return 'bg-emerald-500/20 text-emerald-400';
}
