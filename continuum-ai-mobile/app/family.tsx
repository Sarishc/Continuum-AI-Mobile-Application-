import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFamily } from '@/hooks/useFamily';
import { useAuthStore } from '@/store/authStore';
import { formatTimeAgo } from '@/utils/formatters';
import { FamilyMemberCard } from '@/components/ui/FamilyMemberCard';
import { InviteMemberSheet } from '@/components/ui/InviteMemberSheet';
import { JoinFamilySheet } from '@/components/ui/JoinFamilySheet';
import { CreateFamilySheet } from '@/components/ui/CreateFamilySheet';

export default function FamilyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    familyGroup,
    memberSummaries,
    isLoading,
    isOwner,
    createFamily,
    inviteMember,
    acceptInvite,
  } = useFamily();

  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [pendingPlanType, setPendingPlanType] = useState<'family' | 'caregiver'>('family');

  const activeMembers = familyGroup?.members.filter((m) => m.status === 'active') ?? [];
  const otherActiveMembers = activeMembers.filter((m) => m.userId !== user?.id);
  const hasAlerts = Array.from(memberSummaries.values()).some(
    (s) => (s?.unreadInsights ?? 0) > 0
  );

  const openCreate = (type: 'family' | 'caregiver') => {
    setPendingPlanType(type);
    setShowCreate(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#4C8DFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Family Health</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* ── No family group ─────────────────────────────────────────── */}
        {!familyGroup && (
          <Animated.View entering={FadeInDown.duration(350)} style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.emptyTitle}>Health is a family affair</Text>
            <Text style={styles.emptySubtitle}>
              Monitor your family's health together. See everyone's health scores and get
              alerts when a family member needs attention.
            </Text>

            {/* Plan cards */}
            <View style={styles.planCards}>
              <Pressable onPress={() => openCreate('family')} style={styles.planCard}>
                <Text style={styles.planEmoji}>👨‍👩‍👧‍👦</Text>
                <Text style={styles.planName}>Family Plan</Text>
                <Text style={styles.planPrice}>$29.99/mo</Text>
                <Text style={styles.planDesc}>
                  Up to 4 family members. Everyone tracks health together.
                </Text>
                <View style={styles.planBtn}>
                  <Text style={styles.planBtnText}>Create Family</Text>
                </View>
              </Pressable>

              <Pressable onPress={() => openCreate('caregiver')} style={[styles.planCard, styles.caregiverCard]}>
                <Text style={styles.planEmoji}>🏥</Text>
                <Text style={styles.planName}>Caregiver Plan</Text>
                <Text style={[styles.planPrice, { color: '#30D158' }]}>$39.99/mo</Text>
                <Text style={styles.planDesc}>
                  Monitor elderly parents or dependents with their permission.
                </Text>
                <View style={[styles.planBtn, styles.caregiverBtn]}>
                  <Text style={styles.planBtnText}>Set Up Caregiver</Text>
                </View>
              </Pressable>
            </View>

            <Pressable onPress={() => setShowJoin(true)} style={styles.joinLink}>
              <Text style={styles.joinLinkText}>Have an invite code? Join a family →</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Family group exists ─────────────────────────────────────── */}
        {familyGroup && (
          <>
            {/* Group header */}
            <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.groupHeader}>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{familyGroup.name}</Text>
                <Text style={styles.groupMeta}>
                  {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''} ·{' '}
                  {familyGroup.planType === 'family' ? 'Family Plan' : 'Caregiver Plan'}
                </Text>
              </View>
              {isOwner && familyGroup.members.length < familyGroup.maxMembers && (
                <Pressable onPress={() => setShowInvite(true)} style={styles.inviteBtn}>
                  <Text style={styles.inviteBtnText}>+ Invite</Text>
                </Pressable>
              )}
            </Animated.View>

            {/* Alert banner */}
            {hasAlerts && (
              <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.alertBanner}>
                <Text style={styles.alertBannerText}>
                  ⚠️ A family member has unread health alerts
                </Text>
              </Animated.View>
            )}

            {/* Members list */}
            <Text style={styles.sectionHeader}>MEMBERS</Text>

            {familyGroup.members.map((member, i) => (
              <Animated.View key={member.userId} entering={FadeInDown.delay(100 + i * 40).duration(280)}>
                <FamilyMemberCard
                  member={member}
                  summary={memberSummaries.get(member.userId)}
                  isCurrentUser={member.userId === user?.id}
                  isOwner={isOwner}
                />
              </Animated.View>
            ))}

            {/* Add slot */}
            {isOwner && familyGroup.members.length < familyGroup.maxMembers && (
              <Pressable onPress={() => setShowInvite(true)} style={styles.addSlot}>
                <Text style={styles.addSlotPlus}>+</Text>
                <Text style={styles.addSlotText}>Add family member</Text>
                <Text style={styles.addSlotCount}>
                  {familyGroup.maxMembers - familyGroup.members.length} slot
                  {familyGroup.maxMembers - familyGroup.members.length !== 1 ? 's' : ''} remaining
                </Text>
              </Pressable>
            )}

            {/* Family health summary */}
            {otherActiveMembers.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>FAMILY HEALTH SUMMARY</Text>

                <Animated.View
                  entering={FadeInDown.delay(200).duration(300)}
                  style={styles.summaryCard}
                >
                  {otherActiveMembers.map((member, i) => {
                    const summary = memberSummaries.get(member.userId);
                    if (!summary) return null;
                    return (
                      <View
                        key={member.userId}
                        style={[styles.summaryRow, i < otherActiveMembers.length - 1 && styles.summaryRowBorder]}
                      >
                        <View style={[styles.avatar, { backgroundColor: member.avatarColor + '25' }]}>
                          <Text style={[styles.avatarText, { color: member.avatarColor }]}>
                            {member.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.summaryInfo}>
                          <Text style={styles.summaryName}>{member.name.split(' ')[0]}</Text>
                          {summary.lastEntry && (
                            <Text style={styles.summaryMeta}>
                              Active {formatTimeAgo(summary.lastEntry)}
                            </Text>
                          )}
                        </View>
                        {member.permissions.canViewHealthScore && summary.healthScore != null && (
                          <View style={styles.scoreChip}>
                            <Text
                              style={[
                                styles.scoreValue,
                                { color: summary.healthScore >= 70 ? '#30D158' : '#FF9F0A' },
                              ]}
                            >
                              {summary.healthScore}
                            </Text>
                            <Text style={styles.scoreLabel}>/100</Text>
                          </View>
                        )}
                        {summary.unreadInsights > 0 && (
                          <View style={styles.insightBadge}>
                            <Text style={styles.insightBadgeText}>
                              {summary.unreadInsights} alert{summary.unreadInsights !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </Animated.View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <CreateFamilySheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name) => createFamily(name, pendingPlanType)}
      />
      <InviteMemberSheet
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={inviteMember}
      />
      <JoinFamilySheet
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={acceptInvite}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  backBtn: { fontSize: 15, color: '#4C8DFF', width: 60 },
  title: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  // Empty state
  emptyState: { padding: 24, alignItems: 'center' },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 24, fontWeight: '700', color: '#FFFFFF',
    marginBottom: 8, textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  planCards: { width: '100%', gap: 12, marginBottom: 20 },
  planCard: {
    padding: 20,
    backgroundColor: 'rgba(76,141,255,0.08)',
    borderRadius: 20, borderWidth: 0.5, borderColor: 'rgba(76,141,255,0.25)',
  },
  caregiverCard: {
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderColor: 'rgba(48,209,88,0.25)',
  },
  planEmoji: { fontSize: 32, marginBottom: 8 },
  planName: {
    fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4,
  },
  planPrice: {
    fontSize: 24, fontWeight: '700', color: '#4C8DFF', marginBottom: 8,
  },
  planDesc: {
    fontSize: 14, color: 'rgba(255,255,255,0.50)',
    lineHeight: 20, marginBottom: 16,
  },
  planBtn: {
    backgroundColor: '#4C8DFF', paddingVertical: 12,
    borderRadius: 12, alignItems: 'center',
  },
  caregiverBtn: { backgroundColor: '#30D158' },
  planBtnText: { fontSize: 15, fontWeight: '600', color: 'white' },
  joinLink: { marginTop: 8 },
  joinLinkText: { fontSize: 14, color: '#4C8DFF' },
  // Group
  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 12,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  groupMeta: { fontSize: 13, color: 'rgba(255,255,255,0.40)' },
  inviteBtn: {
    backgroundColor: '#4C8DFF', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20,
  },
  inviteBtnText: { fontSize: 14, fontWeight: '600', color: 'white' },
  alertBanner: {
    marginHorizontal: 20, marginBottom: 8,
    padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,159,10,0.10)',
    borderWidth: 0.5, borderColor: 'rgba(255,159,10,0.30)',
  },
  alertBannerText: { fontSize: 13, color: '#FF9F0A' },
  sectionHeader: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.30)',
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 10,
  },
  addSlot: {
    marginHorizontal: 20, marginTop: 8,
    padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(76,141,255,0.25)',
    borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  addSlotPlus: { fontSize: 18, color: '#4C8DFF' },
  addSlotText: { flex: 1, fontSize: 15, color: '#4C8DFF', fontWeight: '500' },
  addSlotCount: { fontSize: 12, color: 'rgba(255,255,255,0.30)' },
  // Summary card
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 10,
  },
  summaryRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  summaryInfo: { flex: 1 },
  summaryName: { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  summaryMeta: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  scoreChip: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  scoreValue: { fontSize: 20, fontWeight: '700' },
  scoreLabel: { fontSize: 11, color: 'rgba(255,255,255,0.30)' },
  insightBadge: {
    backgroundColor: 'rgba(255,159,10,0.15)',
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 0.5, borderColor: 'rgba(255,159,10,0.30)',
  },
  insightBadgeText: { fontSize: 11, color: '#FF9F0A', fontWeight: '500' },
});
