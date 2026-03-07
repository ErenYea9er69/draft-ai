/**
 * StartupValidator — Main Entry Point (10X Enhanced)
 * Orchestrates: Landing | Interview → Research → Analysis → Results
 */
import './style.css';
import { renderLanding } from './views/landing.js';
import { renderInterview } from './views/interview.js';
import { renderResults, renderLoading, updateLoadingStep, updateResearchProgress } from './views/results.js';
import { searchCompetitors, formatResearchForPrompt } from './services/tavily.js';
import { analyzeIdea } from './services/ai.js';
import { saveAnalysis, getAnalysis, loadKeys, saveKeys } from './services/storage.js';

const app = document.getElementById('app');

// --- State ---
let currentView = 'landing';

// --- Router ---
function showLanding(prefillIdea) {
    currentView = 'landing';
    renderLanding(app, {
        onSubmit: handleSubmit,
        onLoadAnalysis: handleLoadAnalysis,
        onSwitchToGuided: showInterview,
        prefillIdea: prefillIdea || '',
    });
}

function showInterview() {
    currentView = 'interview';
    renderInterview(app, {
        onComplete: handleInterviewComplete,
        onSwitchToFreeform: () => showLanding(),
    });
}

function showResults(data) {
    currentView = 'results';
    renderResults(app, {
        result: data.result,
        tavilyData: data.tavilyData,
        idea: data.idea,
        onBack: () => showLanding(),
    });
}

// --- Handlers ---

/**
 * When the guided interview is done, send the compiled prompt
 * back to the freeform landing page pre-filled, so the user can review & submit.
 */
function handleInterviewComplete(compiledPrompt) {
    // Switch to landing with the compiled prompt pre-filled
    showLanding(compiledPrompt);

    // Brief delay then scroll to the submit button and flash it
    setTimeout(() => {
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            submitBtn.classList.add('animate-pulse-glow');
        }
        // Also flash a hint message
        const ideaInput = document.getElementById('idea-input');
        if (ideaInput) {
            ideaInput.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            ideaInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
            setTimeout(() => {
                ideaInput.style.borderColor = '';
                ideaInput.style.boxShadow = '';
            }, 3000);
        }
    }, 400);
}

async function handleSubmit({ idea, longcatKey, tavilyKey }) {
    currentView = 'loading';
    renderLoading(app);

    try {
        // Step 1: Live research with Tavily (7 strategies)
        updateLoadingStep('step-research');
        const tavilyData = await searchCompetitors(idea, tavilyKey, (progress) => {
            updateResearchProgress(progress);
        });
        const researchData = formatResearchForPrompt(tavilyData);

        // Step 2: Deep AI Analysis with LongCat Thinking
        updateLoadingStep('step-analysis');
        const result = await analyzeIdea(idea, researchData, longcatKey);

        // Step 3: Scoring complete
        updateLoadingStep('step-scoring');
        await sleep(600);

        // Save to history
        saveAnalysis(idea, result, tavilyData);

        // Show results
        showResults({ result, tavilyData, idea });

    } catch (error) {
        console.error('Analysis failed:', error);
        renderError(error.message);
    }
}

function handleLoadAnalysis(id) {
    const entry = getAnalysis(id);
    if (entry) {
        showResults({
            result: entry.result,
            tavilyData: entry.tavilyResults,
            idea: entry.fullIdea,
        });
    }
}

function renderError(message) {
    app.innerHTML = `
    <div class="bg-grid min-h-screen flex items-center justify-center">
      <div class="glass max-w-lg w-full mx-6 p-8 text-center animate-fade-in">
        <div class="text-5xl mb-4">😵</div>
        <h2 class="font-heading text-xl font-bold text-white mb-3">Analysis Failed</h2>
        <p class="text-white/50 text-sm mb-6 leading-relaxed">${escapeHtml(message)}</p>
        <div class="flex gap-3 justify-center">
          <button id="error-back" class="btn-primary">← Try Again</button>
        </div>
        <p class="text-white/20 text-xs mt-4">Tip: Check your API keys and try again. LongCat and Tavily both have free tiers.</p>
      </div>
    </div>
  `;
    document.getElementById('error-back').addEventListener('click', () => showLanding());
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Init ---
showLanding();
