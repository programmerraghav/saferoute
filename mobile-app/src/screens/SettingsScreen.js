/**
 * mobile-app/src/screens/SettingsScreen.js
 * Emergency contacts management + SOS configuration.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Linking,
} from 'react-native';
import {
  getContacts, addContact, removeContact,
  getSettings, updateSettings,
} from '../services/storage';
import { callEmergencyNumber, sendEmergencySMS, getCurrentLocation } from '../services/sos';
import { colors, spacing, radius } from '../constants/theme';

export default function SettingsScreen() {
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({});
  const [newName, setNewName]   = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [adding, setAdding]     = useState(false);

  useEffect(() => {
    getContacts().then(setContacts);
    getSettings().then(setSettings);
  }, []);

  async function handleAddContact() {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Missing fields', 'Please enter name and phone number.');
      return;
    }
    const updated = await addContact({ name: newName.trim(), phone: newPhone.trim(), relation: relation.trim() });
    setContacts(updated);
    setNewName('');
    setNewPhone('');
    setRelation('');
    setAdding(false);
  }

  async function handleRemove(id) {
    Alert.alert('Remove Contact', 'Remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const updated = await removeContact(id);
        setContacts(updated);
      }},
    ]);
  }

  async function testSMS() {
    const coords = await getCurrentLocation();
    const result = await sendEmergencySMS(coords, '🧪 TEST — SafeRoute SOS test message. You can ignore this.');
    Alert.alert(result.success ? '✅ SMS Sent' : '⚠️ SMS Failed', result.success ? 'Test message sent to all contacts.' : result.reason);
  }

  async function saveSetting(key, val) {
    await updateSettings({ [key]: val });
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Emergency contacts */}
      <Text style={styles.sectionTitle}>📱 Emergency Contacts</Text>
      <Text style={styles.sectionSub}>Stored locally — SMS sent offline via cellular</Text>

      {contacts.map(c => (
        <View key={c.id} style={styles.contactCard}>
          <View style={[styles.avatar, { backgroundColor: colors.amberGlow }]}>
            <Text style={{ color: colors.amber, fontWeight: '700', fontSize: 14 }}>{c.name?.[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName}>{c.name} {c.relation ? <Text style={styles.contactRelation}>({c.relation})</Text> : null}</Text>
            <Text style={styles.contactPhone}>{c.phone}</Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)}>
            <Text style={{ fontSize: 22 }}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleRemove(c.id)} style={{ marginLeft: 8 }}>
            <Text style={{ fontSize: 18, color: colors.red }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Add contact form */}
      {adding ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Emergency Contact</Text>
          <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={colors.textFaint}
            value={newName} onChangeText={setNewName} autoCapitalize="words" />
          <TextInput style={styles.input} placeholder="Phone (+91 98765 43210)" placeholderTextColor={colors.textFaint}
            value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Relation (optional, e.g. Dad)" placeholderTextColor={colors.textFaint}
            value={relation} onChangeText={setRelation} />
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <TouchableOpacity style={[styles.btn, styles.btnAmber, { flex: 1 }]} onPress={handleAddContact}>
              <Text style={styles.btnAmberText}>Add Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline, { flex: 1 }]} onPress={() => setAdding(false)}>
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setAdding(true)}>
          <Text style={styles.btnOutlineText}>+ Add Contact</Text>
        </TouchableOpacity>
      )}

      {contacts.length > 0 && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: colors.green, borderWidth: 1, marginTop: spacing.sm }]} onPress={testSMS}>
          <Text style={{ color: colors.green, fontWeight: '700', textAlign: 'center', fontSize: 14 }}>🧪 Send Test SMS</Text>
        </TouchableOpacity>
      )}

      {/* SOS Settings */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>⚙️ SOS Configuration</Text>

      <View style={styles.card}>
        {[
          { key: 'sosCountdownSecs',  label: 'Countdown Duration',   unit: 'seconds', type: 'number' },
          { key: 'stationaryMinutes', label: 'Stationary Threshold', unit: 'minutes', type: 'number' },
          { key: 'impactThreshold',   label: 'Impact Threshold',     unit: 'G-force', type: 'decimal' },
          { key: 'emergencyNumber',   label: 'Emergency Number',     unit: '',         type: 'phone' },
        ].map(field => (
          <View key={field.key} style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{field.label}</Text>
              {field.unit ? <Text style={styles.settingUnit}>{field.unit}</Text> : null}
            </View>
            <TextInput
              style={styles.settingInput}
              value={String(settings[field.key] ?? '')}
              onChangeText={v => saveSetting(field.key, field.type === 'number' ? parseInt(v) || 0 : field.type === 'decimal' ? parseFloat(v) || 0 : v)}
              keyboardType={field.type === 'phone' ? 'phone-pad' : 'numeric'}
              placeholderTextColor={colors.textFaint}
            />
          </View>
        ))}
      </View>

      {/* Offline info */}
      <View style={[styles.card, { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.04)', marginTop: spacing.lg }]}>
        <Text style={[styles.cardTitle, { color: colors.green }]}>✅ Offline-First Architecture</Text>
        <Text style={[styles.settingUnit, { marginTop: 8, lineHeight: 20 }]}>
          All contacts stored locally in AsyncStorage.{'\n'}
          Emergency calls and SMS work via cellular network — no internet required.{'\n'}
          SOS events are queued offline and synced when you reconnect.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:             { flex:1, backgroundColor:colors.bgPrimary },
  scroll:           { padding:spacing.lg, paddingBottom:80 },
  sectionTitle:     { fontSize:16, fontWeight:'700', color:colors.textPrimary, marginBottom:4 },
  sectionSub:       { fontSize:12, color:colors.textMuted, marginBottom:spacing.lg },
  contactCard:      { flexDirection:'row', alignItems:'center', gap:spacing.md, backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:spacing.md, marginBottom:spacing.sm },
  avatar:           { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center', flexShrink:0 },
  contactName:      { fontSize:14, fontWeight:'600', color:colors.textPrimary },
  contactRelation:  { fontWeight:'400', color:colors.textMuted },
  contactPhone:     { fontSize:12, color:colors.textMuted, fontFamily:'Courier New', marginTop:2 },
  card:             { backgroundColor:colors.bgCard, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, padding:spacing.lg, marginBottom:spacing.md },
  cardTitle:        { fontSize:14, fontWeight:'700', color:colors.textPrimary, marginBottom:spacing.md },
  input:            { backgroundColor:colors.bgCardHover, borderWidth:1, borderColor:colors.border, borderRadius:radius.md, padding:spacing.md, color:colors.textPrimary, fontSize:14, marginBottom:spacing.sm },
  btn:              { padding:spacing.md, borderRadius:radius.full, marginBottom:spacing.sm },
  btnAmber:         { backgroundColor:colors.amber },
  btnAmberText:     { color:'#0a0e1a', fontWeight:'700', textAlign:'center', fontSize:14 },
  btnOutline:       { borderWidth:1, borderColor:colors.border },
  btnOutlineText:   { color:colors.textMuted, fontWeight:'600', textAlign:'center', fontSize:14 },
  settingRow:       { flexDirection:'row', alignItems:'center', paddingVertical:spacing.sm, borderBottomWidth:1, borderBottomColor:colors.border },
  settingLabel:     { fontSize:13, fontWeight:'600', color:colors.textPrimary },
  settingUnit:      { fontSize:11, color:colors.textMuted },
  settingInput:     { backgroundColor:colors.bgCardHover, borderWidth:1, borderColor:colors.border, borderRadius:radius.sm, paddingHorizontal:spacing.md, paddingVertical:spacing.sm, color:colors.textPrimary, fontSize:13, width:90, textAlign:'right' },
});
