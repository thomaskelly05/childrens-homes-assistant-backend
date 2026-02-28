import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import WelcomeModal from "../components/WelcomeModal";
import AssistantPanel from "../components/AssistantPanel";
import JournalTextArea from "../components/JournalTextArea";
import { loadJournal, saveJournal } from "../api/journal";

export default function TodayPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [holding, setHolding] = useState("");
  const [practice, setPractice] = useState("");
  const [reflection, setReflection] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    loadJournal(token).then((data) => {
      setHolding(data.holding_today || "");
      setPractice(data.practice_today || "");
      setReflection(data.reflection_today || "");
    });
  }, []);

  useEffect(() => {
    const payload = {
      holding_today: holding,
      practice_today: practice,
      reflection_today: reflection,
    };
    saveJournal(token, payload);
  }, [holding, practice, reflection]);

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}

        <section className="section grounding">
          <h1>Today</h1>
          <div className="card">
            <p><strong>Take a moment to arrive.</strong></p>
            <p>
              Notice how you’re feeling as you step into today. There’s no rush here —
              this space is designed to support your thinking, your practice, and your wellbeing.
            </p>
          </div>
        </section>

        <section className="section preparation">
          <JournalTextArea
            label="What I’m holding today…"
            value={holding}
            onChange={setHolding}
            placeholder="Anything you want to keep in mind as you move through the day."
          />

          <JournalTextArea
            label="What I want to bring into my practice…"
            value={practice}
            onChange={setPractice}
            placeholder="For example: patience, curiosity, steadiness, clear boundaries."
          />
        </section>

        <section className="section reflection">
          <JournalTextArea
            label="What I want to remember from today…"
            value={reflection}
            onChange={setReflection}
            placeholder={
              "What challenged me?\nWhat helped me stay regulated?\nWhat do I want to carry into tomorrow?"
            }
          />
        </section>
      </main>

      <AssistantPanel />
    </div>
  );
}
