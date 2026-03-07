/**
 * Guided Interview View — 10X AI-Powered
 *
 * Features:
 * - AI answer quality feedback with score badge + improvement suggestions
 * - AI follow-up questions that dig deeper into blind spots
 * - "Help me think" brainstorm button with AI-generated prompts
 * - Idea readiness meter that updates as you answer
 * - Ctrl+Enter to advance, auto-focus
 */
import { loadKeys } from '../services/storage.js';
import { getAnswerFeedback, getFollowUpQuestions, brainstormHelper, getReadinessScore } from '../services/interview-ai.js';

// The interview steps
const INTERVIEW_STEPS = [
    {
        id: 'problem',
        icon: '🎯',
        title: 'The Problem',
        question: 'What problem are you trying to solve?',
        hint: 'Describe the specific pain point or frustration. Who experiences it and how often?',
        placeholder: 'e.g., Small business owners spend 5+ hours per week manually creating social media content because existing tools are too expensive or generic...',
        required: true,
    },
    {
        id: 'audience',
        icon: '👥',
        title: 'Target Users',
        question: 'Who exactly would use this product?',
        hint: 'Be specific — what type of person, role, or company? What size? What industry?',
        placeholder: 'e.g., Solo entrepreneurs and small marketing teams (1-5 people) at B2B SaaS companies with $100K-$5M revenue...',
        required: true,
    },
    {
        id: 'solution',
        icon: '💡',
        title: 'Your Solution',
        question: 'What is your product idea? How does it solve the problem?',
        hint: "Describe what the product does, not how it's built. Focus on the user experience.",
        placeholder: 'e.g., An AI tool that generates a full week of brand-consistent social media posts in 5 minutes, learning from your past content and audience engagement data...',
        required: true,
    },
    {
        id: 'unique',
        icon: '✨',
        title: 'What Makes It Different',
        question: 'Why would someone choose your solution over existing alternatives?',
        hint: "What's your unique angle? Cheaper? Faster? Better for a specific niche? New technology?",
        placeholder: 'e.g., Unlike Buffer or Hootsuite, we focus specifically on B2B SaaS content and learn your brand voice from existing materials. 10x cheaper than hiring a content manager...',
        required: true,
    },
    {
        id: 'existing',
        icon: '⚔️',
        title: 'Current Alternatives',
        question: 'What do people currently do to solve this problem? (competitors, manual work, etc.)',
        hint: 'Include direct competitors, indirect solutions, and "doing nothing" as options.',
        placeholder: 'e.g., They use Canva + ChatGPT manually, hire freelancers ($500-2000/month), use Buffer/Hootsuite (not AI-native), or just post inconsistently...',
        required: false,
    },
    {
        id: 'revenue',
        icon: '💰',
        title: 'Business Model',
        question: 'How would you make money? Any pricing ideas?',
        hint: 'Subscription? Freemium? Per-use? Enterprise licensing? What would users pay?',
        placeholder: 'e.g., Freemium SaaS — free for 5 posts/week, $29/mo for unlimited, $99/mo for teams. Enterprise custom pricing...',
        required: false,
    },
    {
        id: 'tech',
        icon: '🛠️',
        title: 'Technology',
        question: 'What technology would power this? Any special requirements?',
        hint: 'AI/ML? APIs? Mobile app? Integrations with other tools? Special data needed?',
        placeholder: 'e.g., GPT-4/Claude API for content generation, social media APIs for scheduling, analytics integration for learning from engagement data...',
        required: false,
    },
    {
        id: 'traction',
        icon: '📈',
        title: 'Traction & Validation',
        question: 'Have you validated this idea? Any early traction, conversations, or evidence?',
        hint: "Talked to potential users? Built a prototype? Have a waitlist? Survey results? This is optional.",
        placeholder: "e.g., Talked to 15 small business owners — 12 said they'd pay for this. Built a landing page, got 200 signups in 2 weeks...",
        required: false,
    },
];

