import { IndiCareData } from './types'

export const indicareData: IndiCareData = {
  youngPeople: [
    {
      id: 'yp-jamie',
      firstName: 'Jamie',
      lastName: 'Taylor',
      preferredName: 'Jamie',
      age: 14,
      gender: 'Male',
      status: 'active',
      legalStatus: 'Section 20 accommodated',
      communicationNeeds: 'Benefits from short explanations, visual plans and time to process changes.',
      educationStatus: 'Attending Oakbridge Academy with reduced timetable support.',
      healthSummary: 'Asthma plan in place. Sleep is improving with consistent evening routine.',
      riskLevel: 'medium',
      safeguardingStatus: 'monitoring',
      allocatedKeyWorkerId: 'staff-ella',
      likes: ['football', 'music production', 'cooking'],
      dislikes: ['unexpected changes', 'large group activities'],
      allergies: ['None recorded'],
      importantContacts: [
        { name: 'Sarah Taylor', relationship: 'Mother', phone: '07700 900101' },
        { name: 'Mark Evans', relationship: 'Social worker', phone: '07700 900102' }
      ]
    },
    {
      id: 'yp-noah',
      firstName: 'Noah',
      lastName: 'Ahmed',
      preferredName: 'Noah',
      age: 15,
      gender: 'Male',
      status: 'active',
      legalStatus: 'Interim care order',
      communicationNeeds: 'Prefers direct language and clear boundaries. Needs debriefs after incidents.',
      educationStatus: 'Alternative provision; reintegration plan under review.',
      healthSummary: 'CAMHS referral active. Missing episodes increase when routines are disrupted.',
      riskLevel: 'critical',
      safeguardingStatus: 'active',
      allocatedKeyWorkerId: 'staff-morgan',
      likes: ['basketball', 'gaming', 'quiet walks'],
      dislikes: ['police discussions without preparation', 'raised voices'],
      allergies: ['Peanuts'],
      importantContacts: [
        { name: 'Aisha Ahmed', relationship: 'Aunt', phone: '07700 900201' },
        { name: 'Priya Shah', relationship: 'Social worker', phone: '07700 900202' }
      ]
    },
    {
      id: 'yp-mia',
      firstName: 'Mia',
      lastName: 'Roberts',
      preferredName: 'Mia',
      age: 13,
      gender: 'Female',
      status: 'active',
      legalStatus: 'Full care order',
      communicationNeeds: 'Responds well to written plans and trusted adult check-ins.',
      educationStatus: 'Mainstream school placement stable with pastoral support.',
      healthSummary: 'No current medication. Regular emotional wellbeing check-ins are helpful.',
      riskLevel: 'low',
      safeguardingStatus: 'stable',
      allocatedKeyWorkerId: 'staff-ella',
      likes: ['art', 'animals', 'reading'],
      dislikes: ['being rushed', 'unknown visitors'],
      allergies: ['None recorded'],
      importantContacts: [
        { name: 'Linda Roberts', relationship: 'Grandmother', phone: '07700 900301' }
      ]
    }
  ],
  staff: [
    {
      id: 'staff-ella',
      firstName: 'Ella',
      lastName: 'Morgan',
      role: 'Registered manager',
      status: 'active',
      qualifications: ['Level 5 Diploma', 'Safeguarding lead', 'Medication competency'],
      assignedYoungPeople: ['yp-jamie', 'yp-mia'],
      shiftPattern: 'Mon-Fri leadership cover',
      email: 'ella.morgan@indicare.example',
      phone: '07700 800101'
    },
    {
      id: 'staff-morgan',
      firstName: 'Morgan',
      lastName: 'Reed',
      role: 'Senior support worker',
      status: 'active',
      qualifications: ['Level 3 Diploma', 'Team Teach', 'Missing from care response'],
      assignedYoungPeople: ['yp-noah'],
      shiftPattern: 'Late shifts and weekends',
      email: 'morgan.reed@indicare.example',
      phone: '07700 800102'
    },
    {
      id: 'staff-abi',
      firstName: 'Abi',
      lastName: 'Clarke',
      role: 'Support worker',
      status: 'active',
      qualifications: ['Level 3 Diploma', 'First aid'],
      assignedYoungPeople: ['yp-jamie', 'yp-noah'],
      shiftPattern: 'Rolling rota',
      email: 'abi.clarke@indicare.example',
      phone: '07700 800103'
    }
  ],
  placements: [
    {
      id: 'plc-jamie',
      youngPersonId: 'yp-jamie',
      placementType: 'Long-term residential',
      startDate: '2025-09-03',
      plannedEndDate: '2026-09-02',
      localAuthority: 'Manchester',
      socialWorkerName: 'Mark Evans',
      socialWorkerContact: 'mark.evans@example.gov.uk',
      placementGoals: ['Maintain education attendance', 'Build family time consistency', 'Develop independence skills'],
      status: 'active'
    },
    {
      id: 'plc-noah',
      youngPersonId: 'yp-noah',
      placementType: 'Stabilisation placement',
      startDate: '2026-01-16',
      localAuthority: 'Leeds',
      socialWorkerName: 'Priya Shah',
      socialWorkerContact: 'priya.shah@example.gov.uk',
      placementGoals: ['Reduce missing episodes', 'Complete exploitation safety plan', 'Rebuild education routine'],
      status: 'active'
    },
    {
      id: 'plc-mia',
      youngPersonId: 'yp-mia',
      placementType: 'Medium-term residential',
      startDate: '2025-11-21',
      plannedEndDate: '2026-11-20',
      localAuthority: 'Liverpool',
      socialWorkerName: 'Helen Gray',
      socialWorkerContact: 'helen.gray@example.gov.uk',
      placementGoals: ['Sustain school engagement', 'Increase confidence in family contact', 'Develop emotional vocabulary'],
      status: 'active'
    }
  ],
  dailyLogs: [
    {
      id: 'log-001',
      youngPersonId: 'yp-jamie',
      staffId: 'staff-abi',
      date: '2026-05-13',
      createdAt: '2026-05-13T09:30:00.000Z',
      shift: 'Morning',
      mood: 'settled',
      presentation: 'Jamie woke on time, ate breakfast and left for school with prompts.',
      followUpActions: ['Praise school attendance', 'Check PE kit for Friday']
    },
    {
      id: 'log-002',
      youngPersonId: 'yp-noah',
      staffId: 'staff-morgan',
      date: '2026-05-13',
      createdAt: '2026-05-13T11:20:00.000Z',
      shift: 'Morning',
      mood: 'heightened',
      presentation: 'Noah was anxious after a phone call and needed space before education transport.',
      followUpActions: ['Keywork check-in', 'Update risk plan triggers']
    },
    {
      id: 'log-003',
      youngPersonId: 'yp-mia',
      staffId: 'staff-ella',
      date: '2026-05-12',
      createdAt: '2026-05-12T20:10:00.000Z',
      shift: 'Evening',
      mood: 'positive',
      presentation: 'Mia completed homework and joined communal meal preparation.',
      followUpActions: []
    }
  ],
  incidents: [
    {
      id: 'inc-001',
      youngPersonId: 'yp-noah',
      staffIds: ['staff-morgan', 'staff-abi'],
      dateTime: '2026-05-12T18:40:00.000Z',
      type: 'Missing from care concern',
      severity: 'critical',
      location: 'Community',
      status: 'review',
      description: 'Noah left the home after refusing planned activity and returned with staff support.',
      trigger: 'Unexpected cancellation of basketball session.',
      deEscalationUsed: ['calm voice', 'space offered', 'known safe route followed'],
      outcome: 'Returned safely and completed welfare check.',
      injuries: 'None reported.',
      policeInvolved: true,
      ambulanceInvolved: false,
      safeguardingRequired: true,
      managerReview: 'Manager review required within 24 hours with updated missing protocol.',
      followUpActions: ['Update missing risk assessment', 'Notify social worker', 'Offer restorative keywork']
    },
    {
      id: 'inc-002',
      youngPersonId: 'yp-jamie',
      staffIds: ['staff-abi'],
      dateTime: '2026-05-10T16:15:00.000Z',
      type: 'Peer disagreement',
      severity: 'medium',
      location: 'Lounge',
      status: 'active',
      description: 'Jamie argued with a peer over console time and threw a controller onto the sofa.',
      trigger: 'Perceived unfairness with gaming rota.',
      deEscalationUsed: ['time out', 'restorative conversation'],
      outcome: 'Jamie apologised and agreed to the rota.',
      injuries: 'None.',
      policeInvolved: false,
      ambulanceInvolved: false,
      safeguardingRequired: false,
      managerReview: 'Review gaming rota and ensure staff consistency.',
      followUpActions: ['Keywork on problem solving']
    }
  ],
  safeguardingEvents: [
    {
      id: 'safe-001',
      youngPersonId: 'yp-noah',
      date: '2026-05-12',
      concernType: 'Missing and exploitation vulnerability',
      description: 'Missing episode linked to previous concerns about unsafe peer group.',
      actionTaken: 'Police notification completed; social worker updated; safety plan review booked.',
      reportedTo: 'Social worker and police',
      externalAgencies: ['Police', 'Children social care', 'CAMHS'],
      status: 'active'
    },
    {
      id: 'safe-002',
      youngPersonId: 'yp-jamie',
      date: '2026-05-08',
      concernType: 'Family contact worry',
      description: 'Jamie reported feeling pressured during a family call.',
      actionTaken: 'Staff debrief completed and contact supervisor informed.',
      reportedTo: 'Social worker',
      externalAgencies: ['Children social care'],
      status: 'monitoring'
    }
  ],
  riskAssessments: [
    {
      id: 'risk-001',
      youngPersonId: 'yp-noah',
      category: 'Missing from care',
      riskLevel: 'critical',
      description: 'Elevated missing risk when routines change or contact is disrupted.',
      controlMeasures: ['Known safe route protocol', 'Immediate manager notification', 'Return interview within 24 hours'],
      reviewDate: '2026-05-11',
      reviewedBy: 'staff-ella',
      status: 'overdue'
    },
    {
      id: 'risk-002',
      youngPersonId: 'yp-jamie',
      category: 'Peer conflict',
      riskLevel: 'medium',
      description: 'Can escalate verbally when feeling rules are unfair.',
      controlMeasures: ['Clear rota', 'Early adult mediation', 'Restorative follow-up'],
      reviewDate: '2026-06-01',
      reviewedBy: 'staff-morgan',
      status: 'active'
    },
    {
      id: 'risk-003',
      youngPersonId: 'yp-mia',
      category: 'Emotional wellbeing',
      riskLevel: 'low',
      description: 'May withdraw when routines feel rushed.',
      controlMeasures: ['Advance notice', 'Visual plan', 'Trusted adult check-in'],
      reviewDate: '2026-06-15',
      reviewedBy: 'staff-ella',
      status: 'active'
    }
  ],
  medicationRecords: [
    {
      id: 'med-001',
      youngPersonId: 'yp-jamie',
      medicationName: 'Salbutamol inhaler',
      dosage: '2 puffs',
      frequency: 'As required',
      route: 'Inhaled',
      prescribedBy: 'Dr Patel',
      status: 'active',
      administrationHistory: [
        { dateTime: '2026-05-12T21:00:00.000Z', status: 'administered', notes: 'Used after football, effective.' },
        { dateTime: '2026-05-13T21:00:00.000Z', status: 'overdue', notes: 'Check inhaler location and record if not needed.' }
      ]
    },
    {
      id: 'med-002',
      youngPersonId: 'yp-noah',
      medicationName: 'Melatonin',
      dosage: '2mg',
      frequency: 'Nightly',
      route: 'Oral',
      prescribedBy: 'CAMHS',
      status: 'active',
      administrationHistory: [
        { dateTime: '2026-05-12T21:30:00.000Z', status: 'missed', notes: 'Noah declined; CAMHS advice to be followed.' }
      ]
    }
  ],
  keyworkSessions: [
    {
      id: 'key-001',
      youngPersonId: 'yp-noah',
      staffId: 'staff-morgan',
      date: '2026-05-13',
      topic: 'Safety after missing episode',
      goals: ['Identify triggers', 'Agree safe adults'],
      youngPersonVoice: 'I need people to tell me when plans change.',
      actions: ['Update safety card', 'Plan basketball alternative'],
      nextSessionDate: '2026-05-20'
    },
    {
      id: 'key-002',
      youngPersonId: 'yp-jamie',
      staffId: 'staff-ella',
      date: '2026-05-11',
      topic: 'Family time preparation',
      goals: ['Use feelings scale', 'Plan debrief'],
      youngPersonVoice: 'I want calls to be shorter when school has been hard.',
      actions: ['Tell social worker', 'Prepare contact script'],
      nextSessionDate: '2026-05-18'
    }
  ],
  appointments: [
    {
      id: 'apt-001',
      youngPersonId: 'yp-noah',
      staffId: 'staff-morgan',
      dateTime: '2026-05-14T10:30:00.000Z',
      type: 'CAMHS review',
      professional: 'Dr Lewis',
      location: 'CAMHS clinic',
      outcome: 'Pending attendance.',
      followUpRequired: true,
      status: 'active'
    },
    {
      id: 'apt-002',
      youngPersonId: 'yp-jamie',
      staffId: 'staff-abi',
      dateTime: '2026-05-09T15:00:00.000Z',
      type: 'LAC health review',
      professional: 'Nurse Patel',
      location: 'Oak House',
      outcome: 'Asthma plan updated.',
      followUpRequired: false,
      status: 'closed'
    },
    {
      id: 'apt-003',
      youngPersonId: 'yp-mia',
      staffId: 'staff-ella',
      dateTime: '2026-05-16T09:15:00.000Z',
      type: 'School review',
      professional: 'Pastoral lead',
      location: 'Riverside School',
      outcome: 'Preparation notes needed.',
      followUpRequired: true,
      status: 'review'
    }
  ],
  documents: [
    {
      id: 'doc-001',
      youngPersonId: 'yp-noah',
      title: 'Missing from care protocol',
      category: 'Risk',
      uploadedBy: 'staff-ella',
      uploadedAt: '2026-05-12T12:00:00.000Z',
      reviewDate: '2026-05-12',
      tags: ['missing', 'safeguarding', 'risk'],
      fileUrl: '#'
    },
    {
      id: 'doc-002',
      youngPersonId: 'yp-jamie',
      title: 'Asthma care plan',
      category: 'Health',
      uploadedBy: 'staff-abi',
      uploadedAt: '2026-05-09T10:00:00.000Z',
      reviewDate: '2026-08-09',
      tags: ['health', 'medication'],
      fileUrl: '#'
    }
  ],
  reports: [
    {
      id: 'rep-001',
      youngPersonId: 'yp-jamie',
      title: 'Jamie weekly care summary',
      type: 'Weekly care summary',
      dateRangeStart: '2026-05-06',
      dateRangeEnd: '2026-05-13',
      generatedBy: 'staff-ella',
      status: 'draft',
      createdAt: '2026-05-13T08:00:00.000Z',
      updatedAt: '2026-05-13T09:00:00.000Z'
    },
    {
      id: 'rep-002',
      youngPersonId: 'yp-noah',
      title: 'Noah risk review',
      type: 'Risk review',
      dateRangeStart: '2026-05-01',
      dateRangeEnd: '2026-05-13',
      generatedBy: 'staff-morgan',
      status: 'review',
      createdAt: '2026-05-12T18:00:00.000Z',
      updatedAt: '2026-05-13T07:30:00.000Z'
    },
    {
      id: 'rep-003',
      youngPersonId: 'yp-noah',
      title: 'Safeguarding chronology update',
      type: 'Safeguarding chronology',
      dateRangeStart: '2026-04-13',
      dateRangeEnd: '2026-05-13',
      generatedBy: 'staff-ella',
      status: 'overdue',
      createdAt: '2026-05-10T08:00:00.000Z',
      updatedAt: '2026-05-10T08:00:00.000Z'
    }
  ],
  notifications: [
    {
      id: 'note-001',
      createdAt: '2026-05-13T09:10:00.000Z',
      priority: 'high',
      title: 'Risk review overdue',
      message: 'Noah missing from care risk review needs manager sign-off.',
      linkedRecordType: 'risk',
      read: false
    },
    {
      id: 'note-002',
      createdAt: '2026-05-13T08:40:00.000Z',
      priority: 'medium',
      title: 'Medication record check',
      message: 'Jamie inhaler administration history has an overdue prompt.',
      linkedRecordType: 'medication',
      read: false
    },
    {
      id: 'note-003',
      createdAt: '2026-05-12T17:20:00.000Z',
      priority: 'low',
      title: 'Document review',
      message: 'Asthma care plan review date is in date.',
      linkedRecordType: 'document',
      read: true
    }
  ],
  audit: [
    {
      id: 'audit-001',
      youngPersonId: 'yp-noah',
      timestamp: '2026-05-13T07:45:00.000Z',
      actorId: 'staff-morgan',
      action: 'Updated missing risk assessment after return home.'
    },
    {
      id: 'audit-002',
      youngPersonId: 'yp-jamie',
      timestamp: '2026-05-13T09:15:00.000Z',
      actorId: 'staff-abi',
      action: 'Added daily log and medication prompt.'
    }
  ]
}
