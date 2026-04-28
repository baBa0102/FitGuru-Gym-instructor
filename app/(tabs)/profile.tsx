import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { profile, logout } = useAuth();
  const [weeklyAlerts, setWeeklyAlerts] = useState(true);

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await logout();
        // The AuthContext clears state, but we force the redirect here 
        // to ensure the UI updates immediately.
        router.replace('/login');
      } catch (error) {
        console.error("Logout failed", error);
      }
    };

    if (Platform.OS === 'web') {
      // Standard browser confirmation for Web
      const confirmed = window.confirm('Are you sure you want to logout? Your progress is saved.');
      if (confirmed) {
        performLogout();
      }
    } else {
      // Native Mobile Alert
      Alert.alert(
        'Logout',
        'Are you sure you want to logout? Your progress is saved.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  const toggleWeeklyAlerts = async (value: boolean) => {
    setWeeklyAlerts(value);
    // TODO: Update Firebase user notification preferences
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>No profile found yet.</Text>
        <TouchableOpacity
          style={[styles.editBtn, { marginHorizontal: 24, marginTop: 16 }]}
          onPress={() => router.replace('/onboarding')}
        >
          <Text style={styles.editBtnText}>Complete onboarding</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate BMI based on units
  const bmi = (
    profile.weight /
    Math.pow(profile.heightUnit === 'cm' ? profile.height / 100 : profile.height * 0.3048, 2)
  ).toFixed(1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSub}>Manage your account</Text>
        </View>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{profile.name ? profile.name[0] : 'U'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{profile.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{profile.age} years</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
              {profile.gender}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone || 'Not provided'}</Text>
          </View>
        </View>

        {/* Body Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Body Stats</Text>
          <div style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>
                {profile.weight} {profile.weightUnit}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Height</Text>
              <Text style={styles.statValue}>
                {profile.height} {profile.heightUnit}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>BMI</Text>
              <Text style={styles.statValue}>{bmi}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Goal</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {GOAL_LABELS[profile.goal] || profile.goal}
              </Text>
            </View>
          </div>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/onboarding')}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Weekly weight check</Text>
              <Text style={styles.settingDesc}>
                Get reminded every 7 days to log your weight
              </Text>
            </View>
            <Switch
              value={weeklyAlerts}
              onValueChange={toggleWeeklyAlerts}
              trackColor={{ false: '#1a1a1a', true: '#2d6e2d' }}
              thumbColor={weeklyAlerts ? '#3dbf3d' : '#444'}
            />
          </View>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Last weight check</Text>
            <Text style={styles.settingValue}>
              {profile.lastWeightCheck
                ? new Date(profile.lastWeightCheck).toLocaleDateString()
                : 'Never'}
            </Text>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/progress')}
          >
            <Text style={styles.settingLabel}>View weight history</Text>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Export my data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Reset workout plan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleLogout}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>FitGuru v1.0.0</Text>
          <Text style={styles.appInfoText}>
            Joined {profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose weight',
  build_muscle: 'Build muscle',
  bulk: 'Bulk up',
  lean: 'Get lean',
  muscle_mass: 'Muscle mass',
  stay_fit: 'Stay fit',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#f0f0f0', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: '#555', marginTop: 2 },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a2e1a',
    borderWidth: 2,
    borderColor: '#3dbf3d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#3dbf3d' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  loadingText: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 40 },

  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#1e1e1e',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3dbf3d',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1a1a1a',
  },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, color: '#ddd', fontWeight: '500' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  statLabel: { fontSize: 10, color: '#444', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#f0f0f0' },

  editBtn: {
    backgroundColor: '#1a2e1a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2d6e2d',
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: '#3dbf3d' },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 14, color: '#ddd', marginBottom: 2 },
  settingDesc: { fontSize: 11, color: '#555', lineHeight: 16 },
  settingValue: { fontSize: 14, color: '#777' },
  settingArrow: { fontSize: 16, color: '#3dbf3d' },
  settingDivider: { height: 0.5, backgroundColor: '#1a1a1a', marginVertical: 4 },

  actionBtn: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  actionBtnText: { fontSize: 14, fontWeight: '500', color: '#ddd' },
  actionBtnDanger: { borderColor: '#3e1e1e' },
  actionBtnTextDanger: { color: '#d94444' },

  appInfo: { alignItems: 'center', paddingVertical: 24 },
  appInfoText: { fontSize: 11, color: '#333', marginBottom: 4 },
});