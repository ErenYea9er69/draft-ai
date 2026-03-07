/**
 * Landing View
 * Hero, idea input form, API keys settings, history sidebar
 */
import { loadKeys, saveKeys, getHistory, deleteAnalysis } from '../services/storage.js';

export function renderLanding(app, { onSubmit, onLoadAnalysis, onSwitchToGuided, prefillIdea }) {
  const keys = loadKeys();
  const history = getHistory();

  app.innerHTML = `
    <div class="bg-grid min-h-screen">
      <!-- Nav -->
      <nav class="flex items-center justify-between px-6 md:px-10 py-5 max-w-7xl mx-auto">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">🚀</span>
          <span class="font-heading font-bold text-lg tracking-tight text-white">StartupValidator</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center bg-white/5 rounded-lg p-1">
            <button id="tab-freeform" class="px-4 py-2 rounded-md text-sm font-medium bg-electric-500/20 text-electric-400 border border-electric-500/30">
              ✍️ Free Text
            </button>
            <button id="tab-guided" class="px-4 py-2 rounded-md text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              🧭 Guided
            </button>
          </div>
          ${history.length > 0 ? `<button id="toggle-history" class="btn-secondary text-xs">📋 History (${history.length})</button>` : ''}
        </div>
      </nav>

      <div class="flex max-w-7xl mx-auto px-6 md:px-10 gap-8">
        <!-- Main Content -->
        <main class="flex-1 flex flex-col items-center pt-8 md:pt-16 pb-20">
          <!-- Hero -->
          <div class="text-center max-w-2xl mb-12 animate-fade-in-up">
            <h1 class="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 leading-tight">
              <span class="bg-gradient-to-r from-electric-400 via-electric-300 to-emerald-400 bg-clip-text text-transparent">
                Validate Your Idea
              </span>
              <br />
              <span class="text-white/90 text-2xl md:text-3xl lg:text-4xl font-semibold">Before You Build It</span>
            </h1>
            <p class="text-white/50 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Get a <strong class="text-white/70">brutally honest</strong> 11-phase analysis powered by AI reasoning and live market research. No sugar-coating.
            </p>
          </div>

          <!-- Input Card -->
          <div class="glass w-full max-w-2xl p-6 md:p-8 animate-fade-in-up" style="animation-delay: 0.15s;">
            <div class="mb-6">
              <label class="block text-white/70 text-sm font-medium mb-2">Your Startup Idea</label>
              <textarea
                id="idea-input"
                class="input-field"
                placeholder="Describe your startup idea in detail. What problem does it solve? Who is the target user? What's unique about your approach?&#10;&#10;Example: An AI-powered tool that automatically generates personalized onboarding sequences for SaaS products based on user behavior patterns..."
                rows="6"
              >${prefillIdea || ''}</textarea>
            </div>

            <!-- Settings Toggle -->
            <div class="mb-5">
              <div id="settings-toggle" class="settings-toggle mb-3">
                <svg class="w-4 h-4 transition-transform" id="settings-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span>⚙️ API Keys</span>
                <span class="text-white/30 text-xs ml-1">(required, both free)</span>
              </div>

              <div id="settings-panel" class="settings-panel">
                <div class="space-y-4 pt-2">
                  <div>
                    <label class="block text-white/60 text-xs font-medium mb-1.5">
                      LongCat API Key
                      <a href="https://longcat.chat" target="_blank" class="text-electric-400 hover:text-electric-300 ml-1">Get free key →</a>
                    </label>
                    <input
                      id="longcat-key"
                      type="password"
                      class="input-field text-sm"
                      placeholder="Enter your LongCat API key..."
                      value="${keys.longcatKey || ''}"
                    />
                  </div>
                  <div>
                    <label class="block text-white/60 text-xs font-medium mb-1.5">
                      Tavily API Key
                      <a href="https://app.tavily.com" target="_blank" class="text-electric-400 hover:text-electric-300 ml-1">Get free key →</a>
                    </label>
                    <input
                      id="tavily-key"
                      type="password"
                      class="input-field text-sm"
                      placeholder="Enter your Tavily API key..."
                      value="${keys.tavilyKey || ''}"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Submit -->
            <button id="submit-btn" class="btn-primary w-full text-center flex items-center justify-center gap-2.5">
              <span>⚡</span>
              <span>Validate My Idea</span>
            </button>

            <p id="error-msg" class="text-rose-400 text-sm mt-3 hidden"></p>
          </div>

          <!-- How it works -->
          <div class="mt-14 max-w-2xl w-full animate-fade-in-up" style="animation-delay: 0.3s;">
            <h3 class="font-heading font-semibold text-white/60 text-sm uppercase tracking-wider mb-5 text-center">How it works</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="glass p-5 text-center">
                <div class="text-2xl mb-2">🔍</div>
                <div class="text-sm font-medium text-white/80 mb-1">Live Research</div>
                <div class="text-xs text-white/40">Tavily searches for competitors & market data</div>
              </div>
              <div class="glass p-5 text-center">
                <div class="text-2xl mb-2">🧠</div>
                <div class="text-sm font-medium text-white/80 mb-1">Deep Analysis</div>
                <div class="text-xs text-white/40">LongCat Thinking mode runs 11-phase validation</div>
              </div>
              <div class="glass p-5 text-center">
                <div class="text-2xl mb-2">📊</div>
                <div class="text-sm font-medium text-white/80 mb-1">Scored Results</div>
                <div class="text-xs text-white/40">Get scores, risks, and a brutally honest verdict</div>
              </div>
            </div>
          </div>
        </main>

        <!-- History Sidebar (conditionally shown) -->
        <aside id="history-sidebar" class="hidden w-72 shrink-0 pt-8">
          <div class="glass p-4 sticky top-8">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-heading font-semibold text-white/80 text-sm">Past Analyses</h3>
              <button id="close-history" class="text-white/30 hover:text-white/60 text-lg leading-none">&times;</button>
            </div>
            <div id="history-list" class="space-y-2 max-h-[60vh] overflow-y-auto">
              ${history.map(h => `
                <div class="history-item group" data-id="${h.id}">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="text-sm text-white/80 font-medium truncate">${escapeHtml(h.idea)}</div>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs text-white/40">${new Date(h.timestamp).toLocaleDateString()}</span>
                        <span class="text-xs font-medium ${getVerdictColor(h.verdict)}">${h.overallScore}/100</span>
                      </div>
                    </div>
                    <button class="delete-history text-white/20 hover:text-rose-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity" data-id="${h.id}">&times;</button>
                  </div>
                </div>
              `).join('')}
              ${history.length === 0 ? '<p class="text-white/30 text-sm text-center py-4">No past analyses yet</p>' : ''}
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;

  // --- Event Listeners ---

  // Tab navigation
  document.getElementById('tab-guided')?.addEventListener('click', () => {
    if (onSwitchToGuided) onSwitchToGuided();
  });

  // Settings toggle
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsArrow = document.getElementById('settings-arrow');
  let settingsOpen = !keys.longcatKey || !keys.tavilyKey; // auto-open if keys missing

  if (settingsOpen) {
    settingsPanel.classList.add('open');
    settingsArrow.style.transform = 'rotate(90deg)';
  }

  settingsToggle.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    settingsPanel.classList.toggle('open', settingsOpen);
    settingsArrow.style.transform = settingsOpen ? 'rotate(90deg)' : '';
  });

  // History toggle
  const historyBtn = document.getElementById('toggle-history');
  const historySidebar = document.getElementById('history-sidebar');
  const closeHistory = document.getElementById('close-history');

  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      historySidebar.classList.toggle('hidden');
    });
  }
  if (closeHistory) {
    closeHistory.addEventListener('click', () => {
      historySidebar.classList.add('hidden');
    });
  }

  // History items
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-history')) return;
      onLoadAnalysis(item.dataset.id);
    });
  });

  document.querySelectorAll('.delete-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAnalysis(btn.dataset.id);
      renderLanding(app, { onSubmit, onLoadAnalysis, onSwitchToGuided, prefillIdea });
    });
  });

  // Submit
  const submitBtn = document.getElementById('submit-btn');
  const errorMsg = document.getElementById('error-msg');

  submitBtn.addEventListener('click', () => {
    const idea = document.getElementById('idea-input').value.trim();
    const longcatKey = document.getElementById('longcat-key').value.trim();
    const tavilyKey = document.getElementById('tavily-key').value.trim();

    // Validation
    if (!idea) {
      showError('Please describe your startup idea.');
      return;
    }
    if (!longcatKey) {
      showError('Please enter your LongCat API key. Get a free one at longcat.chat');
      if (!settingsOpen) settingsToggle.click();
      return;
    }
    if (!tavilyKey) {
      showError('Please enter your Tavily API key. Get a free one at app.tavily.com');
      if (!settingsOpen) settingsToggle.click();
      return;
    }

    // Save keys
    saveKeys(longcatKey, tavilyKey);

    // Trigger analysis
    onSubmit({ idea, longcatKey, tavilyKey });
  });

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    setTimeout(() => errorMsg.classList.add('hidden'), 5000);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getVerdictColor(verdict) {
  if (!verdict) return 'text-white/40';
  const v = verdict.toLowerCase();
  if (v.includes('exceptional')) return 'text-emerald-400';
  if (v.includes('promising')) return 'text-electric-400';
  if (v.includes('risk')) return 'text-amber-400';
  return 'text-rose-400';
}
