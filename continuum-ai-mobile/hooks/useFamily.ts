import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDemoStore } from '@/store/demoStore';
import {
  getFamilyGroup,
  createFamilyGroup,
  inviteFamilyMember,
  acceptFamilyInvite,
  subscribeToFamilyGroup,
  getMemberHealthSummary,
  FamilyGroup,
  FamilyMember,
} from '@/services/firestoreService';

// ─── Demo data ────────────────────────────────────────────────────────────────

export const DEMO_FAMILY_GROUP: FamilyGroup = {
  id: 'demo-family-1',
  ownerId: 'demo-user',
  name: 'The Morgan Family',
  planType: 'family',
  maxMembers: 4,
  createdAt: '2026-01-15T00:00:00.000Z',
  members: [
    {
      userId: 'demo-user',
      name: 'Alex Morgan',
      email: 'alex@demo.com',
      role: 'owner',
      permissions: {
        canViewHealthScore: true,
        canViewInsights: true,
        canViewMedications: true,
        canViewTimeline: true,
        canAddEntries: true,
      },
      status: 'active',
      joinedAt: '2026-01-15T00:00:00.000Z',
      avatarColor: '#4C8DFF',
    },
    {
      userId: 'demo-member-1',
      name: 'Sarah Morgan',
      email: 'sarah@demo.com',
      role: 'member',
      permissions: {
        canViewHealthScore: true,
        canViewInsights: true,
        canViewMedications: false,
        canViewTimeline: true,
        canAddEntries: false,
      },
      status: 'active',
      joinedAt: '2026-02-01T00:00:00.000Z',
      avatarColor: '#30D158',
    },
    {
      userId: 'demo-member-2',
      name: 'Robert Morgan',
      email: 'robert@demo.com',
      role: 'dependent',
      permissions: {
        canViewHealthScore: true,
        canViewInsights: false,
        canViewMedications: false,
        canViewTimeline: false,
        canAddEntries: false,
      },
      status: 'active',
      joinedAt: '2026-02-15T00:00:00.000Z',
      avatarColor: '#FF9F0A',
    },
    {
      userId: 'demo-member-3',
      name: 'Emma Morgan',
      email: 'emma@demo.com',
      role: 'member',
      permissions: {
        canViewHealthScore: true,
        canViewInsights: true,
        canViewMedications: false,
        canViewTimeline: false,
        canAddEntries: false,
      },
      status: 'invited',
      joinedAt: null,
      avatarColor: '#BF5AF2',
    },
  ],
};

const DEMO_MEMBER_SUMMARIES = new Map<string, any>([
  [
    'demo-member-1',
    {
      healthScore: 85,
      unreadInsights: 1,
      lastEntry: new Date(Date.now() - 86_400_000).toISOString(),
      medicationAdherence: null,
    },
  ],
  [
    'demo-member-2',
    {
      healthScore: 61,
      unreadInsights: 3,
      lastEntry: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      medicationAdherence: 78,
    },
  ],
]);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFamily() {
  const { user, isAuthenticated } = useAuthStore();
  const { isDemoMode } = useDemoStore();

  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [memberSummaries, setMemberSummaries] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to user.id so the useEffect doesn't re-run on every render
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const loadMemberSummaries = useCallback(
    async (group: FamilyGroup) => {
      const summaries = new Map<string, any>();
      for (const member of group.members) {
        if (member.status !== 'active') continue;
        if (member.userId === userIdRef.current) continue;
        try {
          const summary = await getMemberHealthSummary(member.userId, member.permissions);
          summaries.set(member.userId, summary);
        } catch {
          // restricted — skip silently
        }
      }
      setMemberSummaries(summaries);
    },
    []
  );

  const loadFamily = useCallback(async () => {
    if (isDemoMode || !isAuthenticated) return;
    setIsLoading(true);
    try {
      const group = await getFamilyGroup();
      if (group) {
        setFamilyGroup(group);
        await loadMemberSummaries(group);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load family data');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, isAuthenticated, loadMemberSummaries]);

  useEffect(() => {
    if (isDemoMode) {
      setFamilyGroup(DEMO_FAMILY_GROUP);
      setMemberSummaries(DEMO_MEMBER_SUMMARIES);
      setIsLoading(false);
      return;
    }
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      setIsLoading(true);
      try {
        const group = await getFamilyGroup();
        if (group) {
          setFamilyGroup(group);
          await loadMemberSummaries(group);
          // Subscribe to real-time updates
          unsubscribe = subscribeToFamilyGroup(group.id, async (updated) => {
            setFamilyGroup(updated);
            if (updated) await loadMemberSummaries(updated);
          });
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load family data');
      } finally {
        setIsLoading(false);
      }
    };

    init();
    return () => unsubscribe?.();
  }, [isAuthenticated, isDemoMode, loadMemberSummaries]);

  const createFamily = useCallback(
    async (name: string, planType: 'family' | 'caregiver'): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      const id = await createFamilyGroup({
        name,
        planType,
        ownerName: user.name,
        ownerEmail: user.email,
      });
      await loadFamily();
      return id;
    },
    [user, loadFamily]
  );

  const inviteMember = useCallback(
    async (email: string, name: string, role: FamilyMember['role']): Promise<string> => {
      if (!familyGroup) throw new Error('No family group');
      return inviteFamilyMember({ groupId: familyGroup.id, email, name, role });
    },
    [familyGroup]
  );

  const acceptInvite = useCallback(async (code: string): Promise<boolean> => {
    const result = await acceptFamilyInvite(code);
    if (result) await loadFamily();
    return result;
  }, [loadFamily]);

  const isOwner = familyGroup?.ownerId === user?.id;

  return {
    familyGroup,
    memberSummaries,
    isLoading,
    error,
    isOwner,
    createFamily,
    inviteMember,
    acceptInvite,
    refreshMembers: () =>
      familyGroup ? loadMemberSummaries(familyGroup) : Promise.resolve(),
  };
}
