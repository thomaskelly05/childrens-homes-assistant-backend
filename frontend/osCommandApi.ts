import type { OSCommandResponse } from './osCommandTypes';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchOSCommand(params: {
  homeId?: number;
  youngPersonId?: number;
  domain?: string;
  priority?: string;
  limit?: number;
} = {}): Promise<OSCommandResponse> {
  const search = new URLSearchParams();
  if (params.homeId) search.set('home_id', String(params.homeId));
  if (params.youngPersonId) search.set('young_person_id', String(params.youngPersonId));
  if (params.domain) search.set('domain', params.domain);
  if (params.priority) search.set('priority', params.priority);
  if (params.limit) search.set('limit', String(params.limit));

  const suffix = search.toString() ? '?' + search.toString() : '';
  const res = await fetch(API_BASE + '/api/os-command' + suffix, { credentials: 'include' });
  if (!res.ok) throw new Error('OS Command failed: ' + String(res.status));
  return res.json();
}

export async function captureOSCommandItem(feedId: string): Promise<{ id: string; status: string }> {
  const res = await fetch(API_BASE + '/api/os-command/' + encodeURIComponent(feedId) + '/capture', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Capture failed: ' + String(res.status));
  return res.json();
}

export async function updateOSCommandItem(itemId: string, payload: {
  status: 'open' | 'in_progress' | 'waiting' | 'completed' | 'dismissed' | 'void';
  decision?: string;
  rationale?: string;
}): Promise<{ id: string; status: string }> {
  const res = await fetch(API_BASE + '/api/os-command/items/' + itemId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Update failed: ' + String(res.status));
  return res.json();
}
