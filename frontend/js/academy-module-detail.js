(function () {
  const els = {
    pageTitle: document.getElementById("academyModuleTitle"),
    pageSubtitle: document.getElementById("academyModuleSubtitle"),
    metaBar: document.getElementById("academyModuleMeta"),
    progressBar: document.getElementById("academyModuleProgressBar"),
    progressText: document.getElementById("academyModuleProgressText"),
    lessons: document.getElementById("academyModuleLessons"),
    quiz: document.getElementById("academyModuleQuiz"),
    scenarios: document.getElementById("academyModuleScenarios"),
    reflections: document.getElementById("academyModuleReflections"),
    workbooks: document.getElementById("academyModuleWorkbooks"),
    mappings: document.getElementById("academyModuleMappings"),
    error: document.getElementById("academyModuleError"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  async function apiGet(url) {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        (data && (data.detail || data.error)) || "Request failed."
      );
    }

    return data;
  }

  function renderMeta(module) {
    const parts = [
      module.code,
      module.module_family,
      module.learning_type,
      module.difficulty_level,
      module.delivery_mode,
      module.estimated_minutes ? `${module.estimated_minutes} mins` : "",
    ].filter(Boolean);

    return parts
      .map((part) => `<span class="academy-chip">${escapeHtml(part)}</span>`)
      .join("");
  }

  function renderLessons(lessons) {
    if (!Array.isArray(lessons) || !lessons.length) {
      return `<div class="academy-empty-state">No lesson content is available for this module yet.</div>`;
    }

    return lessons
      .map(
        (lesson) => `
          <article class="academy-detail-card">
            <div class="academy-detail-card__header">
              <h3>${escapeHtml(lesson.title || "Lesson")}</h3>
              <div class="academy-detail-card__meta">
                <span class="academy-chip">${escapeHtml(lesson.lesson_type || "lesson")}</span>
                ${
                  lesson.estimated_minutes
                    ? `<span class="academy-chip">${escapeHtml(
                        `${lesson.estimated_minutes} mins`
                      )}</span>`
                    : ""
                }
              </div>
            </div>
            <div class="academy-rich-text">
              ${lesson.content_html || "<p>No lesson content available.</p>"}
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderQuiz(quiz, quizQuestions) {
    if (!quiz) {
      return `<div class="academy-empty-state">No quiz is attached to this module yet.</div>`;
    }

    const questionHtml =
      Array.isArray(quizQuestions) && quizQuestions.length
        ? quizQuestions
            .map((question, index) => {
              const answers = Array.isArray(question.answers)
                ? question.answers
                : [];

              return `
                <article class="academy-detail-card">
                  <div class="academy-detail-card__header">
                    <h3>Question ${index + 1}</h3>
                  </div>
                  <p><strong>${escapeHtml(question.question_text || "")}</strong></p>
                  ${
                    question.explanation
                      ? `<p class="academy-muted">${escapeHtml(question.explanation)}</p>`
                      : ""
                  }
                  <div class="academy-stack" style="margin-top: 12px;">
                    ${answers
                      .map(
                        (answer) => `
                          <div class="academy-answer-option ${
                            answer.is_correct ? "academy-answer-option--correct" : ""
                          }">
                            ${escapeHtml(answer.answer_text || "")}
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                </article>
              `;
            })
            .join("")
        : `<div class="academy-empty-state">Quiz created, but no questions are attached yet.</div>`;

    return `
      <div class="academy-detail-card">
        <div class="academy-detail-card__header">
          <h3>${escapeHtml(quiz.title || "Quiz")}</h3>
          <div class="academy-detail-card__meta">
            <span class="academy-chip">Pass mark: ${escapeHtml(
              String(quiz.pass_mark_percent ?? 0)
            )}%</span>
            <span class="academy-chip">Max attempts: ${escapeHtml(
              String(quiz.max_attempts ?? 0)
            )}</span>
          </div>
        </div>
      </div>
      <div class="academy-stack" style="margin-top: 16px;">
        ${questionHtml}
      </div>
    `;
  }

  function renderScenarios(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="academy-empty-state">No scenarios are attached to this module.</div>`;
    }

    return items
      .map(
        (item) => `
          <article class="academy-detail-card">
            <div class="academy-detail-card__header">
              <h3>${escapeHtml(item.title || "Scenario")}</h3>
            </div>
            <div class="academy-rich-text">
              <p>${escapeHtml(item.scenario_text || "")}</p>
              ${
                item.expected_response_guidance
                  ? `<h4>Expected response guidance</h4><p>${escapeHtml(
                      item.expected_response_guidance
                    )}</p>`
                  : ""
              }
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderReflections(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="academy-empty-state">No reflective prompts are attached to this module.</div>`;
    }

    return items
      .map(
        (item) => `
          <article class="academy-detail-card">
            <div class="academy-detail-card__header">
              <h3>Reflection prompt</h3>
            </div>
            <p><strong>${escapeHtml(item.prompt_text || "")}</strong></p>
            ${
              item.guidance_text
                ? `<p class="academy-muted">${escapeHtml(item.guidance_text)}</p>`
                : ""
            }
          </article>
        `
      )
      .join("");
  }

  function renderWorkbooks(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="academy-empty-state">No workbooks are linked to this module.</div>`;
    }

    return items
      .map(
        (item) => `
          <article class="academy-detail-card">
            <div class="academy-detail-card__header">
              <h3>${escapeHtml(item.title || "Workbook")}</h3>
            </div>
            <div class="academy-detail-card__meta">
              <span class="academy-chip">${escapeHtml(item.code || "")}</span>
              <span class="academy-chip">${escapeHtml(item.workbook_type || "")}</span>
            </div>
            <div style="margin-top: 12px;">
              <a class="academy-button academy-button--secondary" href="/academy/workbook-detail.html?workbook_id=${encodeURIComponent(
                item.id
              )}">
                Open workbook
              </a>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderMappings(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="academy-empty-state">No standards mappings are attached to this module.</div>`;
    }

    return items
      .map(
        (item) => `
          <article class="academy-detail-card">
            <div class="academy-detail-card__header">
              <h3>${escapeHtml(item.framework_name || "Framework")}</h3>
            </div>
            <p><strong>${escapeHtml(item.framework_item_code || "")}</strong> — ${escapeHtml(
              item.framework_item_name || ""
            )}</p>
            ${
              item.item_short_label
                ? `<p class="academy-muted">${escapeHtml(item.item_short_label)}</p>`
                : ""
            }
            ${
              item.mapping_note
                ? `<p>${escapeHtml(item.mapping_note)}</p>`
                : ""
            }
          </article>
        `
      )
      .join("");
  }

  function renderProgress(status, percent) {
    const safePercent = Number(percent || 0);
    const safeStatus = status || "not_started";

    if (els.progressBar) {
      els.progressBar.style.width = `${Math.max(0, Math.min(100, safePercent))}%`;
    }

    if (els.progressText) {
      els.progressText.textContent = `${safeStatus.replaceAll("_", " ")} • ${safePercent}%`;
    }
  }

  function renderModule(payload) {
    if (els.pageTitle) {
      els.pageTitle.textContent = payload.title || "Module";
    }

    if (els.pageSubtitle) {
      els.pageSubtitle.textContent = payload.summary || payload.description || "";
    }

    if (els.metaBar) {
      els.metaBar.innerHTML = renderMeta(payload);
    }

    renderProgress(payload.progress_status, payload.progress_percent);

    if (els.lessons) {
      els.lessons.innerHTML = renderLessons(payload.lessons || []);
    }

    if (els.quiz) {
      els.quiz.innerHTML = renderQuiz(payload.quiz, payload.quiz_questions || []);
    }

    if (els.scenarios) {
      els.scenarios.innerHTML = renderScenarios(payload.scenarios || []);
    }

    if (els.reflections) {
      els.reflections.innerHTML = renderReflections(payload.reflections || []);
    }

    if (els.workbooks) {
      els.workbooks.innerHTML = renderWorkbooks(payload.workbooks || []);
    }

    if (els.mappings) {
      els.mappings.innerHTML = renderMappings(payload.mappings || []);
    }
  }

  async function init() {
    const moduleId = getQueryParam("id");

    if (!moduleId) {
      if (els.error) {
        els.error.innerHTML =
          '<div class="academy-empty-state">No module id was provided.</div>';
      }
      return;
    }

    try {
      const result = await apiGet(`/academy/modules/${encodeURIComponent(moduleId)}`);
      const payload = result && result.data ? result.data : null;

      if (!payload) {
        throw new Error("No module payload returned.");
      }

      renderModule(payload);
    } catch (error) {
      console.error("[academy-module-detail] failed to load module", error);
      if (els.error) {
        els.error.innerHTML = `<div class="academy-empty-state">${escapeHtml(
          error.message || "Failed to load module."
        )}</div>`;
      }
    }
  }

  init();
})();
