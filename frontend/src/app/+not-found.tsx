import { router } from 'expo-router';
import { Body, Button, Heading, Screen } from '../components/ui';
export default function NotFoundScreen() {
  return <Screen><Heading>Page not found</Heading><Body>Let’s get you back to BoilerFound.</Body><Button title="Back to home" onPress={() => router.replace('/')} /></Screen>;
}