export function renderInterview(app, { onComplete, onSwitchToFreeform }) {
    const keys = loadKeys();

    // State
    let currentStep = 0;
    let answers = {};
    let aiFeedback = {};  // per-step AI feedback cache
    let aiFollowUps = {};  // per-step follow-up questions cache
    let readiness = null;  // overall readiness score
    let isAILoading = false;

    function getContext() {
        return Object.entries(answers)
            .filter(([_, v]) => v?.trim())
            .map(([k, v]) => `${k}: ${v.substring(0, 150)}`)
            .join('\n') || 'None yet';
    }

    function render() {
        const step = INTERVIEW_STEPS[currentStep];
        const isFirst = currentStep === 0;
        const isLast = currentStep === INTERVIEW_STEPS.length - 1;
        const progress = ((currentStep + 1) / INTERVIEW_STEPS.length) * 100;
        const feedback = aiFeedback[step.id];
        const followUps = aiFollowUps[step.id];
        const currentAnswer = answers[step.id] || '';

        const requiredAnswered = INTERVIEW_STEPS
            .filter(s => s.required)
            .every(s => answers[s.id]?.trim());
        const canFinish = requiredAnswered;

        app.innerHTML = `
      <div class="bg-grid min-h-screen">
        <!-- Nav -->
        <nav class="flex items-center justify-between px-6 md:px-10 py-5 max-w-7xl mx-auto">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">🚀</span>
            <span class="font-heading font-bold text-lg tracking-tight text-white">StartupValidator</span>
          </div>
          <div class="flex items-center gap-2 bg-white/5 rounded-lg p-1">
            <button id="tab-freeform" class="px-4 py-2 rounded-md text-sm font-medium text-white/50 hover:text-white/80 transition-colors">
              ✍️ Free Text
            </button>
            <button id="tab-guided" class="px-4 py-2 rounded-md text-sm font-medium bg-electric-500/20 text-electric-400 border border-electric-500/30">
              🧭 Guided
            </button>
          </div>
        </nav>

        <main class="flex-1 flex flex-col items-center pt-4 md:pt-8 pb-20 px-6 md:px-10 max-w-3xl mx-auto">
          <!-- Progress + Readiness -->
          <div class="w-full mb-6 animate-fade-in">
            <div class="flex items-center justify-between mb-2">
              <span class="text-white/40 text-xs font-medium">Step ${currentStep + 1} of ${INTERVIEW_STEPS.length}</span>
              <div class="flex items-center gap-3">
                ${readiness ? `
                  <div class="flex items-center gap-2">
                    <span class="text-white/30 text-xs">Readiness:</span>
                    <div class="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-700 ${readiness.readiness >= 70 ? 'bg-emerald-500' : readiness.readiness >= 40 ? 'bg-amber-500' : 'bg-rose-500'}" style="width: ${readiness.readiness}%"></div>
                    </div>
                    <span class="text-xs font-medium ${readiness.readiness >= 70 ? 'text-emerald-400' : readiness.readiness >= 40 ? 'text-amber-400' : 'text-rose-400'}">${readiness.readiness}%</span>
                  </div>
                ` : ''}
                <span class="text-white/40 text-xs">${Math.round(progress)}%</span>
              </div>
            </div>
            <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-electric-500 to-electric-400 rounded-full transition-all duration-500 ease-out" style="width: ${progress}%"></div>
            </div>
            <!-- Step dots -->
            <div class="flex justify-between mt-3">
              ${INTERVIEW_STEPS.map((s, i) => {
            const filled = answers[s.id]?.trim();
            const active = i === currentStep;
            const fb = aiFeedback[s.id];
            let dotClass = 'bg-white/10';
            if (active) dotClass = 'bg-electric-500 ring-2 ring-electric-500/30';
            else if (fb && fb.quality >= 4) dotClass = 'bg-emerald-500';
            else if (filled) dotClass = 'bg-emerald-500/60';
            return `<button class="interview-dot w-7 h-7 rounded-full ${dotClass} flex items-center justify-center text-xs transition-all duration-300" data-step="${i}" title="${s.title}">
                  ${filled && !active ? (fb && fb.quality >= 4 ? '★' : '✓') : s.icon}
                </button>`;
        }).join('')}
            </div>
          </div>

          <div class="w-full grid grid-cols-1 lg:grid-cols-3 gap-5">
            <!-- Main Question Card (spans 2 cols) -->
            <div class="lg:col-span-2 space-y-4">
              <div class="glass p-6 md:p-7 animate-fade-in-up" style="animation-delay: 0.05s;">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <span class="text-3xl">${step.icon}</span>
                    <div>
                      <h2 class="font-heading text-xl md:text-2xl font-bold text-white">${step.title}</h2>
                      ${step.required ? '<span class="text-rose-400 text-xs">Required</span>' : '<span class="text-white/30 text-xs">Optional</span>'}
                    </div>
                  </div>
                  ${feedback ? renderQualityBadge(feedback.quality) : ''}
                </div>

                <p class="text-white/70 text-base mb-1.5 font-medium">${step.question}</p>
                <p class="text-white/35 text-sm mb-4">${step.hint}</p>

                <textarea
                  id="answer-input"
                  class="input-field"
                  placeholder="${step.placeholder}"
                  rows="5"
                >${currentAnswer}</textarea>

                <!-- AI Action Buttons -->
                <div class="flex flex-wrap items-center gap-2 mt-3">
                  <button id="ai-feedback-btn" class="ai-action-btn" ${isAILoading ? 'disabled' : ''}>
                    ${isAILoading ? '<span class="spinner" style="width:14px;height:14px;border-width:1.5px;"></span>' : '✨'} Rate My Answer
                  </button>
                  <button id="ai-brainstorm-btn" class="ai-action-btn" ${isAILoading ? 'disabled' : ''}>
                    🧠 Help Me Think
                  </button>
                  ${currentAnswer.trim() ? `
                    <button id="ai-followup-btn" class="ai-action-btn" ${isAILoading ? 'disabled' : ''}>
                      🔍 Dig Deeper
                    </button>
                  ` : ''}
                  <span class="text-white/15 text-[10px] ml-auto">Ctrl+Enter to advance</span>
                </div>

                <!-- AI Feedback Panel -->
                ${feedback ? renderFeedbackPanel(feedback) : ''}

                <!-- Navigation -->
                <div class="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
                  <button id="prev-btn" class="btn-secondary text-sm ${isFirst ? 'opacity-30 pointer-events-none' : ''}">
                    ← Back
                  </button>
                  <div class="flex items-center gap-3">
                    ${!isLast && !step.required && !currentAnswer.trim() ? `
                      <button id="skip-btn" class="text-white/30 hover:text-white/50 text-sm transition-colors">Skip →</button>
                    ` : ''}
                    ${!isLast ? `
                      <button id="next-btn" class="btn-primary text-sm">Next →</button>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Follow-up Questions -->
              ${followUps ? renderFollowUps(followUps) : ''}
            </div>

            <!-- Right Sidebar: Summary + Readiness -->
            <div class="space-y-4">
              <!-- Readiness Card -->
              ${readiness ? `
                <div class="glass p-5 animate-fade-in-up" style="animation-delay:0.1s;">
                  <h4 class="font-heading font-semibold text-white/70 text-xs uppercase tracking-wider mb-3">📊 Idea Readiness</h4>
                  <div class="flex items-center justify-center mb-3">
                    <div class="relative w-20 h-20">
                      <svg width="80" height="80" viewBox="0 0 80 80" style="transform:rotate(-90deg)">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6" />
                        <circle cx="40" cy="40" r="34" fill="none"
                          stroke="${readiness.readiness >= 70 ? '#34d399' : readiness.readiness >= 40 ? '#fbbf24' : '#fb7185'}"
                          stroke-width="6" stroke-linecap="round"
                          stroke-dasharray="${2 * Math.PI * 34}"
                          stroke-dashoffset="${2 * Math.PI * 34 * (1 - readiness.readiness / 100)}" />
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center font-heading font-bold text-lg ${readiness.readiness >= 70 ? 'text-emerald-400' : readiness.readiness >= 40 ? 'text-amber-400' : 'text-rose-400'}">${readiness.readiness}%</div>
                    </div>
                  </div>
                  ${readiness.strengths ? `<p class="text-emerald-400/70 text-xs mb-1.5">✅ ${esc(readiness.strengths)}</p>` : ''}
                  ${readiness.gaps ? `<p class="text-amber-400/70 text-xs">⚠️ ${esc(readiness.gaps)}</p>` : ''}
                </div>
              ` : ''}

              <!-- Summary Card -->
              <div class="glass p-5 animate-fade-in-up" style="animation-delay:0.15s;">
                <h4 class="font-heading font-semibold text-white/70 text-xs uppercase tracking-wider mb-3">📋 Summary</h4>
                <div class="space-y-2.5">
                  ${INTERVIEW_STEPS.map(s => {
            const answer = answers[s.id]?.trim();
            const fb = aiFeedback[s.id];
            return `
                      <div class="flex items-start gap-2 ${!answer ? 'opacity-30' : ''}">
                        <span class="text-xs shrink-0 mt-0.5">${s.icon}</span>
                        <div class="flex-1 min-w-0">
                          <div class="text-white/40 text-[10px] font-medium uppercase">${s.title} ${fb ? renderMiniQuality(fb.quality) : ''}</div>
                          ${answer ? `<div class="text-white/60 text-[11px] mt-0.5 line-clamp-2">${esc(answer)}</div>` : `<div class="text-white/20 text-[11px] italic">Not answered</div>`}
                        </div>
                      </div>
                    `;
        }).join('')}
                </div>

                ${canFinish ? `
                  <button id="validate-btn" class="btn-primary w-full mt-4 text-sm flex items-center justify-center gap-2 animate-pulse-glow">
                    <span>⚡</span> Validate This Idea
                  </button>
                ` : `
                  <div class="text-white/20 text-[10px] mt-3 text-center">Answer all required fields to validate</div>
                `}
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

        // --- Event Listeners ---
        bindEvents(step, isFirst, isLast);
    }

    function bindEvents(step, isFirst, isLast) {
        // Tab
        document.getElementById('tab-freeform')?.addEventListener('click', () => onSwitchToFreeform());

        // Step dots
        document.querySelectorAll('.interview-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                saveCurrentAnswer();
                currentStep = parseInt(dot.dataset.step);
                render();
            });
        });

        // Prev
        document.getElementById('prev-btn')?.addEventListener('click', () => {
            saveCurrentAnswer();
            if (currentStep > 0) { currentStep--; render(); }
        });

        // Next
        document.getElementById('next-btn')?.addEventListener('click', () => {
            saveCurrentAnswer();
            if (step.required && !answers[step.id]?.trim()) { shakeInput(); return; }
            if (currentStep < INTERVIEW_STEPS.length - 1) { currentStep++; render(); }
            triggerReadinessCheck();
        });

        // Skip
        document.getElementById('skip-btn')?.addEventListener('click', () => {
            saveCurrentAnswer();
            if (currentStep < INTERVIEW_STEPS.length - 1) { currentStep++; render(); }
        });

        // Validate
        document.getElementById('validate-btn')?.addEventListener('click', () => {
            saveCurrentAnswer();
            onComplete(compilePrompt(answers));
        });

        // AI Feedback
        document.getElementById('ai-feedback-btn')?.addEventListener('click', async () => {
            saveCurrentAnswer();
            const answer = answers[step.id]?.trim();
            if (!answer) { shakeInput(); return; }
            if (!keys.longcatKey) { showNoKeyMsg(); return; }

            isAILoading = true;
            render();

            const fb = await getAnswerFeedback(keys.longcatKey, step.title, step.question, answer, getContext());
            if (fb) aiFeedback[step.id] = fb;

            isAILoading = false;
            render();
        });

        // Brainstorm
        document.getElementById('ai-brainstorm-btn')?.addEventListener('click', async () => {
            if (!keys.longcatKey) { showNoKeyMsg(); return; }

            isAILoading = true;
            render();

            const result = await brainstormHelper(keys.longcatKey, step.title, step.question, step.hint, getContext());
            if (result) {
                // Show brainstorm as follow-ups panel
                aiFollowUps[step.id] = {
                    type: 'brainstorm',
                    think_about: result.think_about || [],
                    example: result.example_answer || '',
                };
            }

            isAILoading = false;
            render();
        });

        // Follow-up questions
        document.getElementById('ai-followup-btn')?.addEventListener('click', async () => {
            saveCurrentAnswer();
            if (!keys.longcatKey) { showNoKeyMsg(); return; }

            isAILoading = true;
            render();

            const result = await getFollowUpQuestions(keys.longcatKey, step.title, answers[step.id], getContext());
            if (result) {
                aiFollowUps[step.id] = { type: 'followup', questions: result.questions || [] };
            }

            isAILoading = false;
            render();
        });

        // Follow-up question click → insert into textarea
        document.querySelectorAll('.followup-q').forEach(el => {
            el.addEventListener('click', () => {
                const textarea = document.getElementById('answer-input');
                if (textarea) {
                    const q = el.dataset.question;
                    const curr = textarea.value.trim();
                    textarea.value = curr ? `${curr}\n\n${q}: ` : `${q}: `;
                    textarea.focus();
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }
            });
        });

        // Use example
        document.getElementById('use-example')?.addEventListener('click', () => {
            const textarea = document.getElementById('answer-input');
            const example = document.getElementById('use-example').dataset.example;
            if (textarea && example) {
                textarea.value = example;
                textarea.focus();
            }
        });

        // Textarea
        const textarea = document.getElementById('answer-input');
        if (textarea) {
            setTimeout(() => textarea.focus(), 200);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    const next = document.getElementById('next-btn');
                    if (next) next.click();
                    else document.getElementById('validate-btn')?.click();
                }
            });
        }
    }

    function showNoKeyMsg() {
        const el = document.createElement('div');
        el.className = 'fixed top-6 right-6 glass p-4 text-sm text-amber-400 animate-fade-in z-50';
        el.innerHTML = '⚠️ Enter your LongCat API key on the Free Text page first';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function saveCurrentAnswer() {
        const input = document.getElementById('answer-input');
        if (input) answers[INTERVIEW_STEPS[currentStep].id] = input.value;
    }

    function shakeInput() {
        const input = document.getElementById('answer-input');
        if (input) {
            input.style.animation = 'none';
            input.offsetHeight;
            input.style.animation = 'shake 0.4s ease';
            input.style.borderColor = 'rgba(244, 63, 94, 0.5)';
            setTimeout(() => { input.style.borderColor = ''; }, 2000);
        }
    }

    async function triggerReadinessCheck() {
        const filledCount = Object.values(answers).filter(v => v?.trim()).length;
        if (filledCount >= 3 && keys.longcatKey) {
            const result = await getReadinessScore(keys.longcatKey, answers);
            if (result) { readiness = result; render(); }
        }
    }

    // Start
    render();
}

