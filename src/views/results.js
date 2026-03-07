/**
 * Results View
 * Renders the 11-phase analysis dashboard with score gauges, competitor cards, and verdict
 */
import { marked } from 'marked';

// Phase metadata for icons and colors
const PHASE_META = {
    problem_reality: { icon: '🎯', label: 'Problem Reality', accent: 'electric' },
    market_size: { icon: '📈', label: 'Market Size', accent: 'emerald' },
    customer_segmentation: { icon: '👥', label: 'Customer Segments', accent: 'electric' },
    competitive_intelligence: { icon: '⚔️', label: 'Competition', accent: 'rose' },
    switching_cost: { icon: '🔄', label: 'Switching Cost', accent: 'amber' },
    distribution: { icon: '📣', label: 'Distribution & GTM', accent: 'electric' },
    build_feasibility: { icon: '🛠️', label: 'Build Feasibility', accent: 'emerald' },
    economic_model: { icon: '💰', label: 'Economic Model', accent: 'amber' },
    moat: { icon: '🏰', label: 'Moat & Defensibility', accent: 'electric' },
    failure_scenarios: { icon: '💀', label: 'Failure Scenarios', accent: 'rose' },
};

export function renderResults(app, { result, tavilyResults, idea, onBack }) {
    const phases = result?.phases || {};
    const scorecard = phases.scorecard || {};

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
        <div class="glass p-5 mb-8 animate-fade-in-up">
          <div class="text-white/40 text-xs uppercase tracking-wider mb-1.5">Analyzed Idea</div>
          <p class="text-white/80 text-sm leading-relaxed">${escapeHtml(idea)}</p>
        </div>

        <!-- Verdict Banner -->
        ${renderVerdict(scorecard)}

        <!-- Score Overview -->
        ${renderScoreOverview(scorecard)}

        <!-- Tavily Research -->
        ${renderResearch(tavilyResults)}

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

    // Back button
    document.getElementById('back-btn').addEventListener('click', onBack);
}

function renderVerdict(scorecard) {
    if (!scorecard.verdict) return '';

    const verdictClass = getVerdictClass(scorecard.verdict);
    const emoji = scorecard.verdict_emoji || '📊';

    return `
    <div class="${verdictClass} rounded-2xl p-6 md:p-8 mb-8 animate-fade-in-up" style="animation-delay: 0.1s;">
      <div class="flex flex-col md:flex-row items-center md:items-start gap-5">
        <div class="text-5xl md:text-6xl">${emoji}</div>
        <div class="flex-1 text-center md:text-left">
          <h2 class="font-heading text-2xl md:text-3xl font-bold text-white mb-2">${escapeHtml(scorecard.verdict)}</h2>
          <div class="text-white/60 text-sm leading-relaxed max-w-2xl">${escapeHtml(scorecard.verdict_explanation || '')}</div>
        </div>
        <div class="text-center shrink-0">
          <div class="font-heading text-5xl font-extrabold ${getScoreColor(scorecard.overall_score, 100)}">${scorecard.overall_score || 0}</div>
          <div class="text-white/40 text-xs mt-1">/ 100</div>
        </div>
      </div>
    </div>
  `;
}

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

