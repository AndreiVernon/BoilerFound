import { router } from 'expo-router';
import Head from 'expo-router/head';
import { Text, View } from 'react-native';
import { Body, Button, Heading, Screen, styles } from '../components/ui';
import { colors, fonts } from '../theme';

export default function HomeScreen() {
  return <Screen>
    <Head><title>BoilerFound | Home</title><meta name="description" content="Help reunite Boilermakers with their lost belongings. Report a found item on Purdue's campus." /></Head>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.muted, padding: 12, borderRadius: 14 }}>
      <View style={{ backgroundColor: colors.gold, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.heading, fontSize: 17 }}>BF</Text></View>
      <View><Text style={{ fontFamily: fonts.semibold, fontSize: 15 }}>BoilerFound</Text><Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.secondary }}>For the Purdue community</Text></View>
    </View>
    <Heading>What happened?</Heading>
    <Body>Pick one and we’ll walk you through it.</Body>
    <View style={styles.spacer} />
    <Button title="I lost something" caption="Coming soon" disabled onPress={() => {}} />
    <Button title="I found something" caption="Takes about a minute." onPress={() => router.push('/found')} />
  </Screen>;
}
