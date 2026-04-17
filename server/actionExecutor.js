/**
 * VoxFlow — Action Executor
 * Prepares, validates, and manages action execution.
 * Actions are NEVER executed without explicit user confirmation.
 */

// ── Action Templates ─────────────────────────────────────────
const ACTION_TEMPLATES = {
  reminder: {
    type: 'Reminder',
    icon: '🔔',
    description: 'Setting a new reminder',
    requiredFields: ['what', 'when'],
    followUp: "Got it! I'll set that reminder for you. Can you confirm what I should remind you about and when?",
    confirmMessage: "Your reminder has been set successfully!",
  },
  schedule: {
    type: 'Calendar Event',
    icon: '📅',
    description: 'Creating a calendar event',
    requiredFields: ['event', 'date', 'time'],
    followUp: "I'll help you schedule that. What's the event name, date, and time?",
    confirmMessage: "Your event has been added to the calendar!",
  },
  email: {
    type: 'Email',
    icon: '✉️',
    description: 'Composing an email',
    requiredFields: ['recipient', 'content'],
    followUp: "Sure, I'll draft that email. Who should I send it to, and what should it say?",
    confirmMessage: "Your email has been sent!",
  },
  note: {
    type: 'Note',
    icon: '📝',
    description: 'Creating a note',
    requiredFields: ['content'],
    followUp: "I'll save that for you. What would you like the note to say?",
    confirmMessage: "Your note has been saved!",
  },
};

/**
 * Prepare an action descriptor for a given intent.
 * Does NOT execute — only builds the action for user confirmation.
 * @param {string} intent
 * @param {string} message
 * @returns {{ type, icon, description, status, followUp, details } | null}
 */
export function prepareAction(intent, message) {
  const template = ACTION_TEMPLATES[intent];
  if (!template) return null;

  // Extract any details from the message
  const details = extractActionDetails(intent, message);

  return {
    type: template.type,
    icon: template.icon,
    description: template.description,
    status: 'awaiting_confirmation',
    followUp: template.followUp,
    confirmMessage: template.confirmMessage,
    details,
    intent,
  };
}

/**
 * Extract action-relevant details from the user message.
 * Basic extraction — would be enhanced with NLP/LLM in production.
 */
function extractActionDetails(intent, message) {
  const details = { raw: message };

  switch (intent) {
    case 'reminder': {
      // Try to extract "remind me to X at/on Y"
      const reminderMatch = message.match(/remind(?:\s+me)?\s+(?:to\s+)?(.+?)(?:\s+(?:at|on|in|by)\s+(.+))?$/i);
      if (reminderMatch) {
        details.what = reminderMatch[1]?.trim();
        details.when = reminderMatch[2]?.trim();
      }
      break;
    }
    case 'schedule': {
      // Try to extract "schedule X on Y at Z"
      const schedMatch = message.match(/(?:schedule|book|create)\s+(?:a\s+)?(.+?)(?:\s+(?:on|for)\s+(.+?))?(?:\s+at\s+(.+))?$/i);
      if (schedMatch) {
        details.event = schedMatch[1]?.trim();
        details.date = schedMatch[2]?.trim();
        details.time = schedMatch[3]?.trim();
      }
      break;
    }
    case 'email': {
      // Try to extract "email X about Y"
      const emailMatch = message.match(/(?:email|send.*mail.*to)\s+(.+?)(?:\s+(?:about|saying|with)\s+(.+))?$/i);
      if (emailMatch) {
        details.recipient = emailMatch[1]?.trim();
        details.content = emailMatch[2]?.trim();
      }
      break;
    }
    case 'note': {
      // Try to extract note content
      const noteMatch = message.match(/(?:note|note down|save|remember)\s+(?:that\s+)?(.+)/i);
      if (noteMatch) {
        details.content = noteMatch[1]?.trim();
      }
      break;
    }
  }

  return details;
}

/**
 * Execute a confirmed action.
 * This is called ONLY after user confirms via the UI.
 * In production, this would call real external APIs.
 * @param {object} action - The confirmed action object
 * @returns {{ success: boolean, message: string }}
 */
export function executeConfirmedAction(action) {
  // Simulate execution (in production, call real APIs here)
  const template = ACTION_TEMPLATES[action.intent];

  console.log(`[VoxFlow] ⚡ Executing action: ${action.type}`, action.details);

  return {
    success: true,
    message: template?.confirmMessage || `${action.type} completed successfully!`,
    executedAt: Date.now(),
  };
}

/**
 * Get available action types (useful for debug/health).
 */
export function getAvailableActions() {
  return Object.entries(ACTION_TEMPLATES).map(([key, val]) => ({
    intent: key,
    type: val.type,
    icon: val.icon,
  }));
}
