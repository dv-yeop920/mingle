import { memberDraftSchema } from '../model/schemas';
import type { MemberDraft } from '../model/schemas';

const MEMBER_DRAFT_STORAGE_KEY = 'mingle:member-draft:v1';

const deleteMemberDraft = (storage: Storage): void => {
  try {
    storage.removeItem(MEMBER_DRAFT_STORAGE_KEY);
  } catch {
    // 저장소 접근이 제한된 환경에서도 화면 흐름은 유지한다.
  }
};

const fetchMemberDraft = (storage: Storage): MemberDraft | null => {
  try {
    const serializedDraft = storage.getItem(MEMBER_DRAFT_STORAGE_KEY);
    if (!serializedDraft) return null;

    const parsedDraft: unknown = JSON.parse(serializedDraft);
    const result = memberDraftSchema.safeParse(parsedDraft);

    if (result.success) return result.data;

    storage.removeItem(MEMBER_DRAFT_STORAGE_KEY);
    return null;
  } catch {
    deleteMemberDraft(storage);
    return null;
  }
};

const putMemberDraft = (draft: MemberDraft, storage: Storage): boolean => {
  try {
    storage.setItem(MEMBER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
};

export {
  deleteMemberDraft,
  fetchMemberDraft,
  MEMBER_DRAFT_STORAGE_KEY,
  putMemberDraft,
};
