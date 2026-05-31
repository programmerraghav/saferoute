/**
 * mobile-app/src/screens/LoginScreen.js
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { login, register } from '../services/auth';
import { colors, spacing, radius } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const [tab, setTab]           = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit() {
    if (!email || !password) { Alert.alert('Missing fields', 'Email and password required.'); return; }
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        if (!name) { Alert.alert('Missing fields', 'Name is required for registration.'); return; }
        await register(name.trim(), email.trim(), password, phone.trim());
      }
      navigation.navigate('Main');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>🚦 Safe<Text style={{ color: colors.amber }}>Route</Text></Text>
          <Text style={styles.heroSub}>Sign in to continue</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          {['login','register'].map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          {tab === 'register' && (
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={colors.textFaint}
              value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textFaint}
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textFaint}
            value={password} onChangeText={setPassword} secureTextEntry />
          {tab === 'register' && (
            <TextInput style={styles.input} placeholder="Phone (optional)" placeholderTextColor={colors.textFaint}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          )}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#0a0e1a" />
              : <Text style={styles.submitBtnText}>{tab === 'login' ? 'Sign In →' : 'Create Account →'}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Continue as guest for SOS without login */}
        <TouchableOpacity onPress={() => navigation.navigate('SOS')} style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Text style={{ color: colors.red, fontWeight: '700', fontSize: 14 }}>
            🚨 Emergency? Use SOS without login
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:            { flex:1, backgroundColor:colors.bgPrimary },
  scroll:          { padding:spacing.xl, paddingTop:spacing['4xl'] },
  hero:            { alignItems:'center', marginBottom:spacing['2xl'] },
  heroTitle:       { fontSize:36, fontWeight:'800', color:colors.textPrimary, letterSpacing:-1 },
  heroSub:         { fontSize:14, color:colors.textMuted, marginTop:6 },
  tabRow:          { flexDirection:'row', backgroundColor:colors.bgCard, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, marginBottom:spacing.xl, overflow:'hidden' },
  tab:             { flex:1, padding:spacing.md, alignItems:'center' },
  tabActive:       { backgroundColor:colors.amber },
  tabText:         { fontWeight:'600', color:colors.textMuted, fontSize:14 },
  tabTextActive:   { color:'#0a0e1a' },
  form:            { gap:spacing.md },
  input:           { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border, borderRadius:radius.md, padding:spacing.md, color:colors.textPrimary, fontSize:15 },
  submitBtn:       { backgroundColor:colors.amber, padding:spacing.md, borderRadius:radius.full, alignItems:'center', marginTop:spacing.md },
  submitBtnText:   { color:'#0a0e1a', fontWeight:'800', fontSize:16 },
});
