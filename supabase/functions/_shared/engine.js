// Conservative deterministic baseline, not a general-purpose language model.
export const disclosure = "Hi, I'm your personal AI assistant. The owner is unavailable. How can I help?";
export function validateBrief(b) {
  if (!b || typeof b !== 'object') throw Error('A brief is required.');
  for (const k of ['owner_name','delivery_instruction','general_message']) {
    if (typeof b[k] !== 'string' || b[k].length > 500) throw Error(`Invalid ${k}.`);
  }
  if (!b.owner_name.trim()) throw Error('Enter your name.');
  if (!['message','answer'].includes(b.autonomy)) throw Error('Invalid permission level.');
  if (typeof b.enabled !== 'boolean' || !Number.isFinite(Date.parse(b.expires_at))) throw Error('Invalid availability window.');
  return b;
}
export function decide(brief, input, now = Date.now(), history = []) {
  if (typeof input !== 'string' || !input.trim() || input.length > 2000) throw Error('Enter between 1 and 2,000 characters.');
  validateBrief(brief);
  const t = input.normalize('NFKC').toLowerCase();
  const result = (intent, reply, attention, reason) => ({intent, reply, attention, reason, outcome:'Not confirmed', engine:'context-policy-v2'});
  // Critical requests are checked before availability and routine instructions.
  if (/\b(emergency|ambulance|hospital|injured|accident|urgent|danger)\b/.test(t))
    return result('urgent', 'This sounds urgent. I will flag this conversation for the owner. I cannot guarantee they will see it immediately; please contact local emergency services if someone is in immediate danger.', true, 'Urgency keyword; attention item only, no external alert sent.');
  if (/\b(otp|o\s*t\s*p|one[ -]?time|password|passcode|pin|bank|banking|payment|pay|money|transfer|contract|sign|verification code|security code|authentication code)\b/.test(t))
    return result('restricted', 'I cannot provide authentication codes, banking details, or make financial or legal commitments. I will flag your request for the owner.', true, 'Restricted request; no action authorized.');
  if (!brief.enabled || Date.parse(brief.expires_at) <= now)
    return result('message', 'There are no active instructions right now. Please leave your name and a message for the owner.', false, 'Brief disabled or expired.');
  if (brief.autonomy === 'message')
    return result('message', 'Please leave your name and message. The owner can review it when available.', false, 'Message-only permission.');
  const previous = history.at(-1);
  if (/what (can|do) you (do|help)|how can you help|your (capabilities|purpose)|who are you/.test(t))
    return result('capabilities', 'I can answer questions using the owner’s instructions, help with a delivery or visitor, and collect a message or callback request. I can’t make payments or confirm bookings. What do you need help with?', false, 'Explains actual assistant capabilities; no owner context required.');
  if (/^(tp|tee pee)\b|^to do for me[.?! ]*$/.test(t))
    return result('clarify', /delivery/.test(t)||previous?.intent==='delivery' ? 'Did you mean an OTP for the delivery, or something else?' : 'Did you mean “what can you do for me,” or are you asking me to pass along a task?', false, 'Unclear transcript; asks for confirmation rather than guessing.');
  if (/^(repeat|say (it|that) again|pardon|what did you say)/.test(t)&&previous)
    return result(previous.intent||'message', previous.reply, false, 'Repeats the previous response on request.');
  const delivery = /\b(delivery|deliver|package|parcel|courier)\b/.test(t);
  const followup = previous?.intent === 'delivery' && /\b(where|there|gate|reception|door|security|nobody|closed|leave|left|them|it)\b/.test(t);
  if (/\b(ignore|override)\b.*\b(rules|instructions|brief)\b|system prompt/.test(t))
    return result('message', 'I can help with the purpose of your call, but I cannot change the owner’s permissions. What would you like to ask them?', false, 'Instruction override refused.');
  if (/^(hi|hello|hey|good morning|good evening)[!. ]*$/.test(t))
    return result('greeting', 'Hello! What are you calling about today?', false, 'Greeting; clarify purpose before retrieving instructions.');
  if (/\b(thank you|thanks|bye|goodbye)\b/.test(t))
    return result('closing', 'You’re welcome. Your conversation will be available to the owner once this test call is saved.', false, 'Polite closing; no completion or callback inferred.');
  if (delivery || followup) {
    if (/\b(nobody|no one|closed|unavailable|cannot|can’t|can't|refused)\b/.test(t))
      return result('delivery', 'It sounds like the suggested handoff isn’t possible. I don’t have an approved alternative location. Please tell me what is preventing the handoff so the owner can review it.', true, 'Handoff obstacle; no alternative authorized.');
    if (/\b(left|delivered|handed)\b/.test(t))
      return {...result('delivery', 'Thank you for the update. Who received the package, and where did you leave it? I’ll keep this as your report, not a verified delivery.', false, 'Caller reports completion; not independently verified.'),outcome:'Caller-reported; unverified'};
    if (/\b(address|building|flat|apartment|floor|code|number|directions)\b/.test(t))
      return result('delivery', 'I don’t have verified address details for that question. Could you confirm the location shown in your delivery app? I can record the question for the owner.', true, 'Specific location detail not present as verified structured context.');
    if (!brief.delivery_instruction.trim())
      return result('delivery', 'I understand this is about a delivery, but the owner hasn’t provided delivery instructions. Where are you waiting, and what do you need them to confirm?', true, 'Delivery intent; prerequisite instruction missing.');
    if (previous?.intent === 'delivery' && !/\b(where|leave|instruction|repeat)\b/.test(t))
      return result('delivery', 'Is there something you need clarified about the handoff? I can only confirm the location the owner approved.', false, 'Delivery context retained; clarification requested.');
    return result('delivery', `The delivery instructions are: ${brief.delivery_instruction}`, false, 'Grounded in active delivery instruction; no completion inferred.');
  }
  if (/\b(when|available|availability|busy|meeting|call back|callback)\b/.test(t)) {
    if (/\b(book|schedule|join|tomorrow|tonight|appointment)\b/.test(t))
      return result('availability', 'I don’t have calendar access or permission to confirm a meeting. What time and topic should I pass along to the owner?', true, 'Calendar and scheduling permission unavailable.');
    return result('availability', brief.general_message.trim() ? `${brief.general_message} I can take a message, but I can’t promise a callback time.` : 'I don’t have confirmed availability details. Would you like to leave a callback request?', false, 'General brief used only for availability; expiry is not a callback promise.');
  }
  if (/\b(project|work|client|issue|error|deployment|office)\b/.test(t))
    return result('work', 'It sounds like a work-related request. I don’t have project information to answer it. What is the project name, the issue, and any deadline the owner should know?', true, 'Work intent detected; project knowledge unavailable.');
  if (previous && ['work','unknown'].includes(previous.intent) && !/\?/.test(t))
    return result('message', 'Thank you — I’ve added that detail to this test transcript. Is there a deadline or callback detail you want the owner to see?', true, 'Follow-up recorded as caller-provided information, not verified fact.');
  return result('unknown', 'I don’t have information in the owner’s brief that answers that request, so I don’t want to guess. Could you tell me a little more about what you need? I can capture it for the owner.', true, 'No relevant prerequisite context; clarify and collect instead of repeating unrelated brief.');
}
