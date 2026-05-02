import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Svg, Line, Circle, Text as SvgText, Polyline } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const CHART_HEIGHT = 200;

interface WeightEntry {
  date: string;
  weight: number;
}

export default function ProgressScreen() {
  const { profile, logWeight, updateProfile } = useAuth();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  const weightHistory = profile?.weightHistory || [];
  const currentWeight = profile?.weight || 0;

  // Filter weight history based on time range
  const getFilteredHistory = (): WeightEntry[] => {
    if (!weightHistory.length) return [];
    
    const now = new Date();
    const filtered = weightHistory.filter(entry => {
      const entryDate = new Date(entry.date);
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return entryDate >= weekAgo;
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return entryDate >= monthAgo;
      }
      return true; // 'all'
    });

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const filteredHistory = getFilteredHistory();

  // Calculate stats
  const startWeight = filteredHistory.length > 0 ? filteredHistory[0].weight : currentWeight;
  const latestWeight = filteredHistory.length > 0 
    ? filteredHistory[filteredHistory.length - 1].weight 
    : currentWeight;
  const weightChange = latestWeight - startWeight;
  const avgWeight = filteredHistory.length > 0
    ? filteredHistory.reduce((sum, e) => sum + e.weight, 0) / filteredHistory.length
    : currentWeight;

  // Check if weekly check-in is due
  const lastCheckDate = profile?.lastWeightCheck 
    ? new Date(profile.lastWeightCheck) 
    : null;
  const daysSinceCheck = lastCheckDate 
    ? Math.floor((Date.now() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const isCheckDue = daysSinceCheck >= 7;

  const handleLogWeight = async () => {
    const weight = parseFloat(newWeight);
    if (!weight || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    await logWeight(weight);
    await updateProfile({ weight }); // Update current weight too
    setNewWeight('');
    setShowWeightModal(false);
    Alert.alert('Success', 'Weight logged successfully!');
  };

  // Generate chart data
  const getChartPoints = (): string => {
    if (filteredHistory.length === 0) return '';

    const weights = filteredHistory.map(e => e.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const range = maxWeight - minWeight;

    const points = filteredHistory.map((entry, i) => {
      const x = (i / (filteredHistory.length - 1 || 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((entry.weight - minWeight) / range) * CHART_HEIGHT;
      return `${x},${y}`;
    });

    return points.join(' ');
  };

  const renderChart = () => {
    if (filteredHistory.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No data yet</Text>
          <Text style={styles.emptyChartSub}>Log your weight to see progress</Text>
        </View>
      );
    }

    const weights = filteredHistory.map(e => e.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const range = maxWeight - minWeight;

    return (
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={styles.chart}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
          const y = CHART_HEIGHT * fraction;
          const weightValue = (maxWeight - fraction * range).toFixed(1);
          return (
            <React.Fragment key={i}>
              <Line
                x1="0"
                y1={y}
                x2={CHART_WIDTH}
                y2={y}
                stroke="#1a1a1a"
                strokeWidth="0.5"
              />
              <SvgText
                x="5"
                y={y - 5}
                fill="#444"
                fontSize="10"
              >
                {weightValue}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Line graph */}
        <Polyline
          points={getChartPoints()}
          fill="none"
          stroke="#3dbf3d"
          strokeWidth="2"
        />

        {/* Data points */}
        {filteredHistory.map((entry, i) => {
          const x = (i / (filteredHistory.length - 1 || 1)) * CHART_WIDTH;
          const y = CHART_HEIGHT - ((entry.weight - minWeight) / range) * CHART_HEIGHT;
          return (
            <Circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#3dbf3d"
              stroke="#0a0a0a"
              strokeWidth="2"
            />
          );
        })}

        {/* Date labels */}
        {filteredHistory.map((entry, i) => {
          if (i % Math.ceil(filteredHistory.length / 4) !== 0 && i !== filteredHistory.length - 1) return null;
          const x = (i / (filteredHistory.length - 1 || 1)) * CHART_WIDTH;
          const dateStr = new Date(entry.date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
          return (
            <SvgText
              key={`date-${i}`}
              x={x}
              y={CHART_HEIGHT + 15}
              fill="#555"
              fontSize="10"
              textAnchor="middle"
            >
              {dateStr}
            </SvgText>
          );
        })}
      </Svg>
    );
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Progress</Text>
          <Text style={styles.headerSub}>Track your journey</Text>
        </View>
        <TouchableOpacity
          style={[styles.logBtn, isCheckDue && styles.logBtnHighlight]}
          onPress={() => setShowWeightModal(true)}
        >
          <Text style={styles.logBtnText}>Log Weight</Text>
          {isCheckDue && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Check-in Alert */}
        {isCheckDue && (
          <View style={styles.alertCard}>
            <Text style={styles.alertIcon}>⚖️</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Weekly Check-In Due</Text>
              <Text style={styles.alertText}>
                It's been {daysSinceCheck} days since your last weight log. Tap "Log Weight" to update.
              </Text>
            </View>
          </View>
        )}

        {/* Current Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={styles.statValue}>{currentWeight} {profile.weightUnit}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Change</Text>
            <Text style={[styles.statValue, weightChange > 0 ? styles.statUp : styles.statDown]}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {profile.weightUnit}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>{avgWeight.toFixed(1)} {profile.weightUnit}</Text>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={styles.rangeSelector}>
          {(['week', 'month', 'all'] as const).map(range => (
            <TouchableOpacity
              key={range}
              style={[styles.rangeBtn, timeRange === range && styles.rangeBtnActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.rangeText, timeRange === range && styles.rangeTextActive]}>
                {range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Trend</Text>
          {renderChart()}
        </View>

        {/* Weight History List */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Weight Log</Text>
          {filteredHistory.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Log your first weight!</Text>
          ) : (
            filteredHistory.slice().reverse().map((entry, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyDate}>
                  {new Date(entry.date).toLocaleDateString('en', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                <Text style={styles.historyWeight}>{entry.weight} {profile.weightUnit}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Weight Log Modal */}
      <Modal
        visible={showWeightModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Log Your Weight</Text>
            <Text style={styles.modalSub}>Enter your current weight to track progress</Text>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.weightInput}
                placeholder={`e.g. ${currentWeight}`}
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
                value={newWeight}
                onChangeText={setNewWeight}
                autoFocus
              />
              <Text style={styles.unitLabel}>{profile.weightUnit}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowWeightModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSave}
                onPress={handleLogWeight}
              >
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  logBtn: {
    backgroundColor: '#3dbf3d',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
  },
  logBtnHighlight: { backgroundColor: '#2d9e2d' },
  logBtnText: { fontSize: 13, fontWeight: '700', color: '#0a0a0a' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d94444',
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },

  loadingText: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 40 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },

  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#1f1500',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#3e2010',
    marginBottom: 16,
    gap: 12,
  },
  alertIcon: { fontSize: 24 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#ba7517', marginBottom: 4 },
  alertText: { fontSize: 12, color: '#8a5517', lineHeight: 18 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#1e1e1e',
    alignItems: 'center',
  },
  statLabel: { fontSize: 10, color: '#555', letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#f0f0f0' },
  statUp: { color: '#3dbf3d' },
  statDown: { color: '#d94444' },

  rangeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rangeBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#1e1e1e',
  },
  rangeBtnActive: { backgroundColor: '#0d1f0d', borderColor: '#3dbf3d' },
  rangeText: { fontSize: 12, color: '#666', fontWeight: '500' },
  rangeTextActive: { color: '#3dbf3d' },

  chartCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: '#1e1e1e',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3dbf3d',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  chart: { marginTop: 10 },
  emptyChart: { alignItems: 'center', paddingVertical: 60 },
  emptyChartText: { fontSize: 16, color: '#555', fontWeight: '600', marginBottom: 4 },
  emptyChartSub: { fontSize: 12, color: '#333' },

  historyCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: '#1e1e1e',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3dbf3d',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  emptyText: { fontSize: 13, color: '#555', textAlign: 'center', paddingVertical: 20 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1a1a1a',
  },
  historyDate: { fontSize: 13, color: '#aaa' },
  historyWeight: { fontSize: 13, color: '#f0f0f0', fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 0.5,
    borderColor: '#222',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#f0f0f0', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#666', marginBottom: 24 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#f0f0f0',
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  unitLabel: { fontSize: 16, color: '#777', fontWeight: '600' },

  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  modalBtnCancelText: { fontSize: 15, fontWeight: '600', color: '#777' },
  modalBtnSave: {
    flex: 1,
    backgroundColor: '#3dbf3d',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalBtnSaveText: { fontSize: 15, fontWeight: '700', color: '#0a0a0a' },
});