// --- Render helpers ---

function renderQualityBadge(quality) {
    const colors = {
        1: 'bg-rose-500/20 text-rose-400',
        2: 'bg-amber-500/20 text-amber-400',
        3: 'bg-amber-500/20 text-amber-400',
        4: 'bg-emerald-500/20 text-emerald-400',
        5: 'bg-emerald-500/20 text-emerald-400',
    };
    const labels = { 1: 'Needs Work', 2: 'Basic', 3: 'Okay', 4: 'Good', 5: 'Excellent' };
    const cls = colors[quality] || colors[3];
    return `<span class="text-[10px] px-2.5 py-1 rounded-full font-medium ${cls}">${'★'.repeat(quality)} ${labels[quality] || ''}</span>`;
}

function renderMiniQuality(quality) {
    if (quality >= 4) return '<span class="text-emerald-400 text-[9px]">★</span>';
    if (quality >= 3) return '<span class="text-amber-400 text-[9px]">★</span>';
    return '<span class="text-rose-400 text-[9px]">★</span>';
}

function renderFeedbackPanel(fb) {
    return `
    <div class="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 animate-fade-in">
      <div class="space-y-2.5">
        ${fb.good ? `<div class="flex items-start gap-2"><span class="text-emerald-400 text-xs shrink-0">✅</span><span class="text-white/60 text-xs">${esc(fb.good)}</span></div>` : ''}
        ${fb.missing ? `<div class="flex items-start gap-2"><span class="text-amber-400 text-xs shrink-0">💡</span><span class="text-white/60 text-xs">${esc(fb.missing)}</span></div>` : ''}
        ${fb.suggestion ? `<div class="flex items-start gap-2"><span class="text-electric-400 text-xs shrink-0">📝</span><span class="text-white/50 text-xs italic">${esc(fb.suggestion)}</span></div>` : ''}
      </div>
    </div>
  `;
}

