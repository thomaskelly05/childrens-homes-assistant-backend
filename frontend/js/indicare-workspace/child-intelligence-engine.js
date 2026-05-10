export function buildChildIntelligence(records = []) {
  const text = records.map(recordToText).join(' ').toLowerCase();

  const emotionalPresentation = detectEmotion(text);
  const riskLevel = detectRisk(records, text);

  return {
    emotionalPresentation,
    riskLevel,
    supports: detectSupports(text),
    stressors: detectStressors(text),
    communication: detectCommunication(text),
    liveConcerns: detectConcerns(text),
    therapeuticQuestions: buildReflectionQuestions(text),
    patterns: detectPatterns(records, text),
    recommendations: buildRecommendations(text),
  };
}

function recordToText(record) {
  return `${record.title || ''} ${record.summary || ''} ${Object.values(record.content || {}).join(' ')}`;
}

function detectEmotion(text) {
  if (text.includes('dysregulated') || text.includes('aggressive')) return 'Dysregulated';
  if (text.includes('anxious') || text.includes('worried')) return 'Anxious';
  if (text.includes('withdrawn') || text.includes('shutdown')) return 'Withdrawn';
  return 'Calm';
}

function detectRisk(records, text) {
  const incidentCount = records.filter(r => (r.type || '').includes('incident')).length;
  if (text.includes('missing') || text.includes('exploitation') || incidentCount > 6) return 'High';
  if (incidentCount > 2 || text.includes('conflict')) return 'Medium';
  return 'Low';
}

function detectSupports(text) {
  const supports = [];
  if (text.includes('routine')) supports.push('Predictable routine');
  if (text.includes('choice')) supports.push('Offering choice');
  if (text.includes('calm')) supports.push('Calm communication');
  if (text.includes('space')) supports.push('Quiet/safe space');
  if (text.includes('humour')) supports.push('Humour and connection');
  return supports.length ? supports : ['Build evidence about what helps this child feel safe and regulated'];
}

function detectStressors(text) {
  const stressors = [];
  if (text.includes('school')) stressors.push('School pressure / transitions');
  if (text.includes('contact')) stressors.push('Family contact');
  if (text.includes('noise') || text.includes('loud')) stressors.push('Noise / sensory overwhelm');
  if (text.includes('peer')) stressors.push('Peer conflict');
  return stressors.length ? stressors : ['Continue exploring emotional triggers and stressors'];
}

function detectCommunication(text) {
  const communication = [];
  if (text.includes('withdraw')) communication.push('Withdrawal');
  if (text.includes('shout') || text.includes('aggressive')) communication.push('Externalised distress');
  if (text.includes('avoid')) communication.push('Avoidance');
  return communication.length ? communication : ['Communication style still emerging'];
}

function detectConcerns(text) {
  const concerns = [];
  if (text.includes('missing')) concerns.push('Missing from care risk');
  if (text.includes('exploitation')) concerns.push('Exploitation concern');
  if (text.includes('self-harm')) concerns.push('Self-harm indicators');
  if (text.includes('school refusal')) concerns.push('School avoidance');
  return concerns.length ? concerns : ['No major live concerns identified from current records'];
}

function buildReflectionQuestions(text) {
  return [
    'What is this child communicating through their behaviour?',
    'What helped the child feel safer or more regulated?',
    'What should adults do more consistently?',
    text.includes('contact') ? 'How does family contact affect emotional presentation?' : 'How are relationships affecting emotional wellbeing?'
  ];
}

function detectPatterns(records, text) {
  const patterns = [];
  const incidentCount = records.filter(r => (r.type || '').includes('incident')).length;
  if (incidentCount >= 3) patterns.push('Incident frequency increasing - review support planning');
  if (text.includes('contact') && text.includes('anxious')) patterns.push('Anxiety appears linked to family contact');
  if (text.includes('school') && text.includes('distress')) patterns.push('School-related distress pattern visible');
  return patterns.length ? patterns : ['No significant patterns detected yet'];
}

function buildRecommendations(text) {
  const actions = [];
  if (text.includes('missing')) actions.push('Review missing from care plan');
  if (text.includes('incident')) actions.push('Review behaviour support strategies');
  if (text.includes('sleep')) actions.push('Monitor sleep and emotional regulation relationship');
  if (text.includes('contact')) actions.push('Strengthen emotional preparation around family contact');
  return actions.length ? actions : ['Continue recording voice, lived experience and positive outcomes'];
}
