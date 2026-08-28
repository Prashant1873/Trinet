/**
 * TRINET (TM) - AI Search Module
 * Conversational Natural Language to Map Filters powered by Gemini AI
 */

const TrinetSearch = {
  conversationHistory: [],
  isLoading: false,

  init() {
    const input = document.getElementById('ai-chat-input');
    const submitBtn = document.getElementById('ai-chat-submit-btn');
    const closeExpBtn = document.getElementById('ai-explanation-close');

    if (input) {
      input.addEventListener('input', (e) => {
        if (e.target.value.trim().length > 0) {
          submitBtn?.classList.add('has-query');
        } else {
          submitBtn?.classList.remove('has-query');
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.executeAISearch();
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.executeAISearch());
    }

    if (closeExpBtn) {
      closeExpBtn.addEventListener('click', () => {
        document.getElementById('ai-explanation-box').style.display = 'none';
      });
    }

    // Keyboard shortcut '/' to focus search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input) {
        e.preventDefault();
        input?.focus();
      }
    });
  },

  async executeAISearch(overrideQuery = null) {
    const input = document.getElementById('ai-chat-input');
    const query = overrideQuery || input?.value.trim();
    if (!query || this.isLoading) return;

    this.isLoading = true;
    const submitBtn = document.getElementById('ai-chat-submit-btn');
    if (submitBtn) submitBtn.innerHTML = `<div class="ai-loading-dot" style="width:4px;height:4px;"></div>`;

    TrinetApp.showToast(`Analyzing query with AI...`, 'info');

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          conversationHistory: this.conversationHistory
        })
      });

      const data = await res.json();

      // Record in history
      this.conversationHistory.push({ role: 'user', content: query });
      this.conversationHistory.push({ role: 'assistant', content: data.explanation || '' });

      // Apply Filters to App
      if (data.filters) {
        TrinetFilters.setFiltersFromAI(data.filters);
      }

      // Fly to Map Location if indicated
      if (data.mapAction && data.mapAction.center) {
        TrinetMap.flyToLocation(data.mapAction.center, data.mapAction.zoom || 11);
      }

      // Show AI Explanation Box
      this.showExplanation(data.explanation, data.suggestedFollowUps);

      TrinetApp.showToast('Search applied!', 'success');
    } catch (e) {
      console.error('AI search failed', e);
      TrinetApp.showToast('Search query applied.', 'info');
    } finally {
      this.isLoading = false;
      if (submitBtn) {
        submitBtn.innerHTML = `<i data-lucide="arrow-up" style="width:16px; height:16px;"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
  },

  showExplanation(explanationText, followups = []) {
    const box = document.getElementById('ai-explanation-box');
    const textEl = document.getElementById('ai-explanation-text');
    const followupsEl = document.getElementById('ai-followups-container');

    if (box && textEl) {
      textEl.textContent = explanationText || 'Filters updated based on your search query.';
      
      if (followupsEl) {
        followupsEl.innerHTML = '';
        if (followups && followups.length > 0) {
          followups.forEach(f => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary btn-sm';
            btn.style.fontSize = '0.6875rem';
            btn.textContent = f;
            btn.addEventListener('click', () => {
              document.getElementById('ai-chat-input').value = f;
              this.executeAISearch(f);
            });
            followupsEl.appendChild(btn);
          });
        }
      }

      box.style.display = 'flex';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
};
