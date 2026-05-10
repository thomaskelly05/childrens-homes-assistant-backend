import React from 'react';

export default function AssistantResponseCard({ response }) {
  if (!response) return null;

  const sections = response.split('##').map(s => s.trim()).filter(Boolean);

  return (
    <div className="ai-card">
      {sections.map((section, i) => {
        const [title, ...content] = section.split('\n');
        return (
          <div key={i} className="ai-section">
            <h3>{title}</h3>
            <div>
              {content.join('\n').split('\n').map((line, idx) => (
                <p key={idx}>
                  {line.replace(/\[(.*?)\]/g, (match) => {
                    return `<span class='citation'>${match}</span>`;
                  })}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
