import React, { useState } from 'react'

const TOOLKIT_SECTIONS = [
  {
    id: 'what-is-advocacy',
    title: 'What is patient advocacy?',
    body: (
      <>
        <p>
          Patient advocacy means speaking up for patients’ needs — better access to care, clearer
          information, fairer policies, and a stronger voice in decisions that affect health.
        </p>
        <p className="mb-0">
          SPAN (Students for Patient Advocacy Nationwide) trains students to research policy, build
          coalitions, and take action. Classroom mode gives you practice tools without joining the
          national chapter directory.
        </p>
      </>
    ),
  },
  {
    id: 'research-bills',
    title: 'How to research a bill',
    body: (
      <>
        <ol className="mb-2">
          <li>Pick a state and topic (or a bill number if your teacher gave you one).</li>
          <li>
            Use <strong>LegiScan bill search</strong> on this page to find matching legislation.
          </li>
          <li>Read the title, description, sponsors, status, and recent history.</li>
          <li>Note who could be affected and what the bill would change.</li>
          <li>Capture sources (LegiScan link, date you checked) for your assignment.</li>
        </ol>
        <p className="mb-0 small text-muted">
          Tip: keywords like “Medicaid”, “mental health”, or “prescription” often surface relevant
          health bills.
        </p>
      </>
    ),
  },
  {
    id: 'write-officials',
    title: 'Writing to elected officials',
    body: (
      <>
        <p>Keep it short, respectful, and specific:</p>
        <ul>
          <li>
            <strong>Who you are</strong> — student / constituent, school, city (no private medical
            details you don’t want public).
          </li>
          <li>
            <strong>The ask</strong> — support, oppose, or amend a named bill.
          </li>
          <li>
            <strong>Why it matters</strong> — one or two concrete impacts, with a source if you can.
          </li>
          <li>
            <strong>Thank them</strong> — invite a reply and leave contact info if appropriate.
          </li>
        </ul>
        <p className="mb-0 small text-muted">
          Your teacher may ask you to submit a draft letter as an assignment — use comments or a file
          upload there.
        </p>
      </>
    ),
  },
  {
    id: 'classroom-to-action',
    title: 'From classroom to real action',
    body: (
      <>
        <p>
          Assignments here are for learning. If you want to go further with SPAN’s national work —
          chapters, bill campaigns, volunteer hours — talk to your teacher or explore SPAN’s public
          site.
        </p>
        <ul className="mb-0">
          <li>
            <a href="/bills.html" target="_blank" rel="noopener noreferrer">
              SPAN Bills
            </a>{' '}
            — public positions SPAN has taken
          </li>
          <li>
            <a href="/our-story.html" target="_blank" rel="noopener noreferrer">
              Our Story
            </a>{' '}
            — mission and background
          </li>
          <li>
            <a href="/directory.html" target="_blank" rel="noopener noreferrer">
              Directory
            </a>{' '}
            — chapter leadership (public)
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'classroom-etiquette',
    title: 'Classroom expectations',
    body: (
      <>
        <ul className="mb-0">
          <li>Use your school email and keep passwords private.</li>
          <li>Don’t share other students’ contact info outside class.</li>
          <li>Cite sources when you use LegiScan or news articles.</li>
          <li>Follow your teacher’s rules for collaboration and late work.</li>
        </ul>
      </>
    ),
  },
]

export default function ClassroomPolicyToolkit() {
  const [openId, setOpenId] = useState(TOOLKIT_SECTIONS[0].id)

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-white">
        <h5 className="mb-0">Policy toolkit</h5>
      </div>
      <div className="card-body">
        <p className="small text-muted mb-3">
          Short guides for researching health policy and advocating respectfully. Expand a topic to
          read more.
        </p>
        <div className="accordion" id="classroom-policy-toolkit">
          {TOOLKIT_SECTIONS.map((section) => {
            const isOpen = openId === section.id
            return (
              <div className="accordion-item" key={section.id}>
                <h2 className="accordion-header">
                  <button
                    type="button"
                    className={`accordion-button${isOpen ? '' : ' collapsed'}`}
                    onClick={() => setOpenId(isOpen ? '' : section.id)}
                    aria-expanded={isOpen}
                  >
                    {section.title}
                  </button>
                </h2>
                {isOpen && (
                  <div className="accordion-collapse show">
                    <div className="accordion-body small">{section.body}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
