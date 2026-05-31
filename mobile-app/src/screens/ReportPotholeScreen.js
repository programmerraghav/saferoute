/**
 * mobile-app/src/screens/ReportPotholeScreen.js
 * Step-based pothole report: Camera → Details → Submit (queued offline)
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { authFetch } from '../services/auth';
import { getComplaintsCache, setComplaintsCache } from '../services/storage';
import NetInfo from '@react-native-community/netinfo';
import { getCurrentLocation } from '../services/sos';
import { colors, spacing, radius } from '../constants/theme';

const STEPS = ['Photo', 'Details', 'Submit'];

export default function ReportPotholeScreen({ navigation }) {
  const [step, setStep]         = useState(0);
  const [image, setImage]       = useState(null);
  const [roadName, setRoadName] = useState('');
  const [city, setCity]         = useState('');
  const [severity, setSeverity] = useState(5);
  const [description, setDesc]  = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [location, setLocation] = useState(null);

  async function pickImage(source) {
    const opts = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [4,3] };
    const res  = source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets?.[0]) {
      setImage(res.assets[0]);
      const loc = await getCurrentLocation();
      setLocation(loc);
      setStep(1);
    }
  }

  async function handleSubmit() {
    if (!roadName.trim()) { Alert.alert('Required', 'Please enter the road name.'); return; }
    setLoading(true);

    const net = await NetInfo.fetch();
    const report = {
      road_name: roadName, city, severity, description,
      latitude: location?.latitude || location?.lat,
      longitude: location?.longitude || location?.lng,
      created_at: new Date().toISOString(),
      offline_queued: !net.isConnected,
    };

    if (net.isConnected && image) {
      try {
        const form = new FormData();
        form.append('photo', { uri: image.uri, type: 'image/jpeg', name: 'pothole.jpg' });
        Object.entries(report).forEach(([k, v]) => form.append(k, v?.toString() ?? ''));
        const res = await authFetch('/api/complaints', {
          method: 'POST', body: form,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = await res.json();
        setResult({ success: true, id: data.complaint_id, online: true });
      } catch {
        await queueOffline(report);
        setResult({ success: true, id: null, online: false });
      }
    } else {
      await queueOffline(report);
      setResult({ success: true, id: null, online: false });
    }

    setLoading(false);
    setStep(2);
  }

  async function queueOffline(report) {
    const cache = await getComplaintsCache();
    cache.unshift({ ...report, id: `offline_${Date.now()}`, status: 'queued_offline' });
    await setComplaintsCache(cache);
  }

  // ── Step 0: Photo ─────────────────────────────────────────────────────────
  if (step === 0) return (
    <View style={styles.root}>
      <Text style={styles.pageTitle}>📷 Step 1 — Take Photo</Text>
      <Text style={styles.pageSub}>Capture or upload a photo of the pothole</Text>
      <View style={styles.photoOptions}>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('camera')} activeOpacity={0.8}>
          <Text style={{ fontSize: 48 }}>📷</Text>
          <Text style={styles.photoBtnLabel}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('library')} activeOpacity={0.8}>
          <Text style={{ fontSize: 48 }}>🖼️</Text>
          <Text style={styles.photoBtnLabel}>From Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 1: Details ───────────────────────────────────────────────────────
  if (step === 1) return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>📋 Step 2 — Details</Text>
      {image && <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />}
      {location && (
        <View style={styles.locChip}>
          <Text style={styles.locText}>📍 {(location.latitude || location.lat)?.toFixed(4)}, {(location.longitude || location.lng)?.toFixed(4)}</Text>
        </View>
      )}
      <TextInput style={styles.input} placeholder="Road Name *" placeholderTextColor={colors.textFaint} value={roadName} onChangeText={setRoadName} />
      <TextInput style={styles.input} placeholder="City" placeholderTextColor={colors.textFaint} value={city} onChangeText={setCity} />
      <TextInput style={[styles.input, { height: 80 }]} placeholder="Description (optional)" placeholderTextColor={colors.textFaint} value={description} onChangeText={setDesc} multiline />
      <Text style={styles.severityLabel}>Severity: <Text style={{ color: severity >= 7 ? colors.red : severity >= 4 ? colors.amber : colors.green }}>{severity}/10</Text></Text>
      <View style={styles.severityRow}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <TouchableOpacity key={n} onPress={() => setSeverity(n)}
            style={[styles.sevBtn, severity === n && { backgroundColor: n >= 7 ? colors.red : n >= 4 ? colors.amber : colors.green }]}>
            <Text style={[styles.sevBtnText, severity === n && { color: n >= 4 ? '#0a0e1a' : '#fff' }]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#0a0e1a" /> : <Text style={styles.submitBtnText}>Submit Report →</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setStep(0)} style={{ alignItems: 'center', marginTop: spacing.md }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Retake Photo</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Step 2: Done ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', padding: spacing.xl }]}>
      <Text style={{ fontSize: 60 }}>✅</Text>
      <Text style={styles.doneTitle}>Report Submitted!</Text>
      {result?.online
        ? <Text style={styles.doneId}>Complaint ID: {result?.id?.substring(0, 10)}…</Text>
        : <Text style={styles.offlineNote}>📡 Queued offline — will auto-sync when connected</Text>
      }
      <TouchableOpacity style={[styles.submitBtn, { width: '80%', marginTop: spacing.xl }]}
        onPress={() => { setStep(0); setImage(null); setRoadName(''); setCity(''); setDesc(''); setSeverity(5); setResult(null); }}>
        <Text style={styles.submitBtnText}>Report Another</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginTop: spacing.md }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex:1, backgroundColor:colors.bgPrimary, padding:spacing.lg },
  scroll:      { paddingBottom:80 },
  pageTitle:   { fontSize:22, fontWeight:'800', color:colors.textPrimary, marginBottom:6 },
  pageSub:     { fontSize:13, color:colors.textMuted, marginBottom:spacing.xl },
  photoOptions:{ flexDirection:'row', gap:spacing.lg, justifyContent:'center', marginTop:spacing['2xl'] },
  photoBtn:    { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border, borderRadius:radius.xl, padding:spacing['2xl'], alignItems:'center', gap:spacing.md, flex:1 },
  photoBtnLabel:{ fontSize:14, fontWeight:'700', color:colors.textMuted },
  preview:     { width:'100%', height:200, borderRadius:radius.lg, marginBottom:spacing.lg },
  locChip:     { alignSelf:'flex-start', backgroundColor:'rgba(34,197,94,0.1)', borderWidth:1, borderColor:'rgba(34,197,94,0.3)', borderRadius:radius.full, paddingHorizontal:12, paddingVertical:5, marginBottom:spacing.md },
  locText:     { color:colors.green, fontSize:11, fontFamily:'Courier New' },
  input:       { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border, borderRadius:radius.md, padding:spacing.md, color:colors.textPrimary, fontSize:14, marginBottom:spacing.sm },
  severityLabel:{ fontSize:14, fontWeight:'600', color:colors.textPrimary, marginBottom:spacing.sm },
  severityRow: { flexDirection:'row', gap:5, marginBottom:spacing.lg },
  sevBtn:      { width:28, height:28, borderRadius:14, backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  sevBtnText:  { fontSize:11, fontWeight:'600', color:colors.textMuted },
  submitBtn:   { backgroundColor:colors.amber, padding:spacing.md, borderRadius:radius.full, alignItems:'center' },
  submitBtnText:{ color:'#0a0e1a', fontWeight:'800', fontSize:15 },
  doneTitle:   { fontSize:26, fontWeight:'800', color:colors.textPrimary, marginTop:spacing.lg },
  doneId:      { fontSize:13, color:colors.textMuted, marginTop:spacing.sm, fontFamily:'Courier New' },
  offlineNote: { fontSize:13, color:colors.amber, marginTop:spacing.sm, textAlign:'center' },
});
