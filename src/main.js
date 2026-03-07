/**
 * StartupValidator — Main Entry Point (10X Enhanced)
 * Orchestrates: Landing → Research → Analysis → Results
 */
import './style.css';
import { renderLanding } from './views/landing.js';
import { renderResults, renderLoading, updateLoadingStep, updateResearchProgress } from './views/results.js';
import { searchCompetitors, formatResearchForPrompt } from './services/tavily.js';
import { analyzeIdea } from './services/ai.js';
import { saveAnalysis, getAnalysis } from './services/storage.js';

const app = document.getElementById('app');

// --- State ---
let currentView = 'landing';

// --- Router ---
function showLanding() {
    currentView = 'landing';
    renderLanding(app, {
        onSubmit: handleSubmit,
        onLoadAnalysis: handleLoadAnalysis,
    });
}

function showResults(data) {
    currentView = 'results';
    renderResults(app, {
        result: data.result,
        tavilyData: data.tavilyData,
        idea: data.idea,
        onBack: showLanding,
    });
}

// --- Handlers ---
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
            tavilyData: entry.tavilyResults, // backwards compat with old saves
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
    document.getElementById('error-back').addEventListener('click', showLanding);
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
