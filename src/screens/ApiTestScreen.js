import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, MOBILE_API_URL } from '../config/api';
import { supabase } from '../lib/supabase';

const STATUS = { IDLE: 'idle', LOADING: 'loading', OK: 'ok', FAIL: 'fail' };

const TESTS = [
  {
    key: 'health',
    label: 'Admin API Health',
    description: 'GET /api/health',
    run: async () => {
      const res = await fetch(`${API_BASE_URL}/health`);
      const data = await res.json();
      if (!res.ok || data.status !== 'ok') throw new Error(data.message || 'Not OK');
      return data.message || 'API is running';
    },
  },
  {
    key: 'articles',
    label: 'Articles Feed',
    description: 'GET /api/mobile/articles',
    run: async () => {
      const res = await fetch(`${MOBILE_API_URL}/articles?limit=5`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      return `${data.pagination?.total ?? '?'} articles found`;
    },
  },
  {
    key: 'references',
    label: 'Visual References',
    description: 'GET /api/mobile/references',
    run: async () => {
      const res = await fetch(`${MOBILE_API_URL}/references`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      return `${(data.references ?? []).length} references loaded`;
    },
  },
  {
    key: 'maps',
    label: 'Maps',
    description: 'GET /api/mobile/maps',
    run: async () => {
      const res = await fetch(`${MOBILE_API_URL}/maps`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const sectionCount = Object.keys(data.sections ?? {}).length;
      return `${sectionCount} section(s) found`;
    },
  },
  {
    key: 'roadmap',
    label: 'Roadmap',
    description: 'GET /api/mobile/roadmap',
    run: async () => {
      const res = await fetch(`${MOBILE_API_URL}/roadmap`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      return `${(data.topics ?? []).length} topics loaded`;
    },
  },
  {
    key: 'supabase',
    label: 'Supabase Auth',
    description: 'Ping Supabase session',
    run: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw new Error(error.message);
      const status = data.session ? 'Authenticated' : 'Connected (no session)';
      return status;
    },
  },
  {
    key: 'openrouter',
    label: 'OpenRouter AI',
    description: 'POST to openrouter.ai',
    run: async () => {
      const { OPENROUTER_API_KEY, OPENROUTER_BASE_URL } = await import('../config/aiModels');
      if (!OPENROUTER_API_KEY) throw new Error('API key not configured');
      const res = await fetch(OPENROUTER_BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: 'Reply with "ok" only.' }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim() ?? '(no content)';
      return `AI replied: "${reply}"`;
    },
  },
];

function TestRow({ test, status, detail, onRun }) {
  const iconName =
    status === STATUS.OK ? 'checkmark-circle' :
    status === STATUS.FAIL ? 'close-circle' :
    status === STATUS.LOADING ? null : 'radio-button-off';

  const iconColor =
    status === STATUS.OK ? '#34C759' :
    status === STATUS.FAIL ? '#FF3B30' : '#C7C7CC';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onRun}
      disabled={status === STATUS.LOADING}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{test.label}</Text>
        <Text style={styles.rowDesc}>{test.description}</Text>
        {detail ? (
          <Text style={[styles.rowDetail, status === STATUS.FAIL && styles.rowDetailFail]}>
            {detail}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        {status === STATUS.LOADING ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Ionicons name={iconName} size={24} color={iconColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ApiTestScreen({ navigation }) {
  const [states, setStates] = useState(() =>
    Object.fromEntries(TESTS.map(t => [t.key, { status: STATUS.IDLE, detail: '' }]))
  );
  const [runningAll, setRunningAll] = useState(false);

  const runTest = useCallback(async (test) => {
    setStates(s => ({ ...s, [test.key]: { status: STATUS.LOADING, detail: '' } }));
    try {
      const detail = await test.run();
      setStates(s => ({ ...s, [test.key]: { status: STATUS.OK, detail } }));
    } catch (err) {
      setStates(s => ({ ...s, [test.key]: { status: STATUS.FAIL, detail: err.message } }));
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunningAll(true);
    for (const test of TESTS) {
      await runTest(test);
    }
    setRunningAll(false);
  }, [runTest]);

  const passed = Object.values(states).filter(s => s.status === STATUS.OK).length;
  const failed = Object.values(states).filter(s => s.status === STATUS.FAIL).length;
  const total = TESTS.length;
  const allDone = passed + failed === total;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>API Connection Test</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* API URL Banner */}
      <View style={styles.urlBanner}>
        <Ionicons name="server-outline" size={14} color="#8E8E93" />
        <Text style={styles.urlText} numberOfLines={1}>{MOBILE_API_URL}</Text>
      </View>

      {/* Summary bar (shown after all tests run) */}
      {allDone && (
        <View style={[styles.summary, failed === 0 ? styles.summaryOk : styles.summaryFail]}>
          <Ionicons
            name={failed === 0 ? 'checkmark-circle' : 'warning'}
            size={18}
            color={failed === 0 ? '#34C759' : '#FF9500'}
          />
          <Text style={[styles.summaryText, { color: failed === 0 ? '#34C759' : '#FF9500' }]}>
            {failed === 0
              ? `All ${total} tests passed`
              : `${passed}/${total} passed · ${failed} failed`}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {TESTS.map((test, i) => (
          <View key={test.key}>
            <TestRow
              test={test}
              status={states[test.key].status}
              detail={states[test.key].detail}
              onRun={() => runTest(test)}
            />
            {i < TESTS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </ScrollView>

      {/* Run All Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.runAllBtn, runningAll && styles.runAllBtnDisabled]}
          onPress={runAll}
          disabled={runningAll}
        >
          {runningAll ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="play-circle" size={20} color="#fff" />
          )}
          <Text style={styles.runAllText}>
            {runningAll ? 'Running…' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: { width: 40 },
  title: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  urlBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E9E9EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  urlText: { fontSize: 12, color: '#8E8E93', fontFamily: 'monospace', flex: 1 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryOk: { backgroundColor: '#F0FFF4' },
  summaryFail: { backgroundColor: '#FFF9E6' },
  summaryText: { fontSize: 14, fontWeight: '600' },
  list: { paddingVertical: 12, paddingHorizontal: 16, gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  rowDesc: { fontSize: 12, color: '#8E8E93', marginTop: 2, fontFamily: 'monospace' },
  rowDetail: { fontSize: 12, color: '#34C759', marginTop: 4 },
  rowDetailFail: { color: '#FF3B30' },
  rowRight: { width: 32, alignItems: 'center' },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  runAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
  },
  runAllBtnDisabled: { opacity: 0.6 },
  runAllText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
