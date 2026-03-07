/**
 * Guided Interview View
 * Step-by-step wizard that asks targeted questions to build a comprehensive startup idea description.
 * Designed for users who don't know how to write a good prompt.
 */
import { loadKeys } from '../services/storage.js';

// The interview steps — each builds on the previous to create a complete picture
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
        hint: 'Describe what the product does, not how it\'s built. Focus on the user experience.',
        placeholder: 'e.g., An AI tool that generates a full week of brand-consistent social media posts in 5 minutes, learning from your past content and audience engagement data...',
        required: true,
    },
    {
        id: 'unique',
        icon: '✨',
        title: 'What Makes It Different',
        question: 'Why would someone choose your solution over existing alternatives?',
        hint: 'What\'s your unique angle? Cheaper? Faster? Better for a specific niche? New technology?',
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
        hint: 'Talked to potential users? Built a prototype? Have a waitlist? Survey results? This is optional.',
        placeholder: 'e.g., Talked to 15 small business owners — 12 said they\'d pay for this. Built a landing page, got 200 signups in 2 weeks. Currently doing it manually for 3 beta users...',
        required: false,
    },
];

export function renderInterview(app, { onComplete, onSwitchToFreeform }) {
    const keys = loadKeys();

    // State
    let currentStep = 0;
    let answers = {};

    function render() {
        const step = INTERVIEW_STEPS[currentStep];
        const isFirst = currentStep === 0;
        const isLast = currentStep === INTERVIEW_STEPS.length - 1;
        const progress = ((currentStep + 1) / INTERVIEW_STEPS.length) * 100;

        // Count answered required questions
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

        <main class="flex-1 flex flex-col items-center pt-6 md:pt-12 pb-20 px-6 md:px-10 max-w-2xl mx-auto">
          <!-- Progress -->
          <div class="w-full mb-8 animate-fade-in">
            <div class="flex items-center justify-between mb-3">
              <span class="text-white/40 text-xs font-medium">Step ${currentStep + 1} of ${INTERVIEW_STEPS.length}</span>
              <span class="text-white/40 text-xs">${Math.round(progress)}% complete</span>
            </div>
            <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-electric-500 to-electric-400 rounded-full transition-all duration-500 ease-out" style="width: ${progress}%"></div>
            </div>
            <!-- Step dots -->
            <div class="flex justify-between mt-3">
              ${INTERVIEW_STEPS.map((s, i) => {
            const filled = answers[s.id]?.trim();
            const active = i === currentStep;
            let dotClass = 'bg-white/10';
            if (active) dotClass = 'bg-electric-500 ring-2 ring-electric-500/30';
            else if (filled) dotClass = 'bg-emerald-500';
            return `<button class="interview-dot w-7 h-7 rounded-full ${dotClass} flex items-center justify-center text-xs transition-all duration-300" data-step="${i}" title="${s.title}">
                  ${filled && !active ? '✓' : s.icon}
                </button>`;
        }).join('')}
            </div>
          </div>

          <!-- Question Card -->
          <div class="glass w-full p-6 md:p-8 animate-fade-in-up" style="animation-delay: 0.1s;">
            <div class="flex items-center gap-3 mb-5">
              <span class="text-3xl">${step.icon}</span>
              <div>
                <h2 class="font-heading text-xl md:text-2xl font-bold text-white">${step.title}</h2>
                ${step.required ? '<span class="text-rose-400 text-xs">Required</span>' : '<span class="text-white/30 text-xs">Optional</span>'}
              </div>
            </div>

            <p class="text-white/70 text-base mb-2 font-medium">${step.question}</p>
            <p class="text-white/35 text-sm mb-5">${step.hint}</p>

            <textarea
              id="answer-input"
              class="input-field"
              placeholder="${step.placeholder}"
              rows="5"
            >${answers[step.id] || ''}</textarea>

            <!-- Navigation -->
            <div class="flex items-center justify-between mt-5">
              <button id="prev-btn" class="btn-secondary ${isFirst ? 'opacity-30 pointer-events-none' : ''}">
                ← Back
              </button>
              <div class="flex items-center gap-3">
                ${!isLast ? `
                  ${!step.required || answers[step.id]?.trim() ? `
                    <button id="skip-btn" class="text-white/30 hover:text-white/50 text-sm transition-colors">
                      ${answers[step.id]?.trim() ? '' : 'Skip →'}
                    </button>
                  ` : ''}
                  <button id="next-btn" class="btn-primary">
                    Next →
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Summary / Finish Section -->
          ${isLast || canFinish ? `
            <div class="w-full mt-8 animate-fade-in-up" style="animation-delay: 0.2s;">
              <div class="glass p-6 md:p-8">
                <h3 class="font-heading font-semibold text-white/80 text-lg mb-4">📋 Your Idea Summary</h3>
                <div class="space-y-3 mb-6">
                  ${INTERVIEW_STEPS.map(s => {
            const answer = answers[s.id]?.trim();
            if (!answer) return '';
            return `
                      <div class="flex items-start gap-3">
                        <span class="text-sm shrink-0 mt-0.5">${s.icon}</span>
                        <div>
                          <div class="text-white/40 text-xs font-medium uppercase tracking-wide">${s.title}</div>
                          <div class="text-white/70 text-sm mt-0.5">${escapeHtml(answer.substring(0, 200))}${answer.length > 200 ? '...' : ''}</div>
                        </div>
                      </div>
                    `;
        }).join('')}
                </div>
                ${!canFinish ? `
                  <div class="text-amber-400/70 text-sm mb-4">
                    ⚠️ Please answer all required questions (marked with <span class="text-rose-400">Required</span>) before validating.
                  </div>
                ` : `
                  <button id="validate-btn" class="btn-primary w-full text-center flex items-center justify-center gap-2.5 animate-pulse-glow">
                    <span>⚡</span>
                    <span>Validate This Idea</span>
                  </button>
                `}
              </div>
            </div>
          ` : ''}
        </main>
      </div>
    `;

        // --- Event Listeners ---

        // Tab switch
        document.getElementById('tab-freeform')?.addEventListener('click', () => {
            onSwitchToFreeform();
        });

        // Step dots — jump to any step
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
            if (currentStep > 0) {
                currentStep--;
                render();
            }
        });

        // Next
        document.getElementById('next-btn')?.addEventListener('click', () => {
            saveCurrentAnswer();
            const step = INTERVIEW_STEPS[currentStep];
            const answer = document.getElementById('answer-input').value.trim();

            if (step.required && !answer) {
                shakeInput();
                return;
            }
            if (currentStep < INTERVIEW_STEPS.length - 1) {
                currentStep++;
                render();
            }
        });

        // Skip
        document.getElementById('skip-btn')?.addEventListener('click', () => {
            saveCurrentAnswer();
            if (currentStep < INTERVIEW_STEPS.length - 1) {
                currentStep++;
                render();
            }
        });

        // Validate — compile answers and send to analysis
        document.getElementById('validate-btn')?.addEventListener('click', () => {
            saveCurrentAnswer();
            const compiledPrompt = compilePrompt(answers);
            onComplete(compiledPrompt);
        });

        // Auto-focus textarea
        const textarea = document.getElementById('answer-input');
        if (textarea) {
            setTimeout(() => textarea.focus(), 300);

            // Enter key on non-required fields to advance
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    const nextBtn = document.getElementById('next-btn');
                    if (nextBtn) nextBtn.click();
                    else {
                        const valBtn = document.getElementById('validate-btn');
                        if (valBtn) valBtn.click();
                    }
                }
            });
        }
    }

    function saveCurrentAnswer() {
        const input = document.getElementById('answer-input');
        if (input) {
            answers[INTERVIEW_STEPS[currentStep].id] = input.value;
        }
    }

    function shakeInput() {
        const input = document.getElementById('answer-input');
        if (input) {
            input.style.animation = 'none';
            input.offsetHeight; // force reflow
            input.style.animation = 'shake 0.4s ease';
            input.style.borderColor = 'rgba(244, 63, 94, 0.5)';
            setTimeout(() => {
                input.style.borderColor = '';
            }, 2000);
        }
    }

    // Start
    render();
}

/**
 * Compile all interview answers into a rich, structured prompt
 */
function compilePrompt(answers) {
    let prompt = '';

    if (answers.problem) {
        prompt += `## Problem\n${answers.problem}\n\n`;
    }
    if (answers.audience) {
        prompt += `## Target Users\n${answers.audience}\n\n`;
    }
    if (answers.solution) {
        prompt += `## Proposed Solution\n${answers.solution}\n\n`;
    }
    if (answers.unique) {
        prompt += `## Unique Value Proposition\n${answers.unique}\n\n`;
    }
    if (answers.existing) {
        prompt += `## Current Alternatives & Competitors\n${answers.existing}\n\n`;
    }
    if (answers.revenue) {
        prompt += `## Business Model & Pricing\n${answers.revenue}\n\n`;
    }
    if (answers.tech) {
        prompt += `## Technology & Requirements\n${answers.tech}\n\n`;
    }
    if (answers.traction) {
        prompt += `## Traction & Validation So Far\n${answers.traction}\n\n`;
    }

    return prompt.trim();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
