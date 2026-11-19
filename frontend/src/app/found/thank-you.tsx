import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Text, View } from 'react-native';
import { Body, Button, Heading, Icon, Note, Screen, styles } from '../../components/ui';
import type { FoundReport } from '../../features/found/model';
import { reportRepository } from '../../features/found/reportRepository';
import { colors, fonts } from '../../theme';

export default function ThankYouScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ id: string; attempt: number; report: FoundReport | null; error?: string } | null>(null);
  const report = result && result.id === id ? result.report : null;
  const loading = !!id && (result?.id !== id || result?.attempt !== attempt);
  const error = result?.id === id ? result?.error : undefined;
  useEffect(() => {
    let active = true;
    if (!id) return;
    reportRepository.get(id)
      .then(value => { if (active) setResult({ id, attempt, report: value }); })
      .catch(failure => {
        if (active) setResult({ id, attempt, report: null, error: failure instanceof Error ? failure.message : 'Please try again.' });
      });
    return () => { active = false; };
  }, [id, attempt]);
  return <Screen>
    <Head><title>{report ? 'Thank you!' : 'Report confirmation'} | BoilerFound</title></Head>
    <View style={styles.spacer} />
    {loading ? <Body centered>Loading your report…</Body> : error ? <>
      <Heading>Could not load your report</Heading>
      <Body>{error}</Body>
      <Button title="Try again" onPress={() => setAttempt(current => current + 1)} />
    </> : report ? <>
      <View style={styles.badge}><Icon name="check" /></View>
      <View style={{ alignItems: 'center' }}><Heading>Thank you!</Heading></View>
      <Body centered>Your report has been saved. Thank you for helping a fellow Boilermaker.</Body>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Icon name="pin" /><View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.secondary }}>{report.dropOff ? 'LEAVE IT AT' : 'FOUND AT'}</Text>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.black }} testID="confirmed-location">{report.dropOff || report.location}</Text>
        </View></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Note>Status</Note><Text style={{ fontFamily: fonts.semibold, fontSize: 11, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>Available</Text></View>
      </View>
      {!report.dropOff && <Body>Please hand the item to a staffed lost-and-found desk in the building where you found it.</Body>}
    </> : <><Heading>No saved report found</Heading><Body>Start from home to report a found item.</Body></>}
    <View style={styles.spacer} />
    <Button title="Back to home" onPress={() => router.replace('/')} />
  </Screen>;
}