function renderFollowUps(data) {
    if (data.type === 'brainstorm') {
        return `
      <div class="glass p-5 animate-fade-in-up" style="animation-delay:0.1s;">
        <h4 class="font-heading font-semibold text-white/70 text-xs uppercase tracking-wider mb-3">🧠 Think About...</h4>
        <div class="space-y-2 mb-4">
          ${(data.think_about || []).map(q => `
            <div class="followup-q cursor-pointer p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-electric-500/30 hover:bg-white/[0.04] transition-all text-white/60 text-sm" data-question="${esc(q)}">
              🔸 ${esc(q)}
            </div>
          `).join('')}
        </div>
        ${data.example ? `
          <div class="pt-3 border-t border-white/5">
            <div class="text-white/30 text-[10px] uppercase tracking-wide mb-1.5">Example answer you can adapt:</div>
            <div class="text-white/50 text-xs italic leading-relaxed mb-2">"${esc(data.example)}"</div>
            <button id="use-example" class="text-electric-400 hover:text-electric-300 text-xs font-medium" data-example="${esc(data.example)}">📋 Use this as starting point</button>
          </div>
        ` : ''}
      </div>
    `;
    }

    if (data.type === 'followup' && data.questions?.length) {
        return `
      <div class="glass p-5 animate-fade-in-up" style="animation-delay:0.1s;">
        <h4 class="font-heading font-semibold text-white/70 text-xs uppercase tracking-wider mb-3">🔍 Dig Deeper — add these to your answer</h4>
        <div class="space-y-2">
          ${data.questions.map(q => `
            <div class="followup-q cursor-pointer p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-electric-500/30 hover:bg-white/[0.04] transition-all text-white/60 text-sm" data-question="${esc(q)}">
              ❓ ${esc(q)}
            </div>
          `).join('')}
        </div>
        <p class="text-white/20 text-[10px] mt-2">Click a question to add it to your answer</p>
      </div>
    `;
    }

    return '';
}

function compilePrompt(answers) {
    const sections = [
        ['problem', 'Problem'],
        ['audience', 'Target Users'],
        ['solution', 'Proposed Solution'],
        ['unique', 'Unique Value Proposition'],
        ['existing', 'Current Alternatives & Competitors'],
        ['revenue', 'Business Model & Pricing'],
        ['tech', 'Technology & Requirements'],
        ['traction', 'Traction & Validation So Far'],
    ];

    return sections
        .filter(([id]) => answers[id]?.trim())
        .map(([id, label]) => `## ${label}\n${answers[id].trim()}`)
        .join('\n\n');
}

function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
