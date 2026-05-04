import { getProfessionalInviteByToken, submitProfessionalInput, inviteIsExpired } from './therapeutic-professional-invites.js';

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

const token = qs('token');
const intro = document.getElementById('professionalInviteIntro');
const status = document.getElementById('professionalInviteStatus');
const form = document.getElementById('professionalInputForm');

if (!token) {
  status.textContent = 'Invalid link.';
} else {
  const invite = getProfessionalInviteByToken(token);

  if (!invite) {
    status.textContent = 'This link is not recognised.';
  } else if (inviteIsExpired(invite)) {
    status.textContent = 'This link has expired.';
  } else if (invite.status === 'submitted') {
    status.textContent = 'Input already submitted. Thank you.';
  } else {
    intro.textContent = `${invite.professional_name} – ${invite.service_name}`;
    form.classList.remove('hidden');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      submitProfessionalInput(token, data);
      form.classList.add('hidden');
      status.textContent = 'Thank you. Your input has been submitted.';
    });
  }
}
