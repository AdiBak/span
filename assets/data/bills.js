export const SUPPORT = `<span class="badge bg-success mb-2">Support</span>`;
export const OPPOSE = `<span class="badge bg-danger mb-2">Oppose</span>`;
export const SUPPORT_AMENDED = `<span class="badge bg-warning text-dark mb-2">Support If Amended</span>`;
export const OPPOSE_AMENDED = `<span class="badge bg-warning text-dark mb-2">Oppose Unless Amended</span>`;

export var bills = [
  {
    name: "Texas HB 5294",
    position: OPPOSE,
    description: "Submitted testimony to allow merit-based evaluation systems in Texas medical schools instead of banning pass/fail grading.",
    date: new Date("2025-03-15"),
    proposal: "HB 5294.pdf",
  },
  {
    name: "Texas SB 75",
    position: SUPPORT_AMENDED,
    description: "Submitted a proposal to strengthen the definition of “microgrid” to protect Texas’ energy leadership.",
    date: new Date("2025-06-25"),
    proposal: "/Texas/SB 75.pdf",
  },
];