function renderResearch(tavilyResults) {
    if (!tavilyResults || tavilyResults.length === 0) return '';

    const allResults = tavilyResults.flatMap(tr => tr.results || []);
    if (allResults.length === 0) return '';

    return `
    <div class="glass p-6 md:p-8 animate-fade-in-up" style="animation-delay: 0.2s;">
      <h3 class="font-heading font-semibold text-white/80 text-sm uppercase tracking-wider mb-4">
        🔍 Live Market Research
        <span class="text-white/30 normal-case font-normal ml-2">(${allResults.length} sources found)</span>
      </h3>
      ${tavilyResults.map(tr => tr.answer ? `<p class="text-white/60 text-sm mb-4 leading-relaxed">${escapeHtml(tr.answer)}</p>` : '').join('')}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${allResults.slice(0, 6).map(r => `
          <div class="competitor-card">
            <a href="${r.url}" target="_blank" class="text-electric-400 hover:text-electric-300 text-sm font-medium leading-tight block mb-1.5">${escapeHtml(r.title)}</a>
            <p class="text-white/40 text-xs leading-relaxed line-clamp-3">${escapeHtml((r.content || '').substring(0, 180))}...</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPhaseCard(key, meta, phase) {
    const score = phase.score;
    const hasScore = score !== null && score !== undefined;

    // Build content from phase data (excluding known meta fields)
    const skipKeys = ['title', 'score', 'analysis', 'competitors', 'scenarios'];
    const details = Object.entries(phase)
        .filter(([k, v]) => !skipKeys.includes(k) && v !== null && v !== undefined)
        .map(([k, v]) => {
            const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `<div class="mb-2">
        <span class="text-white/40 text-xs uppercase tracking-wide">${label}</span>
        <div class="text-white/70 text-sm">${escapeHtml(String(v))}</div>
      </div>`;
        }).join('');

    // Competitors list
    const competitors = phase.competitors
        ? `<div class="mt-3 space-y-2">
        ${phase.competitors.map(c => `
          <div class="competitor-card">
            <div class="text-white/90 text-sm font-medium mb-1">${escapeHtml(c.name)}</div>
            <div class="text-white/50 text-xs space-y-0.5">
              ${c.pricing ? `<div><span class="text-white/30">Pricing:</span> ${escapeHtml(c.pricing)}</div>` : ''}
              ${c.strengths ? `<div><span class="text-white/30">Strengths:</span> ${escapeHtml(c.strengths)}</div>` : ''}
              ${c.weaknesses ? `<div><span class="text-white/30">Weaknesses:</span> ${escapeHtml(c.weaknesses)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>`
        : '';

    // Failure scenarios
    const scenarios = phase.scenarios
        ? `<ol class="list-decimal pl-5 mt-2 space-y-1.5">
        ${phase.scenarios.map(s => `<li class="text-white/70 text-sm">${escapeHtml(s)}</li>`).join('')}
      </ol>`
        : '';

    // Analysis (markdown)
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
            ${phase.title ? `<div class="text-white/30 text-xs">${phase.title}</div>` : ''}
          </div>
        </div>
        ${hasScore ? renderGauge(score, 10) : ''}
      </div>
      <div class="space-y-1">
        ${details}
        ${competitors}
        ${scenarios}
      </div>
      ${analysis}
    </div>
  `;
}

// Loading view
export function renderLoading(app) {
    app.innerHTML = `
    <div class="bg-grid min-h-screen flex items-center justify-center">
      <div class="loading-phase animate-fade-in">
        <div class="loading-icon"></div>
        <h2 class="font-heading text-2xl font-bold text-white mb-2">Analyzing Your Idea</h2>
        <p class="text-white/40 text-sm mb-2">This takes 30-60 seconds — deep thinking in progress</p>

        <div class="loading-steps">
          <div class="loading-step active" id="step-research">
            <span class="spinner"></span>
            <span>Searching for competitors & market data...</span>
          </div>
          <div class="loading-step" id="step-analysis">
            <span class="w-5 h-5 flex items-center justify-center text-white/20">○</span>
            <span>Running 11-phase AI analysis...</span>
          </div>
          <div class="loading-step" id="step-scoring">
            <span class="w-5 h-5 flex items-center justify-center text-white/20">○</span>
            <span>Calculating scores & verdict...</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function updateLoadingStep(stepId) {
    // Mark previous steps as done
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

// Helpers
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
    if (pct >= 0.7) return '#34d399'; // emerald
    if (pct >= 0.4) return '#fbbf24'; // amber
    return '#fb7185'; // rose
}
