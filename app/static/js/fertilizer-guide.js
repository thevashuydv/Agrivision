// Fertilizer Guide Functionality
document.addEventListener('DOMContentLoaded', () => {
  const fertilizerForm = document.getElementById('fertilizerForm');
  const fertilizerStatus = document.getElementById('fertilizerStatus');
  const fertilizerResult = document.getElementById('fertilizerResult');

  function show(el) {
    el.classList.remove('hidden');
  }

  function hide(el) {
    el.classList.add('hidden');
  }

  if (fertilizerForm) {
    fertilizerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Get form data
      const formData = {
        temperature: parseFloat(document.getElementById('temperature').value),
        humidity: parseFloat(document.getElementById('humidity').value),
        moisture: parseFloat(document.getElementById('moisture').value),
        soilType: document.getElementById('soilType').value,
        cropType: document.getElementById('cropType').value.trim(),
        nitrogen: parseFloat(document.getElementById('nitrogen').value),
        phosphorous: parseFloat(document.getElementById('phosphorous').value)
      };

      // Validate form data
      if (!formData.cropType || formData.cropType === '') {
        alert('Please fill in the Crop Type field.');
        document.getElementById('cropType').focus();
        return;
      }

      // Show loading status
      hide(fertilizerResult);
      show(fertilizerStatus);

      try {
        // Make API call
        const response = await fetch('/api/fertilizer-recommendation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok && data.recommendation) {
          hide(fertilizerStatus);
          renderFertilizerResult(data.recommendation, formData);
          show(fertilizerResult);
        } else {
          hide(fertilizerStatus);
          fertilizerResult.innerHTML = `
            <div class="error">
              <p>Error: ${data.message || data.error || 'Failed to get fertilizer recommendations'}</p>
            </div>
          `;
          show(fertilizerResult);
        }
      } catch (error) {
        hide(fertilizerStatus);
        fertilizerResult.innerHTML = `
          <div class="error">
            <p>Network or server error. Please check your connection and try again.</p>
            <p style="font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</p>
          </div>
        `;
        show(fertilizerResult);
      }
    });
  }

  function renderFertilizerResult(recommendation, formData) {
    // Format the recommendation text with comprehensive parsing
    let formattedRecommendation = recommendation;

    // Remove any leading/trailing whitespace
    formattedRecommendation = formattedRecommendation.trim();

    // Escape HTML to prevent XSS (but markdown uses *, #, not < >, so it's safe)
    // We'll do basic escaping for any raw HTML that might be in the text
    formattedRecommendation = formattedRecommendation
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Handle horizontal rules first (before other processing)
    formattedRecommendation = formattedRecommendation.replace(/^---\s*$/gm, '<hr class="fertilizer-hr">');

    // Handle markdown-style headers (###, ##, #) - must be before bold processing
    formattedRecommendation = formattedRecommendation
      .replace(/^###\s+(.+)$/gm, '<h4 class="fertilizer-h4">$1</h4>')
      .replace(/^##\s+(.+)$/gm, '<h3 class="fertilizer-h3">$1</h3>')
      .replace(/^#\s+(.+)$/gm, '<h2 class="fertilizer-h2">$1</h2>');

    // Handle bold text (**text**) - must be before bullet point processing
    formattedRecommendation = formattedRecommendation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle italic text (*text*) - but not if it's part of ** or a bullet point
    formattedRecommendation = formattedRecommendation.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');

    // Split by double newlines to get sections
    let sections = formattedRecommendation.split(/\n\n+/);
    
    let processedSections = [];
    
    for (let section of sections) {
      section = section.trim();
      if (!section) continue;
      
      // Check if it's a header or HR
      if (section.match(/^<h[234]|^<hr/)) {
        processedSections.push(section);
        continue;
      }
      
      // Check if section contains bullet points or numbered lists
      const lines = section.split('\n');
      let inList = false;
      let listItems = [];
      let otherLines = [];
      
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Check for bullet points (*, -, •)
        if (line.match(/^[\*\-\•]\s+/)) {
          if (!inList && listItems.length === 0) {
            inList = true;
          }
          const itemText = line.replace(/^[\*\-\•]\s+/, '');
          listItems.push('<li>' + itemText + '</li>');
        }
        // Check for numbered lists (1., 2., etc.)
        else if (line.match(/^\d+\.\s+/)) {
          if (!inList && listItems.length === 0) {
            inList = true;
          }
          const itemText = line.replace(/^\d+\.\s+/, '');
          listItems.push('<li class="numbered">' + itemText + '</li>');
        }
        else {
          // If we were in a list, close it
          if (inList && listItems.length > 0) {
            processedSections.push('<ul class="fertilizer-list">' + listItems.join('') + '</ul>');
            listItems = [];
            inList = false;
          }
          otherLines.push(line);
        }
      }
      
      // Close any remaining list
      if (inList && listItems.length > 0) {
        processedSections.push('<ul class="fertilizer-list">' + listItems.join('') + '</ul>');
      }
      
      // Process other lines as paragraphs
      for (let line of otherLines) {
        if (line.trim()) {
          // Replace single newlines with <br> within the line
          line = line.replace(/\n/g, '<br>');
          processedSections.push('<p class="fertilizer-paragraph">' + line + '</p>');
        }
      }
    }
    
    formattedRecommendation = processedSections.join('\n');

    const html = `
      <div class="fertilizer-result-card">
        <div class="fertilizer-result-header">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3>Fertilizer Recommendations</h3>
        </div>
        <div class="fertilizer-result-content">
          <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f0fdf4; border-radius: 0.75rem; border-left: 4px solid #059669;">
            <strong>Input Summary:</strong>
            <ul style="margin-top: 0.5rem; margin-bottom: 0;">
              <li>Crop Type: <strong>${escapeHtml(formData.cropType)}</strong></li>
              <li>Soil Type: <strong>${escapeHtml(formData.soilType)}</strong></li>
              <li>Temperature: <strong>${formData.temperature}°C</strong></li>
              <li>Humidity: <strong>${formData.humidity}%</strong></li>
              <li>Moisture: <strong>${formData.moisture}%</strong></li>
              <li>Nitrogen: <strong>${formData.nitrogen} kg/ha</strong></li>
              <li>Phosphorous: <strong>${formData.phosphorous} kg/ha</strong></li>
            </ul>
          </div>
          <div>
            ${formattedRecommendation}
          </div>
        </div>
      </div>
    `;

    fertilizerResult.innerHTML = html;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});

