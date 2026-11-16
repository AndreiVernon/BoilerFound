import { useState } from 'react';
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { Linking, Pressable, Text, View } from 'react-native';
import { BackButton, Body, Button, Heading, Screen, styles } from '../../components/ui';
import { colors, fonts } from '../../theme';

export default function ItemTypeScreen() {
  const [sensitive, setSensitive] = useState(false);
  return <Screen>
    <Head><title>What did you find? | BoilerFound</title></Head>
    <BackButton to="/" />
    <Heading>What did you find?</Heading>
    <Body>Wallets, IDs and payment cards are handled by Purdue Police, so we don’t list them.</Body>
    {sensitive && <View style={styles.card} testID="police-guidance">
      <Text role="heading" aria-level={2} style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.black }}>Take it to Purdue Police</Text>
      <Body>Hand the item to Purdue Police, or ask a building front desk to pass it on. Don’t upload a photo of it.</Body>
      <Pressable role="link" accessibilityLabel="Purdue Police contact information" onPress={() => Linking.openURL('https://www.purdue.edu/ehps/police/contact/index.php')} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.semibold, textDecorationLine: 'underline', color: colors.black }}>Purdue Police contact information ↗</Text>
      </Pressable>
      <Button title="Back to home" onPress={() => router.replace('/')} />
    </View>}
    <View style={styles.spacer} />
    <Button title="Wallet, ID or payment card" secondary onPress={() => setSensitive(true)} />
    <Button title="Something else" onPress={() => router.push('/found/report')} />
  </Screen>;
}
