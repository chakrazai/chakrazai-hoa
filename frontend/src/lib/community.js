import { communityAPI } from './api';

const COMMUNITY_ID_KEY = 'hoa_community_id_v1';

export function getCommunityId() {
  const stored = localStorage.getItem(COMMUNITY_ID_KEY);
  return stored ? Number(stored) : 1;
}

let _resolvePromise = null;

export async function resolveCommunityId() {
  if (_resolvePromise) return _resolvePromise;
  _resolvePromise = communityAPI.list()
    .then(({ data: comms }) => {
      if (Array.isArray(comms) && comms.length > 0) {
        const id = comms[0].id;
        localStorage.setItem(COMMUNITY_ID_KEY, String(id));
        return id;
      }
      return getCommunityId();
    })
    .catch(() => getCommunityId());
  return _resolvePromise;
}
